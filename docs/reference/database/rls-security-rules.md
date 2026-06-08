# RLS and Security Rules

## Public user-owned table policy pattern

Use this pattern unless a table is service-write-only.

```sql
create policy "select own rows"
  on public.table_name for select
  using (auth.uid() = user_id);

create policy "insert own rows"
  on public.table_name for insert
  with check (auth.uid() = user_id);

create policy "update own rows"
  on public.table_name for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows"
  on public.table_name for delete
  using (auth.uid() = user_id);
```

## Service-write tables

For tables such as webhook logs and sync internals, users may view safe status but not write raw events.

Examples:

```txt
webhook_events
sync_cursors
graph_subscriptions
audit_logs
```

Use RPCs or service role for writes.

## Private token storage

`graph_tokens` must not be accessible from browser clients.

Recommended:

```txt
private.graph_tokens
```

No public RLS policies. Only service role/Edge Functions access.

## Sensitive actions needing audit logs

```txt
microsoft_connected
microsoft_disconnected
graph_token_refreshed
graph_reauth_required
email_synced
work_item_analyzed
draft_generated
draft_edited
draft_approved
email_sent
memory_created
memory_updated
memory_disabled
rule_created
rule_updated
account_transfer_requested
account_transfer_completed
```

## RLS tests

At minimum, test:

- User A cannot read User B work items.
- User A cannot update User B memories.
- Browser client cannot access graph tokens.
- Service role can write sync rows.
