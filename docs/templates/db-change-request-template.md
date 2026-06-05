# Database Change Request Template

```md
## Change summary

What table/columns/indexes/policies are being added or changed?

## Reason

Why is this needed for the current phase?

## Ownership

- User-owned?
- Integration-owned?
- Mailbox-owned?
- System-owned?

## Portability impact

Does this affect moving to another email/mailbox?

## Migration files

- `supabase/migrations/...sql`

## RLS

Policies added/changed:

## Indexes

Indexes added/changed:

## Documentation updates

- [ ] data dictionary
- [ ] schema-v1
- [ ] ERD
- [ ] portability docs

## Tests

- [ ] migration run
- [ ] RLS test
- [ ] app logic test
```
