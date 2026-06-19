# whoistrs — Next Step

## Status (as of 2026-06-16)

| Phase | What | Status |
|---|---|---|
| 0 | Repo skeleton | Done |
| 1 | Knowledge base | Done — 9 docs, re-ingested with fixes |
| 2 | `backend/ingest.py` | Done |
| 3 | `backend/rag.py` | Done — tested, all 5 questions passing |
| 4 | `backend/main.py` | Done — `/query` + `/health`, validation passing |
| 5 | `worker/index.js` | Done — rate limiting, keep-warm, CORS |
| 6 | Frontend core | Done — terminal UI, typewriter, source pills |
| 7 | Email gate + transcript download | Done — email gate, session tokens, transcript download |

---

## All phases complete as of 2026-06-18

## Phase 7 — Email gate + transcript download (done)

### Feature A: Email gate

**What it does:**
- Splash screen (terminal-styled) shown before the chat
- Recruiter enters their work email
- Free domains rejected client-side (gmail, yahoo, hotmail, outlook, icloud, proton, etc.)
- On submit: Worker validates domain server-side, creates a session token, stores it in KV
- Frontend stores token in `sessionStorage`, sends it as `X-Session-Token` header on every `/query` call
- Worker rejects `/query` calls with missing/invalid tokens → returns 401

**Why Cloudflare KV (not Supabase or a database):**
- We already have KV for rate limiting — no new service needed
- Session token is a UUID stored as `session:{token}` with 24-hour TTL
- KV also records who accessed: `{email, domain, createdAt}` — gives recruiter analytics for free

**Domain blocklist (Worker, not frontend — frontend check is UX only):**
```
gmail.com, yahoo.com, hotmail.com, outlook.com, icloud.com,
me.com, aol.com, protonmail.com, proton.me, live.com,
msn.com, ymail.com, googlemail.com
```

**Flow:**
```
Recruiter opens URL
  → EmailGate screen (terminal styled)
  → enters work email → client validates domain
  → POST /auth to Worker { email }
  → Worker validates domain (server-side blocklist)
  → Worker creates UUID token, stores in KV with 24h TTL
  → returns { token }
  → frontend stores token in sessionStorage
  → chat unlocks, every /query sends X-Session-Token header
  → Worker checks token on every /query before forwarding to FastAPI
```

**Files to change:**
- `worker/index.js` — add `POST /auth` endpoint + token check on `/query`
- `worker/wrangler.toml` — no change needed (KV already bound)
- `frontend/src/components/EmailGate.tsx` — new component
- `frontend/src/lib/api.ts` — add `authenticate()` function + attach token to `queryWorker()`
- `frontend/src/App.tsx` — show EmailGate until session token exists in sessionStorage

**API cost protection:**
- Gate means only people you've shared the link with can use it (real recruiters)
- Worker still enforces 15 req/IP/hour rate limit on top of token check
- FastAPI never receives unauthenticated traffic

---

### Feature B: Download transcript

**What it does:**
- "↓ export" button appears in the terminal header after the first assistant response
- Click generates a `.txt` file and triggers a browser download — no server call
- Format:

```
whoistrs — conversation transcript
────────────────────────────────────────
Date: 2026-06-16
Recruiter: jane.doe@company.com
────────────────────────────────────────

> Can she own a project end to end?

  Yes — end-to-end ownership is central to how Tania works...
  [cv] [memoir] [career-narrative]

> What stack does she work in?

  Tania writes primarily in Python, Go, TypeScript...
  [cv]

────────────────────────────────────────
whoistrs · github.com/Pinkish-Warrior
```

**Files to change:**
- `frontend/src/lib/transcript.ts` — new: `downloadTranscript(messages, email)` function
- `frontend/src/App.tsx` — pass email down from gate; add export button to header when messages exist
- `frontend/src/index.css` — style the export button (terminal-styled, teal text)

**No backend changes needed.**

---

## Build order for next session

1. Worker: `POST /auth` endpoint + token validation on `/query`
2. `frontend/src/components/EmailGate.tsx`
3. `frontend/src/lib/api.ts` — add `authenticate()`, attach token
4. `frontend/src/lib/transcript.ts` — `downloadTranscript()`
5. `frontend/src/App.tsx` — wire gate + export button
6. `frontend/src/index.css` — gate + export button styles
7. End-to-end test locally: gate → chat → download

---

## Backend — fixes made this session (2026-06-16)

- **Model**: switched from `claude-haiku-4-5-20251001` → `claude-sonnet-4-6` in `rag.py`
- **API key**: `load_dotenv(override=True)` in `config.py` — shell env was silently overriding `.env`
- **Retrieval tuning**: `SIMILARITY_THRESHOLD` 0.72 → 0.60, `TOP_K` 5 → 15 (defaults in `config.py`, not `.env`)
- **Knowledge base**: split `## Projects` into `## 01Founders Curriculum Projects` + `## Independent Projects` in `cv.md` — fixes chunk dilution for "What projects has she shipped?"
- **52 chunks** in Chroma (was 51)

---

## Worker — before deploying

1. Create KV namespace in Cloudflare dashboard → copy ID → replace `REPLACE_WITH_KV_NAMESPACE_ID` in `wrangler.toml`
2. `wrangler secret put BACKEND_URL` → paste Railway URL
3. `wrangler deploy`

---

## Deployment order (when ready)

1. Deploy FastAPI to Railway → get public URL
2. Set `BACKEND_URL` secret in Cloudflare Worker → `wrangler deploy`
3. Set `VITE_WORKER_URL` in Netlify env → deploy frontend
