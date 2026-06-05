# AGENTS.md — Instructions for AI Coding Agents

These instructions apply to all AI coding agents working in this repository.

## Read first

Before making changes, read these files:

1. `docs/START_HERE.md`
2. `docs/product/vision-and-principles.md`
3. `docs/implementation/phases.md`
4. The specific document related to the task.

For database work, also read:

1. `docs/database/README.md`
2. `docs/database/schema-v1.md`
3. `docs/database/db-documentation-rules.md`
4. `docs/database/portability-and-email-migration.md`

For AI behavior work, also read:

1. `docs/ai/ai-agent-rules.md`
2. `docs/ai/prompt-contracts.md`
3. `docs/ai/output-schemas.md`
4. `docs/ai/safety-rules.md`

For testing work, also read:

1. `docs/testing/testing-strategy.md`
2. `docs/testing/qa-scenarios.md`

## Main project rule

This is not an inbox clone. This is a manager command center. Every feature should reduce manager decision time, reveal hidden blockers, or prevent missed follow-ups.

## Implementation rules

- Implement one phase at a time.
- Do not implement future phases unless explicitly asked.
- Do not refactor unrelated files.
- Do not add dependencies without explaining why.
- Do not hardcode users, domains, emails, tenant IDs, model names, or company names.
- Do not expose secrets to the frontend.
- Never expose service role keys in browser code.
- Prefer small pure functions for business logic.
- Add tests for pure logic.
- Validate all AI JSON with schemas before writing it to the database.
- All timestamps must be stored in UTC.
- User-facing times must respect the user's timezone.
- Store user-visible AI reasoning only. Do not store hidden chain-of-thought.

## Database rules

- Migrations must be in `supabase/migrations`.
- Every migration must be documented in `docs/database/data-dictionary.md`.
- Every new table must include: purpose, owner, primary key, foreign keys, RLS policy, indexes, retention notes, portability notes, and test coverage.
- All user-owned public tables must include `user_id` unless there is a documented reason not to.
- Do not use an email address as the primary identity.
- Use `profiles.id` as app user identity.
- Use `user_integrations.id` and `mailboxes.id` to isolate Microsoft mailbox data.
- If a table stores Microsoft Graph objects, include `integration_id`, `mailbox_id`, and external ID fields.
- Keep Microsoft tokens in a private schema or encrypted storage inaccessible from browser clients.
- Any schema change must update generated TypeScript database types.

## Security rules

- Draft-first, approve-before-send.
- Auto-send is forbidden until a later explicitly approved phase.
- All sensitive actions require audit logs.
- Human approval is required for sending email, saving AI-suggested memory, creating Outlook rules, deleting data, or changing integration ownership.
- Least privilege Graph scopes only.
- Never send unnecessary full mailbox data to AI.
- Do not store passwords, secrets, private medical data, or unrelated sensitive data as memory.

## Testing rules

A task is not done unless relevant tests exist and pass.

Minimum required tests by area:

- Priority scoring: unit tests.
- Follow-up detection: unit tests.
- Thread state calculation: unit tests.
- AI output validation: unit tests.
- Manual task parsing: unit tests or mock integration tests.
- Graph webhook validation: integration tests.
- Token refresh: mocked integration tests.
- Initial sync and delta sync: mocked integration tests.
- Dashboard critical flow: Playwright E2E.

## Required response format after each coding task

When finished, report:

```txt
Summary:
- ...

Files changed:
- ...

Database changes:
- Migration file:
- Tables changed:
- Data dictionary updated: yes/no
- Generated types updated: yes/no

Tests:
- Added:
- Ran:
- Result:

Security notes:
- Secrets exposed? no
- RLS changed? yes/no
- Audit logging added? yes/no

Next recommended task:
- ...
```

## Do not do

- Do not build Teams monitoring in the MVP unless explicitly requested.
- Do not build auto-send in the MVP.
- Do not build tenant-wide admin/SaaS features in the MVP.
- Do not change visual design heavily without preserving the Vesta dashboard direction.
- Do not remove safety copy.
- Do not skip docs updates.
