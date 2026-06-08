# Next.js + Supabase + Edge Functions Architecture

## Next.js responsibilities

- Dashboard UI.
- Protected routes.
- Server actions/API routes for user actions.
- Microsoft OAuth browser redirects.
- Settings pages.
- Work item details.

## Supabase responsibilities

- Auth session.
- Postgres database.
- RLS.
- Realtime dashboard updates.
- Storage later.
- pgvector memory.
- Queues and Cron.

## Edge Function responsibilities

- Graph webhook.
- Token refresh.
- Initial sync.
- Delta sync.
- Thread processing.
- AI analysis.
- Reminder processing.
- Daily brief generation.
- Draft creation.
- Approved send.
- Memory embedding/update.
- Subscription renewal.

## Server-only utilities

```txt
requireUser
getCurrentUser
createSupabaseServerClient
createServiceRoleClient
auditLog
enqueueJob
getGraphAccessTokenForUser
refreshGraphTokenIfNeeded
```

## Frontend rule

The frontend must never receive:

- Supabase service role key.
- Microsoft access token.
- Microsoft refresh token.
- AI API key.
- Token encryption key.

## Data fetching rule

Dashboard should read from already-analyzed database rows. Do not call AI when the dashboard loads.
