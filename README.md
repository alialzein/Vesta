# Vesta / AI Chief of Staff — Project Documentation Pack

This repository documentation pack is designed to be copied into the project root before implementation starts.

The goal is to keep the project clean for AI coding agents such as Codex, Claude, Cursor, or any other assistant. The files split the large technical plan into smaller documents so the agent can read only the relevant part for each task.

## What this project is

Vesta is a private AI Chief of Staff for managers. It connects to Outlook first, Teams later, then converts emails, tasks, reminders, commitments, and draft replies into one manager command center.

The first version should answer one question:

> What genuinely needs the manager's attention today?

## Recommended stack

```txt
Frontend:        Next.js on Vercel
Database:        Supabase Postgres
Auth:            Supabase Auth + Microsoft Graph OAuth
Background:      Supabase Edge Functions + Cron + Queues
Memory:          Supabase Postgres + pgvector
Email source:    Microsoft Graph Outlook
AI:              OpenAI API or compatible structured-output model provider
```

## Getting started (development)

The app is a Next.js (App Router) + TypeScript + Tailwind project. **Phase 0**
(the dashboard shell) is implemented and runs entirely on demo data — no
database, Microsoft Graph, or AI is required to run it.

Prerequisites: Node.js >= 20.

```bash
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:3000
```

Common scripts:

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm test           # unit + component tests (Vitest)
npm run test:e2e   # Playwright smoke (run `npm run test:e2e:install` once first)
npm run format     # Prettier write
```

All hardcoded demo data lives in a single clearly-named file,
[`lib/demo-data.ts`](lib/demo-data.ts). Later phases replace it with Supabase
queries that return the same shapes (defined in [`lib/types.ts`](lib/types.ts),
which mirrors `docs/database/schema-v1.md`). See
[`docs/architecture/project-structure.md`](docs/architecture/project-structure.md)
for the full folder layout.

Environment variables are documented in [`.env.example`](.env.example). Phase 0
needs none of them; they are placeholders for later phases. Never commit real
secrets — copy to `.env.local` (gitignored) for real values.

## Important files

Start here:

```txt
docs/START_HERE.md
AGENTS.md
CLAUDE.md
```

Product documents:

```txt
docs/product/top-3-dashboard-features.md
docs/product/dashboard-ux-spec.md
docs/product/feature-roadmap.md
docs/product/workflows.md
```

Implementation documents:

```txt
docs/implementation/phases.md
docs/implementation/codex-task-backlog.md
docs/implementation/prompts-to-use.md
docs/implementation/handoff-checklist.md
```

Database documents:

```txt
docs/database/README.md
docs/database/schema-v1.md
docs/database/data-dictionary.md
docs/database/db-documentation-rules.md
docs/database/portability-and-email-migration.md
```

AI behavior documents:

```txt
docs/ai/ai-agent-rules.md
docs/ai/behavior-and-memory-rules.md
docs/ai/prompt-contracts.md
docs/ai/output-schemas.md
docs/ai/safety-rules.md
```

Testing documents:

```txt
docs/testing/testing-strategy.md
docs/testing/unit-tests.md
docs/testing/integration-tests.md
docs/testing/e2e-tests.md
docs/testing/qa-scenarios.md
```

## Non-negotiable rules

1. Build phase by phase.
2. Migrations must come before code that depends on tables.
3. Every database change must update the database docs.
4. Every sensitive action must have an audit log.
5. AI must draft first; sending requires explicit user approval.
6. Use `user_id`, `integration_id`, and `mailbox_id` for ownership. Do not use email address as identity.
7. Tests are required for priority scoring, follow-up detection, AI schema validation, Graph sync logic, and critical user flows.
