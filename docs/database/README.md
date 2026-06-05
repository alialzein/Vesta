# Database Documentation Index

The database is the backbone of Vesta. The database must be easy to understand, migrate, test, and transfer to another Microsoft mailbox later.

## Read order

1. `schema-v1.md`
2. `data-dictionary.md`
3. `db-documentation-rules.md`
4. `portability-and-email-migration.md`
5. `rls-security-rules.md`
6. `migration-checklist.md`
7. `erd.mmd`

## Core design

Everything the manager may act on becomes a `work_item`.

Email addresses are not identity. Use:

```txt
profiles.id           = app user identity
user_integrations.id  = connected provider account/integration
mailboxes.id          = specific Microsoft mailbox
```

## Important portability decision

Do not make `email_messages` unique only by `user_id + graph_message_id`.

Use:

```txt
mailbox_id + graph_message_id
```

This makes it safer to reconnect another mailbox or support more than one mailbox later.

## Mandatory documentation updates

Every database migration must update:

```txt
docs/database/data-dictionary.md
docs/database/schema-v1.md when schema meaning changes
docs/database/erd.mmd when relationships change
docs/database/portability-and-email-migration.md when ownership/migration logic changes
```
