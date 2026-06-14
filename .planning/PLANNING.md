# whoistrs — Implementation Plan

## Context

`whoistrs` is a RAG-powered conversational CV chatbot. Recruiters ask questions; the system retrieves relevant chunks from Tania's Markdown documents, augments a Claude prompt with them, and returns grounded, cited answers. The system itself is portfolio work — the architecture is part of the story.

The project directory (`~/MATRIX/active/whoistrs/`) currently contains only `SUMMARY.md` and `SCAFFOLDING.md`. Everything needs to be built from scratch.

### Who Tania is (informs every knowledge base document)

Tania is a fullstack developer who owns the complete product lifecycle — design, build, ship, maintain. Her differentiator is the combination of:

- **Security by default** — not bolted on; present in every architectural decision
- **Reliability in production** — cold starts, retry logic, backoff, keep-warm strategies
- **Architectural overview** — she sees systems holistically, not just her slice
- **Operational background** — event management and project management gave her pressure, delivery discipline, and stakeholder communication before she wrote a line of code
- **Inventive technical choices** — every stack decision has a reason she can articulate

This framing must be consistent across all knowledge base documents. The chatbot should be able to answer: "Can Tania own a project end to end?" with a confident, evidenced yes.

---

## Build Phases

### Phase 0 — Repo skeleton

Create the directory structure and boilerplate files before any logic:

```
whoistrs/
├── .gitignore
├── README.md
├── backend/
│   ├── knowledge_base/     # empty, populated in Phase 1
│   ├── config.py
│   ├── requirements.txt
│   ├── Procfile
│   └── .env.example
├── worker/
│   ├── index.js
│   └── wrangler.toml
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── netlify.toml
    ├── .env.example
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        └── lib/
```

**Security gate:**
- `.gitignore` committed first — includes `.env`, `*.env`, `backend/chroma_db/`, `.venv/`, `node_modules/`, `dist/`
- `backend/.env.example` documents required vars without values; `backend/.env` is never committed

---

### Phase 1 — Knowledge base

**One `cv.md`, not three.** The three CV variants (Guardian, Konrad, Deloitte) describe the same person — splitting them creates duplicate chunks in Chroma and dilutes retrieval. Consolidate into a single builder's CV: technologies in context, not as a list, with the reasoning behind stack choices visible.

Documents in `backend/knowledge_base/`:

| File | What it must convey |
|---|---|
| `cv.md` | Builder's CV — full lifecycle ownership, stack choices with rationale, security and reliability as recurring themes |
| `readme-githandshake.md` | Full-stack open source platform — architecture decisions, Render cold start handling, retry/backoff strategy |
| `readme-rust-game-server.md` | Systems-level thinking, performance, reliability under load |
| `readme-passive-osint.md` | Security mindset applied to tooling — what it does, why it's designed that way |
| `readme-interview-coach.md` | Cloudflare Worker pattern, API key protection, product thinking |
| `career-narrative.md` | The bridge: operational/PM background → architectural thinking in tech. How running high-pressure events translates to owning a production system. |

**Formatting rules:**
- `##` headings — chunker splits on these
- 150–400 words per section
- Write "Tania built X" not "built X" — persona baked into docs
- No tables — convert to prose/bullets
- End each document with a `## Summary` section
- In README docs: include an explicit `## Security & Reliability Decisions` section — this is where the architectural thinking lives

---

### Phase 2 — Backend: ingest pipeline (`backend/ingest.py`)

One-off script, run locally whenever the knowledge base changes.

**What it does:**
1. Reads all `.md` files from `knowledge_base/`
2. Splits into chunks (by heading + 400-token max, 50-token overlap)
3. Embeds each chunk with `sentence-transformers/all-MiniLM-L6-v2`
4. Stores embeddings + metadata in Chroma at `chroma_db/`

**Metadata per chunk:** `source` (filename), `section` (heading), `doc_type` (cv / readme / narrative)

**Security controls:**
```python
import os, re

KB_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "knowledge_base"))

def safe_kb_path(filename: str) -> str:
    if not re.match(r'^[\w\-]+\.md$', filename):
        raise ValueError(f"Invalid knowledge base filename: {filename!r}")
    resolved = os.path.realpath(os.path.join(KB_ROOT, filename))
    if not resolved.startswith(KB_ROOT + os.sep):
        raise ValueError("Path traversal detected")
    return resolved
```
- `KB_ROOT` is a hard-coded constant derived from `__file__`, never from user input
- All filenames validated against allowlist regex before `realpath`
- No `shell=True` anywhere in the script

---

### Phase 3 — Backend: RAG pipeline (`backend/rag.py`)

Core logic, runs on every query.

**Pipeline:**
1. Embed the query using the same model as ingest
2. Query Chroma for top `k=5` chunks
3. Filter chunks below similarity threshold `0.72`
4. Build prompt from retrieved chunks
5. Call Claude API (`claude-sonnet-4-6`) with system prompt
6. Return `answer` + `sources` list

**System prompt** (baked in, not user-configurable):
```
You are a professional profile assistant for Tania, a London-based fullstack
developer. You answer questions about her background, skills, projects, and
experience using only the provided document excerpts.

Tania owns the full product lifecycle — design, build, ship, maintain. She
brings a security-by-default mindset, architectural thinking, and an
operational background that most developers do not have.

Rules:
- Speak in third person: "Tania built..." not "I built..."
- Only use information present in the provided excerpts
- Cite your source at the end of each factual claim using [source: filename]
- If the excerpts do not contain enough information to answer, say:
  "That detail isn't in my current knowledge base — Tania can answer directly."
- Never invent skills, projects, or experiences
- Keep answers concise: 3–5 sentences unless a longer answer is clearly needed
```

---

### Phase 4 — Backend: FastAPI app (`backend/main.py`)

Two endpoints:

```
POST /query
Body:  { "question": string }
Response: { "answer": string, "sources": string[] }

GET /health
Response: { "status": "ok" }
```

**Security controls at the API boundary:**
```python
from pydantic import BaseModel, Field

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500, strip_whitespace=True)
```
- Pydantic enforces type, min/max length at the route handler — not deep in `rag.py`
- Max 500 chars prevents prompt-stuffing and runaway token costs
- CORS: allow only Cloudflare Worker domain + `localhost:5173`
- `ANTHROPIC_API_KEY` loaded from env — never hardcoded

---

### Phase 5 — Cloudflare Worker (`worker/index.js`)

Sits between the frontend and FastAPI. The API key never reaches the browser.

**What it does:**
1. Receives query from frontend
2. Enforces rate limiting: 15 requests per IP per hour via Cloudflare KV
3. Injects `ANTHROPIC_API_KEY` header when forwarding to FastAPI
4. Returns FastAPI response to frontend

**Rate limit response:**
```json
{ "error": "Too many requests. Please try again later." }
```

**Keep-warm cron** in `wrangler.toml`:
```toml
[triggers]
crons = ["*/10 * * * *"]
```
Pings `BACKEND_URL/health` every 10 minutes to prevent Railway cold starts.

**Security controls:**
- API key stored in Cloudflare Worker env vars (dashboard only), never in `wrangler.toml` or committed files
- `BACKEND_URL` is a hard-coded env var, not derived from request input

---

### Phase 6 — Frontend (`frontend/src/`)

Single-page React + TypeScript app. No routing.

**Components:**
- `ChatWindow.tsx` — message thread
- `InputBar.tsx` — query input with send button
- `Message.tsx` — single message + teal source pills
- `SuggestedQuestions.tsx` — hardcoded chips shown before first query:
  - "What projects has she shipped?"
  - "How does she approach security?"
  - "Can she own a project end to end?"
  - "What stack does she work in?"
  - "What did she do before tech?"

**`lib/api.ts`** calls the Cloudflare Worker URL from `VITE_WORKER_URL` env var.

**Security controls:**
- `VITE_WORKER_URL` is the only env var — no API key ever in the frontend
- No `dangerouslySetInnerHTML` — answers rendered as plain text
- `package-lock.json` committed

---

## Environment Variables

### `backend/.env` (gitignored)
```
ANTHROPIC_API_KEY=sk-...
CHROMA_PATH=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
TOP_K=5
SIMILARITY_THRESHOLD=0.72
```

### Cloudflare Worker (dashboard only, never in files)
```
ANTHROPIC_API_KEY=sk-...
BACKEND_URL=https://whoistrs-backend.railway.app
RATE_LIMIT_REQUESTS=15
RATE_LIMIT_WINDOW_SECONDS=3600
```

### `frontend/.env` (gitignored)
```
VITE_WORKER_URL=https://whoistrs.your-subdomain.workers.dev
```

---

## Security Checklist (ref: ~/MATRIX/SECURITY.md)

| Control | Where applied |
|---|---|
| Path traversal: `realpath` + prefix check | `ingest.py` `safe_kb_path()` |
| Path traversal: allowlist regex for filenames | `ingest.py` `safe_kb_path()` |
| Input validation: type + length + format | `main.py` Pydantic `QueryRequest` |
| Command injection: no `shell=True` | All Python files |
| Secrets: never in source | `.env` gitignored; Cloudflare dashboard for Worker vars |
| Secrets: `.env` in `.gitignore` before first commit | Phase 0 |
| Dependencies: pinned lock files | `requirements.txt` (pinned), `package-lock.json` |
| Dependency audit | `pip audit` + `npm audit` before deploy |

---

## Deployment Order

1. Write and run `ingest.py` locally — verify Chroma DB populates correctly
2. Start FastAPI locally — test `/query` and `/health` endpoints
3. Deploy FastAPI to Railway — get public URL
4. Set `BACKEND_URL` + `ANTHROPIC_API_KEY` in Cloudflare Worker env → deploy Worker
5. Set `VITE_WORKER_URL` in Netlify env → deploy frontend

---

## Verification

- **RAG quality:** Ask the 5 suggested questions — verify answers are cited and grounded
- **Ownership check:** Ask "Can Tania own a project end to end?" — answer must cite specific evidence
- **Hallucination check:** Ask about a skill Tania doesn't have — must reply with the "not in knowledge base" message
- **Rate limiting:** Send 16 requests from same IP — 16th must return HTTP 429
- **Secrets check:** `grep -r "sk-" .` on repo root must return nothing
- **Path traversal:** Unit test `safe_kb_path()` with `../../etc/passwd` — must raise `ValueError`
- **Input validation:** POST `{"question": ""}` and a 501-char string — both must return 422
