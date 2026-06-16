// Cloudflare Worker — rate-limited proxy between frontend and FastAPI backend.
// Secrets (BACKEND_URL) are set via `wrangler secret put` — never committed.
// KV namespace WHOISTRS_KV must be bound in wrangler.toml before deploying.

const RATE_LIMIT_REQUESTS = 15;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return corsResponse(JSON.stringify({ status: "ok" }), 200);
    }

    if (request.method === "POST" && url.pathname === "/query") {
      return handleQuery(request, env);
    }

    return corsResponse(JSON.stringify({ error: "Not found" }), 404);
  },

  // Keep-warm cron: pings backend /health every 10 min to prevent Railway cold starts.
  async scheduled(_event, env, _ctx) {
    try {
      await fetch(`${env.BACKEND_URL}/health`);
    } catch {
      // Nothing useful to do if the backend is down during a cron ping.
    }
  },
};

async function handleQuery(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

  const allowed = await checkRateLimit(env.WHOISTRS_KV, `rl:${ip}`);
  if (!allowed) {
    return corsResponse(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      429
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return corsResponse(JSON.stringify({ error: "Invalid JSON body." }), 400);
  }

  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 500) {
    return corsResponse(
      JSON.stringify({ error: "question must be 1–500 characters." }),
      400
    );
  }

  let backendRes;
  try {
    backendRes = await fetch(`${env.BACKEND_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch {
    return corsResponse(
      JSON.stringify({ error: "Backend unreachable. Please try again." }),
      502
    );
  }

  const data = await backendRes.json();
  return corsResponse(JSON.stringify(data), backendRes.status);
}

async function checkRateLimit(kv, key) {
  const raw = await kv.get(key);
  const now = Math.floor(Date.now() / 1000);

  let record = raw ? JSON.parse(raw) : null;

  if (!record || now >= record.resetAt) {
    record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS };
    await kv.put(key, JSON.stringify(record), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS });
    return true;
  }

  if (record.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }

  record.count += 1;
  const ttl = record.resetAt - now;
  await kv.put(key, JSON.stringify(record), { expirationTtl: ttl });
  return true;
}

function corsResponse(body, status) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return new Response(body, { status, headers });
}
