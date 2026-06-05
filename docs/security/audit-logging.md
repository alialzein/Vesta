# Audit Logging

## Why

The product works with sensitive email and AI-generated actions. We need a record of what happened.

## Audit log events

Required events:

```txt
microsoft_connected
microsoft_disconnected
microsoft_token_refreshed
microsoft_reauth_required
graph_subscription_created
graph_subscription_renewed
graph_webhook_received
email_synced
work_item_created
work_item_analyzed
priority_changed
reminder_created
reminder_sent
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

## Audit row fields

```txt
id
user_id
actor_type
actor_id
action
entity_type
entity_id
before jsonb
after jsonb
metadata jsonb
created_at
```

## Rules

- Audit logs should be append-only in normal app flows.
- User can view relevant own audit logs later.
- Service role writes system events.
- Do not store raw secrets in audit logs.
- Do not store full email bodies in audit logs unless explicitly needed.
