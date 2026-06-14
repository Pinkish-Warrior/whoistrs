# readme-interview-coach

## What It Is

Tania built Interview Coach to solve a problem she experienced directly: technical interview preparation resources are either generic to the point of being useless, or expensive coaching platforms that gate the most useful feedback behind a subscription. Interview Coach is a free, web-based tool that gives developers AI-generated, role-specific interview questions and targeted feedback on their answers.

The tool supports both technical and behavioural interview modes. In technical mode, users select a role category and stack, and the tool generates questions calibrated to that combination — not a recycled list, but questions generated fresh against a role-specific prompt. In behavioural mode, users practice structured responses using the STAR framework and receive feedback on specificity, impact, and what is missing. The product thinking behind it is simple: practice with feedback is more valuable than practice alone, and most developers do not have access to a mentor who will review their interview answers on demand.

## Architecture

Interview Coach has three layers: a React frontend, a Cloudflare Worker, and the Claude API. There is no dedicated backend server. The Worker is the entire server-side — it handles request routing, API key injection, and rate limiting, then forwards the request directly to the Claude API and streams the response back to the client.

The frontend is written in React with TypeScript and deployed on Netlify. It manages session state locally — question history, selected role, mode — and communicates with the Worker via a single `POST /generate` endpoint. Responses are streamed using the Fetch API's `ReadableStream` so that feedback appears progressively rather than after a full round-trip delay, which matters for longer answers.

The Worker is deployed on Cloudflare's edge network and executes close to the user geographically, which keeps latency low for the API key injection step without requiring a dedicated server region.

## The Cloudflare Worker Pattern

The core architectural decision in Interview Coach is using a Cloudflare Worker as a thin, stateless proxy rather than exposing the Claude API key to the browser or managing a full backend service.

Without the Worker, there are only two options: embed the API key in the client bundle — where it is visible to anyone who opens DevTools — or maintain a server that holds the key and forwards requests. A managed server costs money, requires uptime monitoring, and introduces cold start latency on free-tier hosting. The Worker costs nothing within Cloudflare's free tier limits, runs globally on Cloudflare's infrastructure, and starts in under one millisecond.

The Worker's role is narrow and deliberate. It validates the request shape, checks the rate limit counter for the requesting IP against Cloudflare KV, injects the `X-API-Key` header from a Worker environment secret, and forwards the request. It does not transform the payload or implement business logic — that keeps it easy to reason about and easy to audit.

## Security and Reliability Decisions

Rate limiting is enforced at the Worker layer using Cloudflare KV as the counter store. Each IP is allowed 20 requests per hour. On the 21st request, the Worker returns HTTP 429 with a `Retry-After` header before the request ever reaches the Claude API. This prevents a single user from exhausting quota and ensures the tool remains available for others.

The Claude API key is stored as a Cloudflare Worker secret — it is set via the Cloudflare dashboard, encrypted at rest, and injected at runtime. It never appears in source code, never touches the client, and is not visible in Cloudflare's own logging. Key rotation requires a single dashboard update with no redeployment.

User-submitted answer text is passed directly to the Claude API as the content of a prompt, not interpolated into a shell command or database query — so there is no injection surface at the transport layer. Prompt injection via adversarial answer content is a known risk with LLM-integrated tools; the system prompt explicitly instructs the model to treat the user content as interview answer text only, and to ignore instructions embedded within it.

The tool is stateless by design. No answers are stored, no user identity is tracked, and there is no database. This eliminates a whole category of data handling risk: there is nothing to breach.

## Summary

Tania built Interview Coach as a stateless, three-layer application — React frontend on Netlify, Cloudflare Worker as a serverless proxy, Claude API for generation — that gives developers AI-powered interview question generation and answer feedback for free. The Cloudflare Worker pattern is the central architectural decision: it protects the API key without the cost or complexity of a managed backend, enforces rate limiting at the edge via Cloudflare KV, and adds under one millisecond of latency. Responses are streamed via `ReadableStream` so feedback renders progressively. Security decisions include API key storage as a Worker secret, rate limiting to 20 requests per IP per hour, prompt-scoped injection mitigation in the system prompt, and full statelessness — no user data is stored at any layer. The project demonstrates product thinking, end-to-end ownership, and the practical application of the Cloudflare Worker pattern as a zero-infrastructure API proxy.
