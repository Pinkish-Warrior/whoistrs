/**
 * Rate limiting verification test.
 *
 * Exercises the checkRateLimit logic from index.js using an in-memory KV mock.
 * Run with: node test_rate_limit.mjs
 */

const RATE_LIMIT_REQUESTS = 15;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

// ── In-memory KV mock (same interface as Cloudflare KV) ─────────────────────

class MockKV {
  constructor() { this._store = new Map(); }
  async get(key) { return this._store.get(key) ?? null; }
  async put(key, value, _opts) { this._store.set(key, value); }
}

// ── checkRateLimit — exact copy of worker/index.js logic ────────────────────

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

// ── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

async function testFirst15Allowed() {
  const kv = new MockKV();
  const results = [];
  for (let i = 0; i < 15; i++) {
    results.push(await checkRateLimit(kv, "rl:1.2.3.4"));
  }
  assert(results.every(r => r === true), "requests 1–15 all allowed");
}

async function test16thBlocked() {
  const kv = new MockKV();
  for (let i = 0; i < 15; i++) {
    await checkRateLimit(kv, "rl:1.2.3.4");
  }
  const result = await checkRateLimit(kv, "rl:1.2.3.4");
  assert(result === false, "request 16 returns false (429)");
}

async function testDifferentIPsAreIndependent() {
  const kv = new MockKV();
  for (let i = 0; i < 15; i++) {
    await checkRateLimit(kv, "rl:1.2.3.4");
  }
  // 16th for the first IP — should be blocked
  const blocked = await checkRateLimit(kv, "rl:1.2.3.4");
  // First request from a different IP — should be allowed
  const allowed  = await checkRateLimit(kv, "rl:9.9.9.9");
  assert(blocked === false, "first IP blocked after 15 requests");
  assert(allowed === true,  "different IP still allowed");
}

async function testWindowResetAllowsNewRequests() {
  const kv = new MockKV();
  // Exhaust the limit
  for (let i = 0; i < 15; i++) {
    await checkRateLimit(kv, "rl:1.2.3.4");
  }
  // Manually expire the window by back-dating the stored record
  const raw = await kv.get("rl:1.2.3.4");
  const record = JSON.parse(raw);
  record.resetAt = Math.floor(Date.now() / 1000) - 1; // one second in the past
  await kv.put("rl:1.2.3.4", JSON.stringify(record));

  const result = await checkRateLimit(kv, "rl:1.2.3.4");
  assert(result === true, "requests allowed again after window resets");
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log("\nRate limiting tests\n");

console.log("requests 1–15 allowed:");
await testFirst15Allowed();

console.log("16th request blocked:");
await test16thBlocked();

console.log("per-IP isolation:");
await testDifferentIPsAreIndependent();

console.log("window reset:");
await testWindowResetAllowsNewRequests();

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
