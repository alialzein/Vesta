# Migration Checklist

Use this before and after every migration.

## Before writing migration

- [ ] Is this table/column necessary for current phase?
- [ ] Does this belong to user, mailbox, integration, or system?
- [ ] Does it need `user_id`?
- [ ] Does it need `integration_id`?
- [ ] Does it need `mailbox_id`?
- [ ] What indexes are needed?
- [ ] What RLS policies are needed?
- [ ] Does this affect portability to another email?

## After writing migration

- [ ] Migration runs locally.
- [ ] RLS enabled on all public user-owned tables.
- [ ] Policies tested or manually verified.
- [ ] Indexes added for dashboard/sync queries.
- [ ] Data dictionary updated.
- [ ] ERD updated.
- [ ] Generated types updated.
- [ ] Tests added or updated.

## Rollback thinking

Supabase migrations are usually forward-only. Before merging:

- [ ] Can this be safely applied to production?
- [ ] Is there a data backfill?
- [ ] Is there a default value?
- [ ] Could this lock large tables later?
- [ ] Is there a migration note?
