# readme-githandshake

## What It Is

GitHandshake is a full-stack open source onboarding platform that guides beginner developers from zero to their first pull request. Tania built it to solve a real fragmentation problem: the resources for making a first open source contribution exist, but they are scattered, inconsistent, and often assume context that beginners do not have.

The platform provides three things in one place: structured learning modules that walk through Git workflows and project anatomy, a First Contribution Finder that aggregates beginner-friendly issues from GitHub filtered by programming language, and a practice sandbox connected to a dummy repository where users can submit low-stakes PRs and receive automated feedback before touching a real project.

GitHub login is mandatory — not as a friction point, but because progress tracking and issue discovery both require an authenticated GitHub identity. The auth choice was made with security as the primary constraint.

## Architecture

Tania structured GitHandshake as a Turborepo monorepo with pnpm workspaces, containing two deployable applications: a Next.js 14 client and a NestJS 11 server, both written in TypeScript. The database is Neon PostgreSQL 16, a serverless managed Postgres that handles connection pooling natively. Both applications are deployed on Render.

The client communicates with the server exclusively through API proxy rewrites, which means the browser never talks directly to the backend — all requests are routed through Next.js API routes. This pattern simplifies CORS handling and keeps session cookies forwarded correctly without client-side credential exposure.

The server uses TypeORM for database access and Octokit REST for GitHub API integration. GitHub issues tagged as good first issue, beginner, or documentation are pre-seeded into the database via a seed script rather than fetched live on every request. This eliminates GitHub API rate limit pressure at runtime and keeps dashboard load times consistent regardless of GitHub API availability.

## Key Technical Decisions

Tania chose NestJS over plain Express for the backend because the project required structured, opinionated architecture from the start — modules, dependency injection, and decorators that make the codebase navigable for a collaborating team, not just the original author. For a platform teaching contribution best practices, the codebase itself needed to model them.

Turborepo was chosen to manage the monorepo because it provides build caching and task orchestration across workspaces. A single pnpm install at the root handles both applications, and turbo.json coordinates build order so the server is always compiled before the client attempts to reference shared types.

Neon was chosen over a self-managed Postgres instance because it is serverless with connection pooling built in, requires SSL by default, and autoscales compute — removing infrastructure overhead that would distract from the application layer.

## Security and Reliability Decisions

The authentication architecture uses a GitHub OAuth App with Passport.js, which means GitHub handles the credential flow and GitHandshake never handles raw passwords. Session cookies are configured with httpOnly and secure flags in production, and sameSite is set to lax to prevent CSRF while allowing OAuth redirects. The session secret is set as an environment variable, not hard-coded, and the deployment documentation explicitly specifies generating a strong random string rather than reusing the development value.

The server uses Helmet for security headers and enforces CORS restricted to the CLIENT_URL environment variable — no wildcard origins. All required environment variables are loaded at startup, which causes the application to fail fast on missing configuration rather than silently misbehaving at runtime.

A post-build evaluation identified that TypeORM's synchronize flag was left as true in the initial codebase — a known production risk where auto-schema-sync can cause data loss on startup if entity definitions change. This was flagged as the highest-priority code quality fix: disabling synchronize and replacing it with explicit TypeORM migrations, so schema changes become deliberate acts rather than side effects of a server restart.

Render's free tier spins services down after 15 minutes of inactivity, causing the first request after a dormant period to take approximately 30 seconds. Tania documented this behaviour explicitly and wired a health check endpoint at /api/health so Render can monitor service availability and the keep-warm strategy can target a known stable route.

## Summary

GitHandshake is a full-stack TypeScript platform built as a Turborepo monorepo with a Next.js 14 frontend and NestJS 11 backend, backed by Neon PostgreSQL and deployed on Render. Tania built it to solve beginner open source onboarding by combining structured learning modules, a GitHub issue aggregator, and a practice sandbox. Key decisions include GitHub OAuth App authentication via Passport.js, pre-seeded issues to avoid runtime API rate limits, API proxy routing to eliminate direct browser-to-server exposure, Helmet and environment-scoped CORS for security headers, and httpOnly session cookies. A post-build evaluation also identified that TypeORM's synchronize flag needed to be disabled in production and replaced with explicit migrations — a finding Tania documented and flagged as the highest-priority production safety fix. The project is available on GitHub at github.com/Pinkish-Warrior/GitHandshake.
