// Cloudflare Worker — API proxy + rate limiter
// Full implementation: Phase 5

export default {
  async fetch(request, env) {
    return new Response(JSON.stringify({ error: "not implemented" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  },

  // Keep-warm cron: pings backend /health every 10 minutes
  async scheduled(event, env, ctx) {
    await fetch(`${env.BACKEND_URL}/health`);
  },
};
