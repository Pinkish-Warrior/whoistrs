# Security Audit — whoistrs

Audit run: 2026-06-19

---

## Backend — `pip-audit -r requirements.txt`

| Package | Version | CVE | Severity | Fix available |
|---|---|---|---|---|
| chromadb | 1.5.9 | CVE-2026-45829 | Unknown | No (1.5.9 is latest) |

### chromadb — CVE-2026-45829

No patched release exists as of 2026-06-19. chromadb 1.5.9 is the latest published version.

**Actual exposure:** chromadb runs as an embedded in-process library — it is never exposed directly to the internet. All queries go through the FastAPI `/query` endpoint, which enforces Pydantic input validation (type, min/max length, whitespace trimming) before any data reaches chromadb. There is no direct network path from the public internet to chromadb.

**Action:** No upgrade path available. Monitor the chromadb changelog and re-run `pip-audit` on each dependency update.

---

## Frontend — `pnpm audit`

### Before upgrade (vite 5.4.21)

| Package | CVE / Advisory | Severity | Description |
|---|---|---|---|
| vite | GHSA-fx2h-pf6j-xcff | High | `server.fs.deny` bypass via Windows alternate paths |
| vite | GHSA-4w7w-66w2-5vf9 | Moderate | Path traversal in optimised deps `.map` handling |
| vite | GHSA-v6wh-96g9-6wx3 | Moderate | NTLMv2 hash disclosure via UNC path (Windows) |
| esbuild | GHSA-67mh-4wv8-2f99 | Moderate | Dev server accepts cross-origin requests |

**Fix:** upgraded vite `5.4.21 → 7.3.5`. Build confirmed clean (`vite build` produces 149 kB JS bundle, no errors).

### After upgrade (vite 7.3.5)

| Package | CVE / Advisory | Severity | Description |
|---|---|---|---|
| esbuild | GHSA-g7r4-m6w7-qqqr | Low | Arbitrary file read via dev server on Windows |

### Remaining item — esbuild GHSA-g7r4-m6w7-qqqr

Bundled as a transitive dependency of vite 7.3.5. Patched in esbuild >=0.28.1; vite 7.3.5 ships esbuild 0.27.7.

**Actual exposure:** nil in this deployment context:

1. **Dev server only.** The vulnerability requires an attacker to send a crafted request to the esbuild dev server. Production builds (`pnpm build`) produce static files and never start a dev server. Netlify serves the static output — esbuild is not present at runtime.
2. **Windows only.** The exploit path relies on Windows alternate data streams. The development machine is macOS; the CI/build environment is Linux.
3. **Local network only.** Even if triggered, the dev server only listens on `localhost` by default.

**Action:** No immediate action required. Upgrade to vite 8 when `@vitejs/plugin-react` adds vite 8 peer support.

---

## Security controls in place

| Control | Where |
|---|---|
| Path traversal: `realpath` + prefix check | `backend/ingest.py` `safe_kb_path()` |
| Input validation: type, length, whitespace | `backend/main.py` Pydantic `QueryRequest` |
| No shell=True anywhere | All Python files |
| Secrets via env vars only, never in source | `.env` gitignored; Worker vars in CF dashboard |
| Pinned dependencies / lockfile committed | `requirements.txt`, `pnpm-lock.yaml` |
| API key never reaches the browser | Cloudflare Worker injects it server-side |
| Rate limiting: 15 req/IP/hour | Worker KV |
| Email gate: work domains only | Worker blocklist + client-side UX check |
