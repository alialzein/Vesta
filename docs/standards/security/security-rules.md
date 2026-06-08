# Security Rules

## Secrets

Never expose these to frontend:

```txt
SUPABASE_SERVICE_ROLE_KEY
MICROSOFT_CLIENT_SECRET
Microsoft access token
Microsoft refresh token
TOKEN_ENCRYPTION_KEY
OPENAI_API_KEY
GRAPH_WEBHOOK_CLIENT_STATE_SECRET
```

## Microsoft tokens

- Store encrypted or in protected private schema.
- Refresh server-side only.
- If refresh fails, mark integration `reauth_required`.
- Do not transfer tokens between users.

## Approval gates

Human approval required for:

```txt
send email
save AI memory
create rule that changes behavior
create Outlook rule
delete data
transfer account/mailbox ownership
```

## Data deletion/disconnect

Disconnect must offer:

```txt
Disconnect Microsoft only
Disconnect and stop sync
Delete synced email data
Delete all Vesta data
```

Deletion should be audited.

## AI privacy

- Minimize data sent to AI.
- Do not send attachments in MVP.
- Redact secrets if detected.
- Store prompt version and model for auditability.
