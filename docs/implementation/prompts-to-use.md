# Prompts to Use With Codex or Claude

## Rule

Do not ask the AI to “build everything.” Give it one phase or one task.

## Prompt 1 — Planning only

```md
Read `AGENTS.md`, `CLAUDE.md`, and `docs/START_HERE.md`.
Also read:

- `docs/product/top-3-dashboard-features.md`
- `docs/product/dashboard-ux-spec.md`
- `docs/implementation/phases.md`

Inspect the current project and dashboard HTML.
Do not write code yet.
Give me a short plan for Phase 0 only:

- Files to create/edit
- Components to extract
- Tests to add
- Risks or questions
```

## Prompt 2 — Implement dashboard shell

```md
Implement Phase 0 dashboard shell from the current HTML.

Scope:

- Convert dashboard into reusable components.
- Keep the current visual style.
- Use demo data only.
- Add placeholders for Decision Debt, People Blocked, Follow-up Risk, Promises, Drafts, and Time to Clear.
- Add a nonfunctional Focus Mode drawer or route placeholder.

Constraints:

- Do not connect Supabase.
- Do not call AI APIs.
- Do not implement Microsoft Graph.

Acceptance criteria:

- App runs locally.
- Dashboard renders close to the screenshot.
- Components are reusable.
- Demo data is isolated.
```

## Prompt 3 — Database foundation

```md
Implement Phase 1 database foundation.

Read:

- `docs/database/README.md`
- `docs/database/schema-v1.md`
- `docs/database/db-documentation-rules.md`
- `docs/database/portability-and-email-migration.md`

Scope:

- Create migrations.
- Enable RLS.
- Add indexes.
- Add private token storage.
- Add mailbox portability support.
- Update data dictionary.
- Generate DB types if the project has a command for it.

Acceptance criteria:

- Migrations run locally.
- Data dictionary updated.
- No email is used as primary identity.
- All user-owned public tables have RLS.
```

## Prompt 4 — Review after each phase

```md
Review the current diff against `AGENTS.md` and the docs for this phase.
Check:

- Are docs updated?
- Are database changes documented?
- Are tests added where needed?
- Are secrets safe?
- Is the implementation scoped to the requested phase?
  Give a pass/fail list and suggested fixes.
```

## Prompt 5 — Ask for tests only

```md
Add tests for the code implemented in the last task.
Do not add new features.
Follow `docs/testing/testing-strategy.md`.
Focus on pure logic and critical flows.
Report which test cases were added and which command to run.
```

## Prompt 6 — Database documentation update only

```md
Update the database documentation to match the current migrations.
Do not change code.
Update:

- `docs/database/data-dictionary.md`
- `docs/database/schema-v1.md` if schema changed
- `docs/database/erd.mmd` if relationships changed
- portability notes if ownership/integration/mailbox behavior changed
```
