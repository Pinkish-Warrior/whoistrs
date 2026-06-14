# whoistrs — Next Step

## Status (as of 2026-06-14)

| Phase | What | Status |
|---|---|---|
| 0 | Repo skeleton | Done |
| 1 | Knowledge base | Done — all 6 docs written |
| 2 | `backend/ingest.py` | Not started |
| 3 | `backend/rag.py` | Not started |
| 4 | `backend/main.py` | Not started |
| 5 | `worker/index.js` | Stub only |
| 6 | Frontend components | Stub only |

---

## Immediate next step: `backend/rag.py`

Knowledge base and ingest pipeline are complete. Next session starts here.

### Knowledge base (9 docs — all done)

- `cv.md`
- `career-narrative.md`
- `memoir.md` — full pre-tech personal narrative inc. pilot training story
- `readme-githandshake.md` — verified against real repo; auth corrected to GitHub OAuth App
- `readme-rust-game-server.md`
- `readme-passive-osint.md`
- `readme-interview-coach.md`
- `readme-mediasense-anagram.md` — verified against real repo
- `readme-lychee-app.md` — verified against real repo

### Backend pipeline — next steps

1. ~~`python backend/ingest.py`~~ — **done**
2. **Build `backend/rag.py`** — embed query, retrieve from Chroma, call Claude, return answer + sources
3. Build `backend/main.py` — FastAPI `/query` + `/health`
4. Test locally end-to-end before touching the Worker or frontend

Full details for each phase are in `PLANNING.md`.
