# Handoff Checklist

Use this checklist before switching from one AI agent to another, or before stopping work for the day.

## General

- [ ] Latest code is committed or saved.
- [ ] Current phase is clear.
- [ ] Open TODOs are documented.
- [ ] Known bugs are documented.
- [ ] Setup commands are documented.

## Database

- [ ] Migrations are committed.
- [ ] Migrations run locally.
- [ ] RLS policies are included.
- [ ] Data dictionary updated.
- [ ] ERD updated if relationships changed.
- [ ] Generated types updated.
- [ ] Portability notes updated if ownership/mailbox/integration changed.

## AI

- [ ] Prompt version documented.
- [ ] Output schema documented.
- [ ] Validation exists.
- [ ] User-visible reason only; no hidden chain-of-thought stored.
- [ ] Sensitive action requires approval.

## Tests

- [ ] Unit tests added for pure logic.
- [ ] Integration tests added for external services where mocked.
- [ ] E2E tests updated for user flow changes.
- [ ] Test commands were run.
- [ ] Failures are documented.

## Security

- [ ] No secrets exposed.
- [ ] Service role only server-side.
- [ ] Microsoft tokens private/encrypted.
- [ ] Audit logs added for sensitive actions.
- [ ] Auto-send not introduced.
