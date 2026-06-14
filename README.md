# whoistrs

A public-facing, recruiter-friendly conversational CV — powered by RAG.

Recruiters ask questions. The system retrieves relevant chunks from Tania's documents, builds a prompt, and returns grounded, cited answers via Claude. If the answer isn't in the documents, it says so.

## Stack

| Layer | Technology |
|---|---|
| RAG backend | FastAPI + Python |
| Vector store | Chroma |
| Embedding | sentence-transformers/all-MiniLM-L6-v2 |
| LLM | Claude API |
| API proxy | Cloudflare Worker |
| Frontend | React + TypeScript |
| Deployment | Netlify (frontend) + Railway (backend) |

## Local development

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your ANTHROPIC_API_KEY
python ingest.py      # build the vector store
uvicorn main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env  # fill in VITE_WORKER_URL
npm run dev
```

## Build order

See `.planning/PLANNING.md` for the full implementation plan and phase sequence.

---

*Code it. Wire it. Evolve it.*
