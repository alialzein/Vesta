# Architecture Overview

## Chosen architecture

```txt
Browser
  ↓
Next.js app on Vercel
  ↓
Supabase Auth + Postgres + RLS
  ↓
Supabase Edge Functions
  ↓
Microsoft Graph + AI API
  ↓
Supabase Queues / Cron / Realtime
```

## Main principle

The frontend reads fast dashboard-ready data from Supabase. Background functions perform slow or external work.

## Core tables

```txt
profiles
user_integrations
mailboxes
graph_tokens private
sync_cursors
people
projects
email_threads
email_messages
work_items
ai_analyses
tasks
reminders
draft_replies
manager_rules
manager_memories
feedback_events
audit_logs
notification_events
daily_briefs
webhook_events
account_transfer_events
```

## Main flows

### Outlook sync

```txt
Graph webhook / cron
  ↓
Queue event
  ↓
Delta sync
  ↓
Store emails and threads
  ↓
Create/update work_items
  ↓
AI analysis queue
  ↓
Dashboard updates
```

### User action

```txt
Manager clicks action
  ↓
Next.js server action or API route verifies session
  ↓
Database update or Edge Function call
  ↓
Audit log
  ↓
Dashboard updates
```

## Why no Azure worker in MVP

Supabase Edge Functions, Queues, and Cron are enough for the MVP if all work is split into small jobs. Long work must not run inside Graph webhook handlers.

## Where Azure or a separate worker may be added later

- Very high mailbox volume.
- Heavy attachment/document/OCR processing.
- Enterprise requirement for Azure-native infrastructure.
- Advanced Teams bot hosting.
- Long-running workloads beyond Edge Function limits.
