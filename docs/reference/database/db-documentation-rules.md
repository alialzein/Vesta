# Database Documentation Rules

The AI coding agent must keep database documentation accurate. This is mandatory.

## When a migration is added

Update:

```txt
docs/reference/database/data-dictionary.md
docs/reference/database/schema-v1.md if structure or meaning changes
docs/reference/database/erd.mmd if relationships change
docs/reference/database/portability-and-email-migration.md if ownership, email, mailbox, or transfer logic changes
```

## Every table must document

- Purpose.
- Owner type: user, system, service, shared, future organization.
- Primary key.
- Foreign keys.
- Important columns.
- Indexes.
- RLS policies.
- Which code writes to it.
- Which screens read from it.
- Retention/deletion behavior.
- Portability behavior.
- Tests covering it.

## Every column with business meaning must document

- Type.
- Nullable or required.
- Meaning.
- Who writes it.
- Example value.
- Whether it is safe to expose to browser.

## Migration naming

Use descriptive migration names:

```txt
YYYYMMDDHHMMSS_create_identity_and_integration_tables.sql
YYYYMMDDHHMMSS_create_email_sync_tables.sql
YYYYMMDDHHMMSS_create_work_items_and_ai_tables.sql
YYYYMMDDHHMMSS_create_memory_and_rules_tables.sql
```

## Generated types

After migration, update generated types if the project supports it.

Example command placeholder:

```bash
supabase gen types typescript --project-id <project-id> --schema public > packages/db/generated-types.ts
```

Use the actual project command if different.

## Documentation enforcement

A database task is incomplete if:

- A migration exists but data dictionary is not updated.
- A new user-owned table lacks RLS.
- A Microsoft-data table lacks `integration_id` or `mailbox_id` without explanation.
- A table uses email address as ownership identity.
- No tests or manual verification are documented.

## Required AI final report for DB tasks

```txt
Database changes:
- Migrations created:
- Tables created/changed:
- RLS policies:
- Indexes:
- Data dictionary updated: yes/no
- ERD updated: yes/no
- Generated types updated: yes/no
- Portability impact:
- Tests run:
```
