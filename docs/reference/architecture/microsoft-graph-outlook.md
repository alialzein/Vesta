# Microsoft Graph Outlook Integration

> **Scope note.** The MVP mailbox integration is **Microsoft Graph / Outlook only**
> and is **separate from login** (login is multi-provider via Supabase Auth —
> email/password, Google, Microsoft SSO). A future expansion adds Gmail (OAuth)
> and, later, generic IMAP as an opt-in. That direction is planned in
> `docs/plans/auth-onboarding-and-mailbox-plan.md`; this document remains
> authoritative for the Outlook MVP.

## MVP scopes

Start with least privilege.

Initial read:

```txt
openid
profile
email
offline_access
User.Read
Mail.Read
```

Draft/update later:

```txt
Mail.ReadWrite
```

Approved send later:

```txt
Mail.Send
```

## Important rules

- Store refresh tokens securely server-side only.
- Never expose Graph tokens to the browser.
- Use Inbox and Sent Items in MVP.
- Sent Items are needed to know if the manager already replied.
- Use webhooks for fast notification.
- Use delta sync as reliability fallback.
- Do not process webhook work directly; queue it.

## Outlook folders for MVP

```txt
inbox
sentitems
```

## Message fields to store

```txt
id
receivedDateTime
sentDateTime
subject
bodyPreview
body or uniqueBody when needed
from
sender
toRecipients
ccRecipients
conversationId
conversationIndex
internetMessageId
importance
isRead
hasAttachments
categories
flag
webLink
parentFolderId
```

## Direction detection

```txt
outbound: from email matches manager mailbox or known aliases
inbound: otherwise
unknown: ambiguous
```

## Webhook handler pattern

```txt
Receive validation token?
  ↓
Return decoded token as text

Normal notification?
  ↓
Validate clientState
  ↓
Insert webhook_events row
  ↓
Enqueue outlook_delta_sync
  ↓
Return 202 fast
```

## Delta sync pattern

```txt
Load sync cursor
  ↓
Call delta URL or initial delta endpoint
  ↓
Upsert messages
  ↓
Mark removed messages deleted
  ↓
Save nextLink or deltaLink
  ↓
Queue thread processing
```

## Do not do in MVP

- Do not request broad Teams permissions.
- Do not use application permissions unless necessary.
- Do not monitor tenant-wide mailboxes.
- Do not auto-send emails.
