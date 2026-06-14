# readme-lychee-app

## What It Is

Tania built Lychee as an AI-powered note-taking application that automatically classifies notes into four categories — People, Projects, Ideas, and Admin — using Claude to assign a category and a confidence score to each note on creation. The central product insight behind the design is that AI classification is useful but not infallible. Rather than silently accepting every classification, Lychee surfaces low-confidence results in a dedicated review queue where users can inspect the AI's reasoning and correct its decision before the note is filed.

This confidence-threshold pattern is a deliberate UX decision. Most AI-integrated tools hide model uncertainty from the user, which erodes trust when the model is wrong. Lychee makes uncertainty visible and actionable, which means the system improves data quality over time instead of accumulating misfiled notes. The review queue is not a fallback for failure; it is a designed feature.

## Architecture

Lychee is a full-stack TypeScript application built as a monorepo with pnpm workspaces. The frontend is React with Vite, Tailwind CSS, and shadcn/ui components. The backend is Node.js with Express. The API layer is tRPC, which provides end-to-end type safety between frontend and backend without code generation or an OpenAPI schema to maintain. The database layer uses Drizzle ORM against a MySQL-compatible database. Authentication is handled by Manus OAuth with JWT-secured sessions.

Both frontend and backend run from a single `pnpm dev` command with hot reloading on both sides. The three database tables are users, notes, and feedbackLogs. The feedbackLogs table records every manual correction the user makes in the review queue, which creates a dataset of model errors that could inform future prompt tuning.

## Key Technical Decisions

Tania chose tRPC over REST for the API layer because the API contract is TypeScript itself — calling a backend procedure from the frontend is type-checked at compile time. There is no client code to generate, no schema to keep in sync, and no runtime mismatch between what the backend returns and what the frontend expects. For a two-layer TypeScript application, tRPC removes an entire category of integration bugs.

Drizzle was chosen over Prisma because it sits closer to SQL, generates fully typed queries from the schema definition, and is lighter in both bundle size and magic. Schema changes go through an explicit `db:push` step rather than auto-syncing, which means changes to the database schema are a deliberate act rather than a side effect of running the server.

shadcn/ui components are copied into the project rather than installed as a package dependency. This means the components are fully under Tania's control — they can be modified without forking a library or waiting for upstream changes. It also means the build has no runtime dependency on a third-party design system's release cycle.

## Security and Reliability Decisions

All secrets are loaded from environment variables. The `.env.example` file documents every required variable — `JWT_SECRET`, `DATABASE_URL`, the Manus OAuth credentials — without committing values. The `JWT_SECRET` is used to sign session tokens; the setup documentation specifies generating a long random string rather than using a guessable value.

Database credentials are never in source code. The `DATABASE_URL` connection string is environment-only, loaded at runtime. Manus OAuth handles user authentication, which means Lychee never handles, stores, or compares raw passwords — the password problem is fully delegated to the OAuth provider.

tRPC's type safety extends to input validation: procedure inputs are defined with TypeScript types at the router level, so a malformed payload is rejected before it touches business logic. Drizzle's explicit `db:push` migration step prevents accidental schema changes from reaching a production database.

Backend unit tests run via Vitest using `pnpm test`. The test suite covers the classification and review queue logic independently of the database layer.

## Summary

Tania built Lychee as a full-stack AI note classifier in TypeScript, using React and Vite on the frontend, Node.js and Express on the backend, tRPC for a type-safe API layer, and Drizzle ORM against a MySQL-compatible database. The product's core decision is surfacing AI classification uncertainty in a review queue rather than silently accepting every model output — a deliberate trust-building pattern that improves data quality over time. Key technical decisions include tRPC for compile-time API contract enforcement, Drizzle for explicit type-safe migrations, and shadcn/ui components copied into the project for full ownership. Security decisions include delegating authentication to Manus OAuth, environment-only secrets, JWT-signed sessions, and tRPC-level input validation. The feedbackLogs table records every manual correction, creating a dataset of model errors for future prompt improvement.
