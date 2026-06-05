# Integration Test Requirements

Use mocked external services for Microsoft Graph and AI API.

## Microsoft Graph OAuth

Test:

- OAuth callback stores integration.
- Refresh token is encrypted/protected.
- Token refresh updates expiry.
- Refresh failure marks integration `reauth_required`.

## Initial sync

Test:

- Inbox messages upsert.
- Sent Items messages upsert.
- Mailbox row is created.
- Thread rows are created.
- People rows are created.
- Basic work items are created.

## Delta sync

Test:

- Created message handled.
- Updated message handled.
- Deleted/removed message handled.
- nextLink continuation saved.
- deltaLink saved after full sync.

## Webhook

Test:

- validationToken returns plain text.
- Invalid clientState is rejected/logged.
- Valid notification enqueues delta sync.
- Handler returns quickly.

## AI analysis

Test:

- Queue job processed.
- AI output validated.
- Work item updated.
- AI analysis history saved.
- Invalid AI output uses retry/fallback.

## Draft send

Test:

- Cannot send generated draft without approval.
- Approved draft can be sent through mocked Graph.
- Audit log created.
