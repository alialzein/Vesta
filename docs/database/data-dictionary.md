# Data Dictionary

This file must be updated every time a migration changes the database.

## Status legend

```txt
planned     = in documentation but not yet migrated
created     = table exists in migration
changed     = table changed after creation
deprecated  = no longer used, still present
removed     = removed by migration
```

## Table summary

All tables below were created in the Phase 1 migrations
(`supabase/migrations/20260606090001`–`20260606090008`).

| Table                   |  Status | Owner        | Purpose                                        | RLS                                    | Portability notes                                                 |
| ----------------------- | ------: | ------------ | ---------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| profiles                | created | user         | App user profile                               | own row via id = auth.uid()            | Email is display only, not identity                               |
| user_integrations       | created | user         | Connected provider account                     | own rows                               | Links user to Microsoft provider identity                         |
| mailboxes               | created | user         | Specific mailbox connected through integration | own rows                               | Required for reconnecting or moving emails later                  |
| private.graph_tokens    | created | service      | Encrypted Graph tokens                         | private schema, RLS on, no policies    | Tied to integration, not email                                    |
| sync_cursors            | created | system/user  | Delta sync cursor per resource                 | user selects own; service writes       | Scoped by mailbox_id                                              |
| people                  | created | user         | Known senders/contacts                         | own rows                               | Can survive mailbox change                                        |
| projects                | created | user         | Projects/clients/topics                        | own rows                               | User-owned and mailbox-independent                                |
| email_threads           | created | user/mailbox | Outlook conversations                          | own rows                               | Unique by mailbox_id + conversation ID                            |
| email_messages          | created | user/mailbox | Outlook messages                               | own rows                               | Unique by mailbox_id + Graph message ID                           |
| work_items              | created | user         | Unified actionable items                       | own rows                               | Can link to mailbox or be mailbox-independent                     |
| commitments             | created | user         | Promise tracker                                | own rows                               | Link to work item/source, survives mailbox transfer if reassigned |
| focus_sessions          | created | user         | Focus Mode sessions                            | own rows                               | User-owned                                                        |
| focus_session_items     | created | user         | Focus Mode queue items                         | own rows                               | User-owned                                                        |
| ai_analyses             | created | user         | AI analysis history                            | own rows                               | Links to work item, not email only                                |
| tasks                   | created | user         | Manual/parsed tasks                            | own rows                               | User-owned                                                        |
| reminders               | created | user         | Reminder scheduler                             | own rows                               | User-owned                                                        |
| draft_replies           | created | user         | Draft approval/send flow                       | own rows                               | Links to mailbox if source is email                               |
| manager_rules           | created | user         | Deterministic manager behavior rules           | own rows                               | User-owned, should survive mailbox change                         |
| manager_memories        | created | user         | Semantic/soft AI memory                        | own rows                               | User-owned, should survive mailbox change                         |
| feedback_events         | created | user         | Corrections and learning events                | own rows                               | User-owned                                                        |
| audit_logs              | created | user/system  | Sensitive action history                       | user selects own; service writes       | Needed for transfer audit                                         |
| notification_events     | created | user/system  | Notifications                                  | own rows                               | User-owned                                                        |
| daily_briefs            | created | user         | Morning brief history                          | own rows                               | User-owned                                                        |
| webhook_events          | created | system       | Raw webhook events                             | RLS on, no app policies (service only) | Scoped by integration/mailbox when known                          |
| account_transfer_events | created | service/user | Account/mailbox transfer audit                 | RLS on, no app policies (service only) | Mandatory for moving to another email                             |

### RLS policy summary

- **Own-rows tables** (user_integrations, mailboxes, people, projects, email_threads,
  email_messages, work_items, commitments, focus_sessions, focus_session_items,
  ai_analyses, tasks, reminders, draft_replies, manager_rules, manager_memories,
  feedback_events, notification_events, daily_briefs): four policies each —
  select/insert/update/delete `using (auth.uid() = user_id)`.
- **profiles**: keyed by `id = auth.uid()` (select/insert/update; no delete — handled by
  auth.users cascade).
- **Service-write with user read** (sync_cursors, audit_logs): RLS on; a single SELECT
  policy on `auth.uid() = user_id`; writes only via service role.
- **Service-only** (webhook_events, account_transfer_events): RLS on, no app policies.
- **private.graph_tokens**: in the `private` schema with grants revoked from
  anon/authenticated; RLS on with no policies. Browser clients cannot reach it.

### Key indexes

- `work_items`: `(user_id, status, priority_score desc, due_at asc nulls last)`,
  `(user_id, category, status)`, `(mailbox_id, source_external_id)`.
- `email_messages`: unique `(mailbox_id, graph_message_id)`; `(mailbox_id, received_at desc)`;
  `(mailbox_id, excluded_at, received_at desc)` for visible-vs-hidden triage queries.
- `email_threads`: unique `(mailbox_id, graph_conversation_id)`.

### Tests

- `supabase/tests/rls.test.ts` (run via `npm run test:db`) verifies, against the live DB:
  anon cannot read work_items/manager_memories; graph_tokens not exposed to browser;
  service role can write sync_cursors through the profiles FK chain; RLS active.

## Required per-table documentation template

When a table is migrated, add details below using this template:

```md
### table_name

Migration: `YYYYMMDDHHMMSS_create_table_name.sql`
Status: created
Owner: user/system/service
Purpose:
Primary key:
Foreign keys:
Important indexes:
RLS policies:
Write access:
Read access:
Retention:
Portability:
Tests:
Notes:
```

## Change log

| Date       | Migration                     | Summary                                                                                                                                                                          | Docs updated by    |
| ---------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| TBD        | TBD                           | Initial schema planned                                                                                                                                                           | Documentation pack |
| 2026-06-06 | 20260606090001–20260606090008 | Phase 1: created all 24 foundation tables + RLS + indexes + types                                                                                                                | Phase 1 build      |
| 2026-06-07 | 20260607090001_email_triage   | Phase 6.5: `mailboxes.triage_mode`; `email_messages.excluded_at`/`excluded_reason`/`triage` + visible index. Mute/allow rules reuse `manager_rules`; VIP reuses `people.is_vip`. | Triage build       |
