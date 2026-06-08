# Portability and Moving to Another Email / Mailbox

## Goal

The project must be easy to move or reconnect later if the manager changes email, connects a different Microsoft account, or the project is installed for another user.

## Golden rule

Never use email address as the primary identity.

Use:

```txt
profiles.id           = app user identity
user_integrations.id  = connected Microsoft provider account
mailboxes.id          = specific mailbox being synced
```

## Why this matters

Email addresses can change. Microsoft tenants can change. A manager can reconnect a new mailbox. A company may later want the project under another user. If data is tied directly to email strings, migration becomes painful.

## Required schema pattern

For user-owned data:

```txt
user_id uuid not null
```

For Microsoft integration data:

```txt
user_id uuid not null
integration_id uuid not null
mailbox_id uuid not null
```

For Outlook messages:

```txt
unique(mailbox_id, graph_message_id)
```

Do not use:

```txt
unique(user_id, graph_message_id)
```

because one user can later connect multiple mailboxes or reconnect a new mailbox.

## Mailbox table

Add `mailboxes` in Phase 1.

Purpose:

```txt
Represents a specific Microsoft mailbox connected to Vesta.
```

Important fields:

```txt
id
user_id
integration_id
provider
provider_tenant_id
provider_user_id
mailbox_email
mailbox_display_name
mailbox_type
aliases
status
connected_at
last_sync_at
metadata
```

## Supported future scenarios

### Scenario 1 — Same app user, new Outlook mailbox

Use when the manager keeps the same Vesta login but connects a different Microsoft mailbox.

Steps:

1. User disconnects old Microsoft integration or keeps it archived.
2. User connects new Microsoft account.
3. Create new `user_integrations` row if provider identity differs.
4. Create new `mailboxes` row.
5. Keep old email data linked to old mailbox.
6. Dashboard default view uses active mailbox.
7. Optional historical view can show both old and new mailbox data.

### Scenario 2 — New app user, transfer old data

Use when the manager creates a new Vesta login and wants old data transferred.

Steps:

1. Create new user profile.
2. Verify ownership/admin approval.
3. Create `account_transfer_events` row with status `requested`.
4. Snapshot row counts for source user.
5. Run service-role transfer function.
6. Reassign user-owned data from old `user_id` to new `user_id` only after approval.
7. Keep audit log.
8. Validate row counts.
9. Mark transfer completed.

### Scenario 3 — Turn project into company-wide product

Use organizations later:

```txt
organizations
organization_members
tenants
admin_consent_records
```

Do not add full organization complexity in MVP, but keep `user_id` on all data now.

## Transfer safety rules

- Transfer must require explicit approval.
- Only service role can perform transfer.
- Log before/after counts.
- Never transfer encrypted tokens blindly from one user to another without re-consent.
- Reconnect Microsoft OAuth for the target user/mailbox.
- Keep old audit logs immutable where possible.
- Provide rollback plan before running transfer.

## Export/import checklist

For project migration to another Supabase project:

- [ ] Migrations committed.
- [ ] Seed/demo data separated from production data.
- [ ] Data dictionary current.
- [ ] Storage buckets documented.
- [ ] Edge Function secrets documented in `.env.example`, not real values.
- [ ] Supabase extensions documented.
- [ ] Cron jobs documented.
- [ ] Queue names documented.
- [ ] Microsoft app registration redirect URIs documented.

## Required transfer event table

```txt
account_transfer_events
```

Purpose:

```txt
Audit and control any reassignment of data between users or mailboxes.
```

Minimum fields:

```txt
id
requested_by_user_id
source_user_id
target_user_id
source_mailbox_id
target_mailbox_id
transfer_type
status
reason
before_counts jsonb
after_counts jsonb
approved_at
completed_at
error
created_at
```

## What must survive mailbox change

These should remain user-owned and survive mailbox change:

```txt
manager_rules
manager_memories
people
projects
tasks
reminders not tied to deleted email
daily_briefs optional
audit_logs
```

These are mailbox-specific:

```txt
email_messages
email_threads
sync_cursors
graph_subscriptions
webhook_events
draft_replies tied to source emails
```
