# Codex / Claude Task Backlog

Use these tasks one at a time. Do not paste all tasks at once.

## Task 0 — Read and Plan Only

```md
Read `AGENTS.md`, `CLAUDE.md`, and `docs/archive/START_HERE.md`.
Inspect the project structure and the current dashboard HTML.
Do not code.
Return a Phase 0 plan with files to edit, tests to add, and risks.
```

## Task 1 — Convert Dashboard HTML to Components

```md
Implement Phase 0 dashboard shell.
Convert the current HTML dashboard into reusable Next.js components.
Use placeholder data only.
Keep styling close to the existing screenshot.
Do not connect Supabase yet.
Add a `demo-data.ts` file that can be removed later.
```

## Task 2 — Create Database Foundation

```md
Implement Phase 1 database foundation.
Create Supabase migrations and update database docs.
Follow `docs/reference/database/schema-v1.md` and `docs/reference/database/db-documentation-rules.md`.
Make sure schema supports future mailbox/email migration using `mailboxes` and `account_transfer_events`.
```

## Task 3 — Add Supabase Auth Shell

```md
Implement Phase 2 auth/profile.
Protect dashboard routes.
Create profile on first login.
Make sure RLS policies allow users to see only their own data.
```

## Task 4 — Microsoft Graph OAuth

```md
Implement Phase 3 Microsoft Outlook connection.
Add connect button, OAuth start/callback, secure token storage, token refresh utility, and settings status card.
Do not sync emails yet.
```

## Task 5 — Initial Outlook Sync

```md
Implement Phase 4 initial Outlook sync.
Sync Inbox and Sent Items for the last 30 days.
Upsert mailboxes, people, email_threads, email_messages, and basic work_items.
Add mocked integration tests for Graph responses.
```

## Task 6 — Follow-up Engine

```md
Implement Phase 6 follow-up engine as pure TypeScript logic with unit tests.
Detect waiting_on_manager, waiting_on_other, inbound_after_last_outbound_count, followup_count, repeated follow-up keywords, and priority floor rules.
```

## Task 7 — AI Analysis Schema and Queue

```md
Implement Phase 7 AI analysis.
Create Zod schemas for AI output.
Add queue processor.
Store model, prompt_version, token/cost usage, user_visible_reason, and confidence.
Do not store hidden chain-of-thought.
```

## Task 8 — Manual Tasks and Reminders

```md
Implement quick add task and reminders.
Add natural language parser behind a server action or Edge Function.
Create reminder processor with tests for timezone handling.
```

## Task 9 — Draft Replies

```md
Implement draft reply generation and approval flow.
AI can draft, but sending must require explicit manager approval.
Add audit logs for generated, edited, approved, and sent statuses.
```

## Task 10 — Manager Memory and Rules

```md
Implement memory and rules UI.
Allow VIP, tone, delegate, never, and project context memories.
AI suggestions must be pending until approved.
Memory must be editable and removable.
```

## Task 11 — Decision Desk

```md
Implement AI Decision Desk MVP.
Use work_items fields first.
Add dashboard filters, KPI card, and right-panel action buttons.
Do not create a separate decisions table unless needed.
```

## Task 12 — Promise Tracker

```md
Implement Promise and Commitment Tracker MVP.
Extract commitments from email/thread context.
Create `ai_commitment` work_items first.
Add commitments table only if necessary.
Add unit tests for extraction schema validation.
```

## Task 13 — Focus Mode

```md
Implement Clear My Day / Focus Mode MVP.
Generate ordered focus queue from open work_items.
Show Now, Next, Later, Done.
No new table required for MVP unless sessions must be persisted.
```
