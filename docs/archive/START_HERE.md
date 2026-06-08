# Start Here — How to Begin the Project

This file tells you how to use the documentation pack and what to ask the coding AI to do first.

## 1. Copy these files into the project

Copy everything in this package into the project root.

Recommended result:

```txt
project-root/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── docs/
│   ├── START_HERE.md
│   ├── product/
│   ├── implementation/
│   ├── architecture/
│   ├── database/
│   ├── ai/
│   ├── testing/
│   ├── security/
│   └── templates/
```

## 2. Share the current HTML dashboard with the coding AI

Yes, sharing the current HTML file will help a lot.

Give the AI:

- The HTML file.
- Any CSS/Tailwind file used by it.
- Any screenshots of the current dashboard.
- This docs folder.

The AI can then convert the mockup into real Next.js components without guessing the design.

## 3. First prompt to use with Codex or Claude

Use this before asking it to code:

```md
Read `AGENTS.md`, `CLAUDE.md`, and `docs/archive/START_HERE.md`.
Then read `docs/product/top-3-dashboard-features.md`, `docs/product/dashboard-ux-spec.md`, and `docs/plans/phases.md`.

Do not write code yet.
First inspect the current project structure and the current dashboard HTML file.
Then give me a short implementation plan for Phase 0 and Phase 1 only.
Mention which files you will create or edit, which tests you will add, and which docs will be updated.
```

## 4. First coding prompt

After the AI gives a good plan, use:

```md
Implement Phase 0 only.

Scope:

- Set up the project foundation.
- Create the authenticated dashboard shell if auth already exists, or create a placeholder shell if auth is not ready.
- Convert the current HTML dashboard into clean reusable components without connecting real data yet.
- Keep visual design close to the supplied mockup.
- Add placeholder demo data in a clearly named file only.
- Add or update documentation if folder structure or setup changed.

Constraints:

- Do not implement Microsoft Graph yet.
- Do not implement AI calls yet.
- Do not create database tables yet unless the project already has Supabase initialized and you are explicitly implementing Phase 1 DB setup.
- Do not expose secrets.

Acceptance criteria:

- App runs locally.
- Dashboard shell renders.
- Components are separated.
- Placeholder data can be replaced later by Supabase queries.
```

## 5. Second coding prompt

```md
Implement Phase 1 database foundation.

Read:

- `docs/reference/database/README.md`
- `docs/reference/database/schema-v1.md`
- `docs/reference/database/db-documentation-rules.md`
- `docs/reference/database/portability-and-email-migration.md`

Scope:

- Create initial Supabase migrations for profiles, user_integrations, mailboxes, sync_cursors, people, projects, email_threads, email_messages, work_items, ai_analyses, tasks, reminders, draft_replies, manager_rules, manager_memories, feedback_events, audit_logs, notification_events, daily_briefs, webhook_events, and account_transfer_events.
- Enable RLS on all public user-owned tables.
- Keep graph_tokens in private schema or equivalent protected storage.
- Add indexes needed for dashboard queries and sync.
- Update `docs/reference/database/data-dictionary.md` with every table and important column.
- Add SQL or TypeScript tests where practical.

Acceptance criteria:

- Migrations run cleanly locally.
- RLS is enabled.
- Data dictionary is updated.
- No email address is used as the primary identity.
```

## 6. Build order

Do not start with Teams. Do not start with auto-send. Do not start with multi-user SaaS.

Build in this order:

```txt
0. Dashboard shell from the current HTML mockup
1. Database foundation
2. Auth + profile
3. Microsoft Outlook OAuth
4. Initial Inbox/Sent sync
5. Thread/follow-up engine
6. AI analysis queue
7. Work item dashboard with real data
8. Manual tasks + reminders
9. Draft replies
10. Memory and rules
11. Daily brief + polish
12. Teams and multi-user later
```
