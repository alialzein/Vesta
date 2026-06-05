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

| Table                   |           Status | Owner        | Purpose                                        | RLS                                  | Portability notes                                                 |
| ----------------------- | ---------------: | ------------ | ---------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| profiles                |          planned | user         | App user profile                               | user can access own row              | Email is display only, not identity                               |
| user_integrations       |          planned | user         | Connected provider account                     | user can view own integrations       | Links user to Microsoft provider identity                         |
| mailboxes               |          planned | user         | Specific mailbox connected through integration | user can view own mailboxes          | Required for reconnecting or moving emails later                  |
| private.graph_tokens    |          planned | service      | Encrypted Graph tokens                         | no browser access                    | Tied to integration, not email                                    |
| sync_cursors            |          planned | system/user  | Delta sync cursor per resource                 | user can view status, service writes | Scoped by mailbox_id                                              |
| people                  |          planned | user         | Known senders/contacts                         | own rows                             | Can survive mailbox change                                        |
| projects                |          planned | user         | Projects/clients/topics                        | own rows                             | User-owned and mailbox-independent                                |
| email_threads           |          planned | user/mailbox | Outlook conversations                          | own rows                             | Unique by mailbox_id + conversation ID                            |
| email_messages          |          planned | user/mailbox | Outlook messages                               | own rows                             | Unique by mailbox_id + Graph message ID                           |
| work_items              |          planned | user         | Unified actionable items                       | own rows                             | Can link to mailbox or be mailbox-independent                     |
| commitments             | planned optional | user         | Promise tracker                                | own rows                             | Link to work item/source, survives mailbox transfer if reassigned |
| focus_sessions          | planned optional | user         | Focus Mode sessions                            | own rows                             | User-owned                                                        |
| focus_session_items     | planned optional | user         | Focus Mode queue items                         | own rows                             | User-owned                                                        |
| ai_analyses             |          planned | user         | AI analysis history                            | own rows                             | Links to work item, not email only                                |
| tasks                   |          planned | user         | Manual/parsed tasks                            | own rows                             | User-owned                                                        |
| reminders               |          planned | user         | Reminder scheduler                             | own rows                             | User-owned                                                        |
| draft_replies           |          planned | user         | Draft approval/send flow                       | own rows                             | Links to mailbox if source is email                               |
| manager_rules           |          planned | user         | Deterministic manager behavior rules           | own rows                             | User-owned, should survive mailbox change                         |
| manager_memories        |          planned | user         | Semantic/soft AI memory                        | own rows                             | User-owned, should survive mailbox change                         |
| feedback_events         |          planned | user         | Corrections and learning events                | own rows                             | User-owned                                                        |
| audit_logs              |          planned | user/system  | Sensitive action history                       | own rows, service writes             | Needed for transfer audit                                         |
| notification_events     |          planned | user/system  | Notifications                                  | own rows                             | User-owned                                                        |
| daily_briefs            |          planned | user         | Morning brief history                          | own rows                             | User-owned                                                        |
| webhook_events          |          planned | system       | Raw webhook events                             | restricted                           | Scoped by integration/mailbox when known                          |
| account_transfer_events |          planned | service/user | Account/mailbox transfer audit                 | restricted                           | Mandatory for moving to another email                             |

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

| Date | Migration | Summary                | Docs updated by    |
| ---- | --------- | ---------------------- | ------------------ |
| TBD  | TBD       | Initial schema planned | Documentation pack |
