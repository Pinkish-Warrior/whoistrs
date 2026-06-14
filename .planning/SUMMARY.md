# whoistrs

> A public-facing, recruiter-friendly conversational CV — powered by RAG.

---

## What it is

`whoistrs` is a personal profile chatbot that lets recruiters have a natural conversation with Tania's professional background. Instead of reading a static PDF, they ask questions and receive grounded, cited answers drawn from her actual documents — projects, career narrative, skills, and experience.

It is not a no-code portfolio builder. Every architectural decision is deliberate and explainable, because the system itself is part of the portfolio.

---

## Who it is for

**Primary audience:** recruiters and hiring managers evaluating Tania for software development, technical product, or cybersecurity-adjacent roles.

**Secondary audience:** technical interviewers who will read the codebase and ask about the decisions made.

---

## The problem it solves

A CV is a flat document. It cannot answer follow-up questions, cannot prioritise what matters to a specific recruiter, and cannot surface the reasoning behind a career. `whoistrs` replaces the static CV with a conversation — one that is always available, always consistent, and always grounded in real documents.

---

## How it works

A recruiter types a question. The system embeds the query, searches a vector store for the most semantically relevant chunks from Tania's documents, builds a prompt from those chunks, and asks Claude to generate a grounded, cited answer. If the answer is not in the documents, the system says so.

This is a proper RAG pipeline:

1. **Retrieve** — semantic search against Chroma vector store
2. **Augment** — build prompt from retrieved chunks only
3. **Generate** — Claude API produces a cited, grounded response

---

## Knowledge base (v1)

All documents are curated, polished, and in Markdown format. Raw notes and drafts are excluded.

| Document | What it unlocks |
|---|---|
| CVs (Guardian, Konrad, Deloitte variants) | Skills, roles, timeline, technologies |
| Project READMEs (GitHandshake, Rust game server, Passive OSINT CLI, Interview Coach) | Architecture decisions, technical depth, stack choices |
| Career narrative | The event management background, the transition into tech, how pressure and operational leadership translate |

---

## Persona

The chatbot speaks in **third person** for facts and attributed quotes. Tania's voice appears in **first person only for direct quotations** pulled from her documents.

Example:

> Tania built GitHandshake as a full-stack open-source contribution discovery platform, deployed on Render with retry logic to handle free-tier cold starts. She describes the key engineering challenge as: *"the backoff had to be invisible to the user — a slow app is a broken app."*

---

## Stack

| Layer | Technology | Reason |
|---|---|---|
| RAG backend | FastAPI + Python | Native AI ecosystem, existing familiarity |
| Vector store | Chroma | Zero-config local dev, sufficient for personal KB size |
| Embedding | `sentence-transformers` | Local, free, no external embedding API dependency |
| LLM | Claude API (claude-sonnet) | Quality, citation-friendly output |
| API proxy | Cloudflare Worker | Key protection + rate limiting, existing pattern from Interview Coach |
| Frontend | React + TypeScript | Existing stack, fast to build |
| Deployment | Netlify (frontend) + Railway (backend) | Netlify for static, Railway for persistent FastAPI service |

---

## What is out of scope (v1)

- User authentication or login
- Admin CMS for updating documents
- Conversation logging or analytics
- Local LLM inference
- TryHackMe writeups and ray tracer write-up (v2, once polished)

---

## Success criteria

- A recruiter can ask any reasonable question about Tania's background and receive a grounded, cited answer in under 3 seconds
- Every answer cites its source document — if the document does not say it, the system says so
- A technical interviewer reading the repository can follow every architectural decision without asking
- The system never invents a skill, project, or experience Tania does not have

---

## Tagline

*Code it. Wire it. Evolve it.*
