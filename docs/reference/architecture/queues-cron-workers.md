# Queues, Cron, and Worker Design

## Rule

No long-running work in request handlers. Webhooks and user actions should enqueue jobs, then return quickly.

## Recommended queues

```txt
graph_webhook_events
outlook_delta_sync
email_thread_processing
ai_analysis
manual_task_parse
reminder_delivery
daily_brief_generation
memory_embedding
graph_subscription_renewal
outbound_email_send
```

## Queue message pattern

Every queue message should include:

```json
{
  "user_id": "uuid",
  "integration_id": "uuid when relevant",
  "mailbox_id": "uuid when relevant",
  "reason": "new_email | cron | manual | retry",
  "created_at": "ISO timestamp",
  "trace_id": "uuid"
}
```

## Processing rules

- Process small batches.
- Use retries.
- Respect external API rate limits.
- Log failures.
- Poison jobs must be visible in health page.
- Dequeue only after success.

## Cron jobs

Recommended:

```txt
Every minute: process reminders
Every minute: process AI analysis queue
Every 5 minutes: Outlook delta sync fallback
Hourly: renew Graph subscriptions
Every 15 minutes: daily brief dispatcher
Hourly: integration health check
```

## Observability

Track:

```txt
queue depth
oldest unprocessed job
failure count
last success time
last error
average processing time
```
