# AI Chief of Staff / Executive Work Radar — Full Technical Implementation Plan

**Document version:** 1.0  
**Date:** 2026-06-02  
**Primary stack decision:** Vercel + Next.js + Supabase + Supabase Edge Functions + Microsoft Graph + OpenAI API  
**Hosting decision for MVP:** No Azure hosting required. Microsoft Entra is required only for app registration / OAuth / Graph permissions.

---

## 1. Executive Summary

This project is an **AI Chief of Staff** for a manager. The system connects to Microsoft 365 sources, especially Outlook first and Teams later, then converts emails, messages, manual tasks, reminders, and commitments into one prioritized dashboard.

The goal is not to create another inbox. The goal is to create a **work radar** that tells the manager:

- What must be handled now.
- Who is waiting for him.
- Which email threads have multiple follow-ups.
- Which items can be delegated.
- Which messages are FYI only.
- Which replies can be drafted by AI.
- Which reminders or commitments are at risk.
- What the AI has learned about his work style and priorities.

The MVP should be built with the stack already familiar from TeamsOPs:

```txt
Frontend:        Vercel + Next.js
Database:        Supabase Postgres
Auth:            Supabase Auth + custom Microsoft Graph OAuth integration
Storage:         Supabase Storage
Memory:          Supabase Postgres + pgvector
Background jobs: Supabase Edge Functions + Supabase Cron + Supabase Queues / pgmq
Realtime:        Supabase Realtime
Microsoft:       Microsoft Entra app registration + Microsoft Graph API
AI:              OpenAI API with structured outputs / function calling patterns
```

Azure Functions, Azure Container Apps, or other external workers are **not required for the first version**. Add them later only if scale, enterprise policy, heavy CPU work, or Teams bot infrastructure demands it.

---

## 2. Product Name Options

Use one internal name during development. Suggested options:

1. **Executive Work Radar**
2. **AI Chief of Staff**
3. **Manager Command Center**
4. **Work Sentinel**
5. **Priority Copilot**

Recommended internal codename:

```txt
executive-work-radar
```

Recommended product display name:

```txt
AI Chief of Staff
```

---

## 3. Core Product Vision

The manager opens one dashboard and sees:

```txt
Today’s Critical Items
├── Must Reply Now
├── People Waiting on Me
├── Multiple Follow-ups
├── Approvals / Decisions Needed
├── Delegatable Work
├── Reminders Due
├── Drafts Ready for Review
└── FYI / Low Priority
```

Each work item should include:

- Source: Outlook, Teams, manual task, calendar, AI-detected commitment.
- One-line summary.
- Priority score.
- Category.
- Explanation of why it is urgent or not urgent.
- Suggested next action.
- Buttons: reply, draft, remind, snooze, delegate, mark done, remember rule.
- Deep link to original Outlook/Teams item where possible.

Important principle:

> The AI must explain its prioritization in a short, user-facing reason. Do not store or show hidden chain-of-thought. Store only concise reasoning summaries and structured decisions.

---

## 4. MVP Scope

### 4.1 Included in MVP

The first impressive version should include:

1. **User login**

   - Manager signs in to the web dashboard.
   - Manager connects Microsoft account / mailbox.

2. **Outlook email sync**

   - Initial import of recent Inbox and Sent Items.
   - Incremental sync using Microsoft Graph delta queries.
   - Webhook support using Microsoft Graph change notifications.
   - Scheduled fallback sync to recover missed notifications.

3. **Unified work items**

   - Convert important emails, manual tasks, reminders, and AI-detected commitments into one `work_items` table.

4. **AI analysis**

   - Priority score from 0 to 100.
   - Category such as `must_reply`, `waiting_on_me`, `waiting_on_other`, `delegate`, `fyi`, `reminder`, `draft_ready`.
   - Summary.
   - Suggested action.
   - Deadline detection.
   - Reply-needed detection.
   - Delegation suggestion.

5. **Follow-up detector**

   - Detect email threads where someone followed up multiple times.
   - Detect unanswered emails.
   - Detect sender waiting for the manager.

6. **Manual task entry**

   - Manager can type free text.
   - AI converts it into task title, due date, priority, reminder, and related person/project if possible.

7. **Reminders**

   - Dashboard reminders.
   - Due reminders processed by Edge Functions.
   - Snooze and reschedule.
   - Optional email/Teams notification later.

8. **Draft replies**

   - AI generates draft replies.
   - Manager reviews/edits.
   - System sends only after explicit approval.
   - Save draft history and learn from edits.

9. **Manager memory**

   - VIP people.
   - Important clients/projects.
   - Preferred tone.
   - Delegation rules.
   - Working hours.
   - “Remember this” and “Forget this” controls.

10. **Daily brief**

    - Morning summary of critical work.
    - Shows blockers, follow-ups, overdue items, meetings later if calendar is added.

11. **Audit log**
    - Every AI classification, draft, reminder, send, rule change, and memory update should be logged.

---

### 4.2 Not Included in MVP

Do **not** include these in the first build unless explicitly needed:

- Fully autonomous auto-send.
- Full tenant-wide Teams monitoring.
- Attachment OCR / document analysis.
- Multi-user SaaS billing.
- Mobile app.
- Desktop app.
- Advanced Outlook rules automation.
- Calendar intelligence.
- Planner / Microsoft To Do integration.
- Full admin portal.

These can be later phases.

---

## 5. Key Architecture Decision

### 5.1 Chosen Architecture

```txt
Browser
  ↓
Vercel / Next.js App Router
  ↓
Supabase Auth + Supabase Postgres + RLS
  ↓
Supabase Edge Functions
  ↓
Microsoft Graph API + OpenAI API
  ↓
Supabase Queues / Cron / Realtime
```

### 5.2 Why No Azure Worker in MVP

Supabase Edge Functions and Supabase Cron can handle:

- Microsoft Graph OAuth callback.
- Graph webhook endpoint.
- Delta sync jobs.
- Queue processing.
- AI analysis.
- Reminder checks.
- Daily brief generation.
- Subscription renewal.

The important rule is:

> Never do long-running work inside Graph webhook handlers. Validate, enqueue, return quickly, and process later.

Azure can be added later if:

- Many users generate high webhook volume.
- Long-running document/attachment processing is needed.
- The company requires Microsoft-native infrastructure.
- A Teams bot requires a hosting model better suited to Bot Framework.
- Supabase Edge Function runtime limits become a blocker.

---

## 6. External Documentation Constraints Checked

This plan was prepared against current official docs as of 2026-06-02.

### 6.1 Microsoft Graph Webhooks

Important Graph webhook behavior:

- Notification endpoints must be publicly accessible over HTTPS.
- For normal notifications, Microsoft considers the notification delivered when your endpoint returns a 2xx response within 3 seconds.
- If processing cannot finish within 3 seconds, persist/queue the notification and return `202 Accepted`.
- Validation requests must return the URL-decoded `validationToken` as plain text within 10 seconds.
- `clientState` must be validated on notifications.
- Webhooks should be paired with delta sync for reliability.

Official docs:

- https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks

### 6.2 Microsoft Graph Delta Sync

Use delta query for Outlook messages so the app can sync changed/deleted/created messages without refetching the entire mailbox every time.

Official docs:

- https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0

### 6.3 Supabase Edge Functions and Queues

Supabase supports:

- Scheduled Edge Functions through `pg_cron` + `pg_net`.
- Durable queues through Supabase Queues / pgmq.
- Edge Function queue consumers.
- pgvector for embeddings.
- RLS for browser-safe data access.

Official docs:

- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/guides/queues
- https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions
- https://supabase.com/docs/guides/database/extensions/pgvector
- https://supabase.com/docs/guides/database/postgres/row-level-security

### 6.4 Vercel Cron

Vercel Cron is not the preferred scheduler for this project because Vercel Hobby has once-per-day cron limitations and frequent background jobs are better kept in Supabase.

Official docs:

- https://vercel.com/docs/cron-jobs/usage-and-pricing

### 6.5 OpenAI API

Use OpenAI API for structured analysis, draft generation, memory extraction, and task parsing. Store long-term memory in our own database.

Official docs:

- https://developers.openai.com/api/docs/guides/function-calling
- https://developers.openai.com/api/docs/guides/your-data
- https://developers.openai.com/api/docs/guides/production-best-practices

---

## 7. High-Level System Flow

### 7.1 Outlook Email Flow

```txt
New email arrives in Outlook
        ↓
Microsoft Graph sends webhook notification
        ↓
Supabase Edge Function: graph-webhook
        ↓
Validate clientState
        ↓
Insert lightweight event into queue/table
        ↓
Return 202 within 3 seconds
        ↓
Queue processor triggers delta sync or fetches message
        ↓
Store/merge email in Supabase
        ↓
Update email thread summary/follow-up counters
        ↓
Create/update work_item
        ↓
Queue AI analysis
        ↓
AI produces structured analysis
        ↓
Dashboard updates through Supabase Realtime
```

### 7.2 Manual Task Flow

```txt
Manager types task in dashboard
        ↓
Create raw manual_task record
        ↓
AI parses title/due date/person/project/priority
        ↓
Create/update work_item
        ↓
Set reminder if needed
        ↓
Dashboard updates
```

### 7.3 Draft Reply Flow

```txt
Manager clicks “Draft Reply”
        ↓
Load thread context + memories + tone settings
        ↓
AI generates draft
        ↓
Save draft_replies row
        ↓
Manager edits/reviews
        ↓
Manager clicks Send
        ↓
Edge Function sends through Microsoft Graph
        ↓
Audit log + optionally learn from edits
```

### 7.4 Reminder Flow

```txt
Reminder due time arrives
        ↓
Supabase Cron calls process-reminders every minute
        ↓
Function finds due reminders
        ↓
Creates notification event
        ↓
Updates dashboard / sends email or Teams notification later
        ↓
Marks reminder delivered or reschedules recurrence
```

---

## 8. Implementation Phases

## Phase 0 — Project Setup and Foundations

### Goal

Create a clean codebase, environments, Supabase project, Vercel project, and base architecture.

### Deliverables

- Next.js app deployed to Vercel.
- Supabase project configured.
- Local Supabase development environment.
- Migration system ready.
- TypeScript strict mode.
- Shared types package.
- Basic protected dashboard shell.
- Initial logging/error-handling conventions.

### Tasks

1. Create Git repository.
2. Create monorepo structure:

```txt
executive-work-radar/
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── middleware.ts
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── constants/
│   │   └── schemas/
│   ├── graph/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── types.ts
│   ├── ai/
│   │   ├── prompts/
│   │   ├── schemas/
│   │   └── analyze.ts
│   └── db/
│       └── generated-types.ts
├── supabase/
│   ├── functions/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
├── docs/
│   ├── architecture.md
│   ├── graph-permissions.md
│   ├── ai-behavior.md
│   └── deployment.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

3. Configure linting and formatting:

   - TypeScript strict.
   - ESLint.
   - Prettier.
   - Optional: Biome instead of ESLint/Prettier if preferred.

4. Configure Supabase locally:

```bash
supabase init
supabase start
```

5. Enable required extensions:

```sql
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgmq with schema pgmq;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;
```

6. Create environment variable files:

```txt
.env.local
.env.example
supabase/.env.local
```

### Acceptance Criteria

- App deploys to Vercel.
- Supabase migrations run locally and remotely.
- Logged-in user can access empty dashboard shell.
- RLS is enabled on all public tables.

---

## Phase 1 — Authentication and Microsoft Graph Connection

### Goal

Allow the manager to log in and connect his Microsoft 365 mailbox securely.

### Recommended Approach

Use Supabase Auth for app login, but implement a **custom Microsoft Graph OAuth integration** for Outlook scopes. This gives full control over:

- Requested Graph scopes.
- Refresh token storage.
- Incremental scope upgrades later.
- Token refresh logic.
- Re-authentication prompts.

Supabase Auth can still use Microsoft as an identity provider, but do not depend on Supabase Auth alone for Graph mail permissions unless we confirm it gives us all required token lifecycle behavior.

### Microsoft Entra App Registration

Create one Microsoft Entra app registration.

Required configuration:

```txt
Platform type: Web
Redirect URI dev:  http://localhost:3000/api/integrations/microsoft/callback
Redirect URI prod: https://your-domain.com/api/integrations/microsoft/callback
Supported account type: Single tenant first, multi-tenant later if SaaS
Client secret: create and store securely
```

### Phase 1 Scopes

Start with least privilege and add scopes only when features need them.

Initial read-only analysis:

```txt
openid
profile
email
offline_access
User.Read
Mail.Read
```

When creating drafts / updating flags / local Graph draft messages:

```txt
Mail.ReadWrite
```

When sending approved emails:

```txt
Mail.Send
```

Later Outlook rules / mailbox settings:

```txt
MailboxSettings.ReadWrite
```

Later calendar intelligence:

```txt
Calendars.Read
Calendars.ReadWrite
```

Later Teams:

```txt
Chat.Read
Chat.ReadWrite
ChannelMessage.Read.All
Chat.Read.All
Chat.Read.WhereInstalled
ChannelMessage.Read.Group
```

Teams permissions should be added carefully, because some require admin consent or application permissions.

### Token Storage

Create a `graph_tokens` table.

Rules:

- Store access token encrypted or avoid storing long-lived access tokens where possible.
- Store refresh token encrypted.
- Never expose Graph tokens to the browser.
- Only Edge Functions use tokens.
- Replace refresh token when Microsoft returns a new one.
- Track granted scopes.
- Track token expiry.
- If refresh fails, mark integration as `reauth_required`.

### Edge / Next Routes

Preferred route split:

```txt
Next.js route:
  GET /api/integrations/microsoft/start
  GET /api/integrations/microsoft/callback

Supabase Edge Functions:
  microsoft-token-refresh
  graph-subscription-create
  graph-subscription-renew
```

Alternative:

```txt
Supabase Edge Functions only:
  ms-auth-start
  ms-auth-callback
```

For simplicity with browser redirects, Next.js routes can handle OAuth redirect and call Supabase with service role where needed. Keep secrets server-side only.

### Acceptance Criteria

- Manager can click “Connect Outlook”.
- OAuth consent screen appears.
- Tokens are stored server-side.
- Integration row shows connected status.
- Access token can be refreshed server-side.
- `/me` Graph call succeeds.

---

## Phase 2 — Database Schema and Unified Work Items

### Goal

Create the data backbone. Everything that may require attention becomes a `work_item`.

### Design Principle

Emails, Teams messages, manual tasks, reminders, and AI commitments are different source types, but the dashboard should read from one unified table:

```txt
work_items
```

This is the key to a clean product.

---

## 9. Database Design

### 9.1 Main Entity Relationship

```txt
profiles
  └── user_integrations
        ├── graph_tokens
        ├── graph_subscriptions
        └── sync_cursors

email_threads
  └── email_messages
        └── work_items
              ├── ai_analyses
              ├── reminders
              ├── draft_replies
              └── audit_logs

people
projects
manager_rules
manager_memories
feedback_events
```

### 9.2 Required Enums

```sql
create type integration_provider as enum (
  'microsoft_graph',
  'teams_bot'
);

create type integration_status as enum (
  'connected',
  'disconnected',
  'reauth_required',
  'error'
);

create type work_item_source as enum (
  'outlook_email',
  'teams_message',
  'manual_task',
  'calendar_event',
  'ai_commitment',
  'reminder'
);

create type work_item_status as enum (
  'open',
  'snoozed',
  'waiting',
  'done',
  'archived',
  'dismissed'
);

create type work_item_category as enum (
  'must_reply',
  'waiting_on_me',
  'waiting_on_other',
  'needs_decision',
  'needs_approval',
  'follow_up_risk',
  'delegate',
  'reminder',
  'draft_ready',
  'manual_task',
  'fyi',
  'low_priority',
  'unknown'
);

create type urgency_level as enum (
  'critical',
  'high',
  'medium',
  'low'
);

create type reminder_status as enum (
  'scheduled',
  'sent',
  'snoozed',
  'cancelled',
  'failed'
);

create type draft_status as enum (
  'generated',
  'edited',
  'approved',
  'sent',
  'cancelled',
  'failed'
);

create type memory_type as enum (
  'preference',
  'vip',
  'project_context',
  'delegation_rule',
  'tone',
  'do_not_do',
  'company_context'
);
```

### 9.3 Table: profiles

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  timezone text not null default 'Asia/Beirut',
  role text default 'manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
```

RLS:

```sql
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);
```

### 9.4 Table: user_integrations

```sql
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider integration_provider not null,
  status integration_status not null default 'disconnected',
  provider_user_id text,
  provider_tenant_id text,
  provider_email text,
  scopes text[] not null default '{}',
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

alter table public.user_integrations enable row level security;
```

### 9.5 Table: graph_tokens

Keep this table inaccessible from browser clients. Only service role / Edge Functions should access it.

```sql
create table private.graph_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.user_integrations(id) on delete cascade,
  encrypted_access_token text,
  encrypted_refresh_token text not null,
  access_token_expires_at timestamptz,
  refresh_token_updated_at timestamptz,
  token_type text default 'Bearer',
  granted_scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration_id)
);
```

Create a `private` schema and do not expose it through the Supabase API.

### 9.6 Table: graph_subscriptions

```sql
create table public.graph_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  integration_id uuid not null references public.user_integrations(id) on delete cascade,
  graph_subscription_id text not null unique,
  resource text not null,
  change_type text not null,
  client_state_hash text not null,
  notification_url text not null,
  lifecycle_notification_url text,
  expires_at timestamptz not null,
  status text not null default 'active',
  last_renewed_at timestamptz,
  last_notification_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.graph_subscriptions enable row level security;
```

### 9.7 Table: sync_cursors

Use one row per mailbox folder / resource.

```sql
create table public.sync_cursors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  integration_id uuid not null references public.user_integrations(id) on delete cascade,
  provider integration_provider not null default 'microsoft_graph',
  resource_type text not null, -- email_messages, teams_messages, calendar_events
  resource_id text not null,   -- inbox, sentitems, folder id, chat id
  delta_link text,
  next_link text,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, resource_type, resource_id)
);

alter table public.sync_cursors enable row level security;
```

### 9.8 Table: people

```sql
create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text,
  email text,
  domain text,
  company text,
  is_vip boolean not null default false,
  vip_reason text,
  default_priority_boost int not null default 0,
  relationship_notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, email)
);

alter table public.people enable row level security;
```

### 9.9 Table: projects

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  priority_boost int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

alter table public.projects enable row level security;
```

### 9.10 Table: email_threads

```sql
create table public.email_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  graph_conversation_id text not null,
  subject_normalized text,
  participants jsonb not null default '[]',
  latest_message_at timestamptz,
  latest_inbound_at timestamptz,
  latest_outbound_at timestamptz,
  inbound_after_last_outbound_count int not null default 0,
  followup_count int not null default 0,
  is_waiting_on_manager boolean not null default false,
  is_waiting_on_other boolean not null default false,
  thread_summary text,
  last_ai_summary_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, graph_conversation_id)
);

alter table public.email_threads enable row level security;
```

### 9.11 Table: email_messages

```sql
create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid references public.email_threads(id) on delete set null,
  graph_message_id text not null,
  graph_folder_id text,
  graph_conversation_id text,
  internet_message_id text,
  conversation_index text,
  direction text not null check (direction in ('inbound', 'outbound', 'unknown')),
  subject text,
  body_preview text,
  body_text text,
  body_html text,
  sender_name text,
  sender_email text,
  from_email text,
  to_recipients jsonb not null default '[]',
  cc_recipients jsonb not null default '[]',
  bcc_recipients jsonb not null default '[]',
  reply_to jsonb not null default '[]',
  importance text,
  is_read boolean,
  has_attachments boolean not null default false,
  categories text[] not null default '{}',
  flag jsonb,
  web_link text,
  received_at timestamptz,
  sent_at timestamptz,
  deleted_at timestamptz,
  raw_graph jsonb,
  content_hash text,
  ai_relevant_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, graph_message_id)
);

alter table public.email_messages enable row level security;

create index email_messages_user_received_idx
  on public.email_messages(user_id, received_at desc);

create index email_messages_thread_idx
  on public.email_messages(thread_id, received_at desc);

create index email_messages_sender_idx
  on public.email_messages(user_id, sender_email);
```

### 9.12 Table: work_items

```sql
create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source work_item_source not null,
  source_id uuid,
  source_external_id text,
  thread_id uuid references public.email_threads(id) on delete set null,
  title text not null,
  summary text,
  category work_item_category not null default 'unknown',
  status work_item_status not null default 'open',
  urgency urgency_level not null default 'medium',
  priority_score int not null default 50 check (priority_score between 0 and 100),
  due_at timestamptz,
  snoozed_until timestamptz,
  completed_at timestamptz,
  assigned_to text,
  related_person_id uuid references public.people(id) on delete set null,
  related_project_id uuid references public.projects(id) on delete set null,
  requires_reply boolean not null default false,
  requires_decision boolean not null default false,
  requires_approval boolean not null default false,
  can_delegate boolean not null default false,
  suggested_delegate text,
  suggested_action text,
  urgency_reason text,
  confidence numeric(5,4),
  last_analyzed_at timestamptz,
  analysis_version int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_items enable row level security;

create index work_items_dashboard_idx
  on public.work_items(user_id, status, priority_score desc, due_at asc nulls last);

create index work_items_category_idx
  on public.work_items(user_id, category, status);
```

### 9.13 Table: ai_analyses

```sql
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  source_hash text not null,
  model text not null,
  prompt_version text not null,
  input_summary text,
  output jsonb not null,
  priority_score int,
  category work_item_category,
  urgency urgency_level,
  user_visible_reason text,
  confidence numeric(5,4),
  token_input int,
  token_output int,
  cost_estimate_usd numeric(12,6),
  error text,
  created_at timestamptz not null default now()
);

alter table public.ai_analyses enable row level security;
```

### 9.14 Table: tasks

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_item_id uuid references public.work_items(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'open',
  source text not null default 'manual',
  parsed_from_text text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
```

### 9.15 Table: reminders

```sql
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_item_id uuid references public.work_items(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  timezone text not null default 'Asia/Beirut',
  status reminder_status not null default 'scheduled',
  recurrence_rule text,
  delivery_channels text[] not null default '{dashboard}',
  last_sent_at timestamptz,
  snoozed_until timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create index reminders_due_idx
  on public.reminders(status, remind_at)
  where status = 'scheduled';
```

### 9.16 Table: draft_replies

```sql
create table public.draft_replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_item_id uuid references public.work_items(id) on delete cascade,
  email_message_id uuid references public.email_messages(id) on delete set null,
  graph_draft_message_id text,
  status draft_status not null default 'generated',
  to_recipients jsonb not null default '[]',
  cc_recipients jsonb not null default '[]',
  subject text,
  body_text text not null,
  body_html text,
  ai_generated_body text,
  user_edited_body text,
  edit_diff_summary text,
  tone text,
  model text,
  prompt_version text,
  approved_at timestamptz,
  sent_at timestamptz,
  error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.draft_replies enable row level security;
```

### 9.17 Table: manager_rules

Rules are deterministic. They override or boost AI analysis.

```sql
create table public.manager_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  is_enabled boolean not null default true,
  rule_type text not null, -- vip_sender, domain_boost, keyword_priority, delegate_to, never_auto_send, tone_preference
  conditions jsonb not null default '{}',
  actions jsonb not null default '{}',
  priority int not null default 100,
  created_from text not null default 'manual', -- manual, ai_suggestion, feedback
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.manager_rules enable row level security;
```

Example rules:

```json
{
  "rule_type": "vip_sender",
  "conditions": { "sender_email": "ceo@company.com" },
  "actions": { "priority_boost": 30, "category_override": "must_reply" }
}
```

```json
{
  "rule_type": "delegate_to",
  "conditions": { "keywords_any": ["invoice", "payment", "supplier"] },
  "actions": { "suggested_delegate": "Rania", "can_delegate": true }
}
```

### 9.18 Table: manager_memories

Memories are softer context used by the AI.

```sql
create table public.manager_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_type memory_type not null,
  memory_text text not null,
  scope text not null default 'global', -- global, person, project, company, sender_domain
  scope_ref text,
  source text not null default 'manual', -- manual, ai_suggestion, user_feedback, draft_edit
  confidence numeric(5,4) not null default 1.0,
  is_active boolean not null default true,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.manager_memories enable row level security;
```

If the embedding model dimension differs, update `vector(1536)` to the correct dimension.

### 9.19 Table: feedback_events

```sql
create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_item_id uuid references public.work_items(id) on delete cascade,
  event_type text not null, -- priority_wrong, not_urgent, should_delegate, good_draft, bad_draft, remember_this
  feedback_text text,
  old_value jsonb,
  new_value jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.feedback_events enable row level security;
```

### 9.20 Table: audit_logs

```sql
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  actor_type text not null, -- user, ai, system, graph_webhook, cron
  actor_id text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
```

### 9.21 Table: notification_events

```sql
create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_item_id uuid references public.work_items(id) on delete set null,
  channel text not null, -- dashboard, email, teams, browser_push
  title text not null,
  body text,
  status text not null default 'pending',
  sent_at timestamptz,
  error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.notification_events enable row level security;
```

### 9.22 Table: daily_briefs

```sql
create table public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brief_date date not null,
  title text not null,
  summary text not null,
  sections jsonb not null default '{}',
  generated_by_model text,
  created_at timestamptz not null default now(),
  unique(user_id, brief_date)
);

alter table public.daily_briefs enable row level security;
```

### 9.23 Table: webhook_events

Useful for debugging and replay.

```sql
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  subscription_id text,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text,
  payload jsonb not null,
  status text not null default 'received',
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;
```

---

## 10. Supabase Queues Design

Use Supabase Queues / pgmq for background processing. Do not create one huge all-purpose queue unless you want simplicity at the beginning. Recommended queues:

```txt
graph_webhook_events
outlook_delta_sync
email_thread_processing
ai_analysis
reminder_delivery
daily_brief_generation
memory_embedding
graph_subscription_renewal
outbound_email_send
teams_sync_later
```

### 10.1 Queue Message Examples

#### graph_webhook_events

```json
{
  "provider": "microsoft_graph",
  "subscription_id": "...",
  "change_type": "created",
  "resource": "users/{id}/messages/{id}",
  "resource_data_id": "...",
  "received_at": "2026-06-02T10:00:00Z"
}
```

#### outlook_delta_sync

```json
{
  "user_id": "uuid",
  "integration_id": "uuid",
  "folder": "inbox",
  "reason": "webhook",
  "max_pages": 3
}
```

#### ai_analysis

```json
{
  "user_id": "uuid",
  "work_item_id": "uuid",
  "reason": "new_email",
  "priority": "normal"
}
```

#### outbound_email_send

```json
{
  "user_id": "uuid",
  "draft_reply_id": "uuid",
  "approved_by": "uuid",
  "approved_at": "2026-06-02T10:00:00Z"
}
```

### 10.2 Queue Processing Rules

- Process small batches: 5–20 items per invocation.
- Delete queue message only after successful processing.
- Use visibility timeout for retries.
- Track failures in `audit_logs` and queue metadata.
- For poison messages, move to a dead-letter pattern:
  - `failed_at`
  - `fail_count`
  - `last_error`
  - optional `dead_letter_events` table.

---

## 11. Supabase Edge Functions

### 11.1 Required Edge Functions

```txt
graph-webhook
microsoft-token-refresh
outlook-initial-sync
outlook-delta-sync
process-email-thread
ai-analyze-work-item
parse-manual-task
process-reminders
generate-daily-brief
create-draft-reply
send-approved-email
memory-update
memory-embed
renew-graph-subscriptions
integration-health-check
```

### 11.2 graph-webhook

Purpose:

- Receive Microsoft Graph notifications.
- Handle validation token.
- Validate `clientState`.
- Insert event into `webhook_events` and/or queue.
- Return fast.

Important:

- Disable Supabase JWT verification for this function because Microsoft Graph will not send Supabase JWT.
- Do not trust requests blindly.
- Validate `clientState`.
- Do not call OpenAI here.
- Do not run delta sync here except maybe enqueueing it.

Pseudo-code:

```ts
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const validationToken = url.searchParams.get('validationToken');

  if (validationToken) {
    return new Response(decodeURIComponent(validationToken), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const payload = await req.json();

  for (const notification of payload.value ?? []) {
    const ok = await validateClientState(notification.subscriptionId, notification.clientState);
    if (!ok) {
      await logSecurityEvent(notification);
      continue;
    }

    await insertWebhookEvent(notification);
    await enqueue('outlook_delta_sync', {
      subscription_id: notification.subscriptionId,
      resource: notification.resource,
      reason: 'graph_webhook',
    });
  }

  return new Response(null, { status: 202 });
});
```

### 11.3 outlook-initial-sync

Purpose:

- First mailbox import.
- Sync recent Inbox and Sent Items.
- Create delta cursors.
- Create thread records.
- Create initial work items.

Recommended initial window:

```txt
Last 30 days for MVP
```

Configurable later:

```txt
7 days, 30 days, 90 days, custom
```

Folders:

```txt
inbox
sentitems
```

Why Sent Items matters:

- To know whether the manager already replied.
- To detect “waiting on other”.
- To calculate `inbound_after_last_outbound_count`.

### 11.4 outlook-delta-sync

Purpose:

- Use Microsoft Graph delta links to keep local email store updated.
- Handle created, updated, deleted, moved, read/unread changes.

Rules:

- Maintain separate cursor for each folder.
- Use stored `@odata.deltaLink` after a completed round.
- Use `@odata.nextLink` until all pages are processed.
- If delta token fails or expires, restart delta sync for that folder.
- Do not fetch all bodies every time if content hash unchanged.

Pseudo-flow:

```txt
Load sync_cursor for user/folder
If delta_link exists: request delta_link
Else: request first delta endpoint with $select and optional receivedDateTime filter
Loop through pages up to max_pages
For each message:
  if @removed: mark deleted/moved
  else upsert email_messages
  upsert people
  upsert email_threads
  enqueue thread processing
When @odata.deltaLink appears:
  save delta_link, clear next_link
When @odata.nextLink appears:
  save next_link and requeue sync continuation
```

### 11.5 process-email-thread

Purpose:

- Recompute email thread state.
- Determine if manager owes reply.
- Count follow-ups.
- Create/update work item.

Thread calculations:

```txt
messages_sorted_by_time
latest_message_at
latest_inbound_at
latest_outbound_at
inbound_after_last_outbound_count
followup_count
is_waiting_on_manager
is_waiting_on_other
participants
```

Detection rules:

```txt
waiting_on_manager = latest_inbound_at > latest_outbound_at
waiting_on_other = latest_outbound_at > latest_inbound_at
multiple_followups = inbound_after_last_outbound_count >= 2
stale_unanswered = waiting_on_manager && latest_inbound_at older than SLA
vip_unanswered = waiting_on_manager && sender is VIP
```

### 11.6 ai-analyze-work-item

Purpose:

- Analyze one work item using AI.
- Save structured output.
- Update work item fields.

Inputs:

- Work item source content.
- Thread summary.
- Last N messages.
- Sender/person info.
- Deterministic manager rules.
- Top relevant manager memories.
- Current date/time and user timezone.

Output schema example:

```json
{
  "summary": "Client is following up on contract approval and expects confirmation tomorrow.",
  "category": "must_reply",
  "urgency": "critical",
  "priority_score": 92,
  "requires_reply": true,
  "requires_decision": true,
  "requires_approval": true,
  "can_delegate": false,
  "suggested_delegate": null,
  "detected_deadline": "2026-06-03T17:00:00+03:00",
  "suggested_action": "Reply today with approval status or ask for a one-day extension.",
  "user_visible_reason": "The client followed up twice, the thread is unanswered, and the message mentions approval needed by tomorrow.",
  "risk_flags": ["multiple_followups", "deadline_soon", "client_waiting"],
  "memory_suggestions": [
    {
      "type": "vip",
      "text": "Treat this client as VIP in future.",
      "confidence": 0.72
    }
  ],
  "confidence": 0.88
}
```

Rules:

- Always validate AI JSON with Zod or equivalent schema.
- If invalid, retry once with strict correction prompt.
- If still invalid, store error and fall back to rules-based scoring.
- Store token usage and cost estimate.
- Do not re-analyze if `source_hash + relevant_rules_hash + memory_hash` did not change.

### 11.7 parse-manual-task

Purpose:

Turn manager free text into structured task.

Input:

```txt
Remind me to call Karim about the Dubai contract tomorrow morning.
```

Output:

```json
{
  "title": "Call Karim about the Dubai contract",
  "due_at": "2026-06-03T09:00:00+03:00",
  "priority_score": 70,
  "related_person": "Karim",
  "related_project": "Dubai contract",
  "reminder_needed": true,
  "reminder_at": "2026-06-03T09:00:00+03:00"
}
```

### 11.8 process-reminders

Purpose:

- Find due reminders.
- Create notification events.
- Mark reminders sent.
- Reschedule recurring reminders.

Cron:

```txt
Every minute
```

Rules:

- Use user timezone for natural language display.
- Store all timestamps in UTC.
- Allow dashboard, email, and Teams notification channels.
- For MVP, dashboard notification is enough.

### 11.9 generate-daily-brief

Purpose:

Generate morning brief.

Cron:

```txt
Run every 15 minutes and find users whose local brief time is due.
```

Do not hardcode one global timezone. Store per-user `daily_brief_time` later.

Brief sections:

```txt
1. Must reply today
2. Multiple follow-ups
3. People waiting on you
4. Overdue reminders
5. Drafts ready
6. Delegatable items
7. Suggested first action
```

### 11.10 create-draft-reply

Purpose:

- Generate a draft reply using AI.
- Save locally.
- Optionally create Graph draft later.

Inputs:

- Original message.
- Thread context.
- Manager tone memory.
- Requested instruction, if any.

Example instruction:

```txt
Reply politely that we are reviewing and will confirm by Thursday.
```

Safety:

- Never send here.
- Draft only.
- Detect risky topics: legal, HR, money, contract, confidential, angry client.
- Mark `requires_human_review = true` always.

### 11.11 send-approved-email

Purpose:

- Send only after explicit manager approval.

Rules:

- Check `draft_replies.status = approved`.
- Check `approved_by = current user`.
- Validate recipients.
- Log audit event.
- Call Microsoft Graph `/sendMail` or send existing Graph draft.
- Mark sent.

### 11.12 memory-update

Purpose:

- Handle “Remember this”, “Forget this”, feedback, and AI memory suggestions.

Memory update types:

```txt
create_memory
update_memory
disable_memory
create_rule
update_rule
```

Require explicit user approval for AI-suggested memory unless it is very low risk and marked as suggestion only.

### 11.13 memory-embed

Purpose:

- Generate embeddings for active manager memories.
- Keep embeddings updated when memory text changes.

Queue:

```txt
memory_embedding
```

### 11.14 renew-graph-subscriptions

Purpose:

- Renew Graph subscriptions before expiration.
- Recreate expired subscriptions.
- Mark integration unhealthy if renewal fails.

Cron:

```txt
Hourly
```

Rules:

- Do not assume a fixed max subscription lifetime across resources.
- Use the returned `expirationDateTime`.
- Renew well before expiration.
- Store new expiration.
- Handle `reauthorizationRequired` lifecycle notifications when implemented.

### 11.15 integration-health-check

Purpose:

- Check Microsoft integration health.
- Detect expired/revoked tokens.
- Detect stale sync cursors.
- Detect webhook renewal issues.
- Show warnings in settings.

---

## 12. Supabase Cron Schedule

Recommended cron jobs:

```sql
-- Process AI queue every minute
select cron.schedule(
  'process-ai-analysis-queue',
  '* * * * *',
  $$ select net.http_post(url := 'https://PROJECT.supabase.co/functions/v1/ai-analyze-work-item', headers := '{...}'::jsonb, body := '{}'::jsonb); $$
);

-- Process reminders every minute
select cron.schedule(
  'process-reminders',
  '* * * * *',
  $$ select net.http_post(url := 'https://PROJECT.supabase.co/functions/v1/process-reminders', headers := '{...}'::jsonb, body := '{}'::jsonb); $$
);

-- Fallback Outlook delta sync every 5 minutes
select cron.schedule(
  'outlook-delta-sync-fallback',
  '*/5 * * * *',
  $$ select net.http_post(url := 'https://PROJECT.supabase.co/functions/v1/outlook-delta-sync', headers := '{...}'::jsonb, body := '{"reason":"cron"}'::jsonb); $$
);

-- Renew Graph subscriptions hourly
select cron.schedule(
  'renew-graph-subscriptions',
  '0 * * * *',
  $$ select net.http_post(url := 'https://PROJECT.supabase.co/functions/v1/renew-graph-subscriptions', headers := '{...}'::jsonb, body := '{}'::jsonb); $$
);

-- Generate daily brief dispatcher every 15 minutes
select cron.schedule(
  'daily-brief-dispatcher',
  '*/15 * * * *',
  $$ select net.http_post(url := 'https://PROJECT.supabase.co/functions/v1/generate-daily-brief', headers := '{...}'::jsonb, body := '{}'::jsonb); $$
);
```

Store function auth tokens in Supabase Vault where possible.

---

## 13. Microsoft Graph Integration Details

### 13.1 Graph Client Wrapper

Create a shared Graph client module:

```ts
export class GraphClient {
  constructor(private accessToken: string) {}

  async getMe() {}
  async listMailFolders() {}
  async deltaMessages(folderIdOrWellKnownName: string, deltaUrl?: string) {}
  async getMessage(messageId: string) {}
  async createDraft(message: DraftInput) {}
  async sendMail(message: SendMailInput) {}
  async createSubscription(input: SubscriptionInput) {}
  async renewSubscription(subscriptionId: string, expirationDateTime: string) {}
  async deleteSubscription(subscriptionId: string) {}
}
```

Add automatic retry handling for:

```txt
429 Too Many Requests
503 Service Unavailable
token expired
network timeout
```

Respect `Retry-After` when Graph returns it.

### 13.2 Mail Properties to Store

From Graph `message` resource, request/select:

```txt
id
createdDateTime
lastModifiedDateTime
receivedDateTime
sentDateTime
subject
bodyPreview
body
uniqueBody
from
sender
toRecipients
ccRecipients
bccRecipients
replyTo
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

For performance, do not always fetch `body` if `bodyPreview` is enough. For important items, fetch body on demand.

### 13.3 Folder Strategy

MVP folders:

```txt
inbox
sentitems
```

Later folders:

```txt
archive
drafts
important/custom folders
mail folders selected by user
```

### 13.4 Direction Detection

Set `direction`:

```txt
outbound if from/sender email equals manager mailbox or known aliases
inbound if not outbound
unknown if ambiguous
```

### 13.5 Thread Grouping

Primary key:

```txt
graph_conversation_id
```

Supplement with:

```txt
internetMessageId
conversationIndex
normalized subject
participants
```

This helps when Graph conversation grouping is not enough.

### 13.6 Outlook Draft vs Local Draft

MVP:

```txt
Store draft in local draft_replies table first.
Send through Graph only after approval.
```

Later:

```txt
Create actual Outlook draft using /me/messages.
Open draft in Outlook using webLink.
```

### 13.7 Follow-up Flag

Later, for “set reminder on this email”:

- Update message `flag` with follow-up start/due time.
- Also keep local reminder in `reminders` table because the dashboard needs its own reminder logic.

---

## 14. Microsoft Graph Webhook Strategy

### 14.1 Subscription Resources for MVP

Start with:

```txt
/me/mailFolders('inbox')/messages
/me/mailFolders('sentitems')/messages
```

Use:

```txt
changeType: created,updated
```

Do not include encrypted resource data in MVP unless needed. Simpler approach:

```txt
Webhook tells us something changed.
Delta sync fetches actual changes.
```

### 14.2 Validation Token Handling

Graph calls:

```txt
POST https://your-edge-function-url?validationToken=...
```

The function must return:

```txt
HTTP 200
Content-Type: text/plain
Body: decoded validation token
```

### 14.3 Notification Handling

For normal notification:

1. Parse body.
2. Validate `clientState`.
3. Insert notification record.
4. Enqueue delta sync.
5. Return `202`.

### 14.4 clientState Storage

Do not store plaintext clientState if avoidable.

Recommended:

```txt
clientState = random high entropy secret per subscription
store hash in graph_subscriptions.client_state_hash
validate incoming by hashing incoming value and comparing
```

### 14.5 Lifecycle Notifications

Add lifecycle support after basic webhooks work.

Needed for:

- Reauthorization required.
- Subscription removed.
- Missed notifications.

### 14.6 Fallback Delta Sync

Even with webhooks, run scheduled delta sync.

Why:

- Webhook delivery can fail.
- Subscriptions can expire.
- Processing can be delayed.
- Delta sync gives consistency.

---

## 15. AI System Design

### 15.1 AI Responsibilities

AI should do:

- Summarize messages/tasks.
- Extract deadlines.
- Detect requests.
- Detect decisions/approvals.
- Identify whether manager owes a reply.
- Suggest urgency and priority.
- Suggest delegation.
- Generate draft replies.
- Extract commitments.
- Suggest memories/rules.

AI should **not** do without guardrails:

- Send emails automatically.
- Delete emails.
- Modify Outlook rules without approval.
- Make final decisions on legal/financial/HR topics.
- Store sensitive memories without explicit approval.

### 15.2 Deterministic Score + AI Score

Do not rely only on AI. Combine rule-based scoring and AI classification.

#### Rule-based scoring example

```txt
Base score: 50

+25 sender is VIP
+20 multiple follow-ups
+20 due today/tomorrow
+15 directly addressed to manager
+15 contains approval/decision/blocker/client/legal/payment keywords
+10 unread and older than 24h
+10 external client domain
+10 manager mentioned by name
-15 manager only CC'd
-25 newsletter/automated sender
-20 already replied after latest inbound
-10 low importance
```

Then let AI adjust within a controlled range:

```txt
final_priority_score = clamp(rule_score + ai_adjustment, 0, 100)
ai_adjustment allowed range: -20 to +20
```

For critical triggers, deterministic overrides win:

```txt
VIP + multiple follow-ups + unanswered = minimum 85
deadline today + direct request = minimum 80
newsletter detected = maximum 30 unless VIP/project rule overrides
```

### 15.3 Priority Thresholds

```txt
90–100: Critical / must handle now
75–89:  High / handle today
50–74:  Medium / schedule or review
25–49:  Low / read later
0–24:   Ignore/FYI/archive candidate
```

### 15.4 Analysis Prompt Contract

The AI analysis prompt must include:

```txt
System role:
You are an executive assistant that classifies work items for a manager.
Return only valid JSON matching the schema.
Use concise, user-visible explanations.
Do not invent facts.
If unsure, set confidence lower.
Never recommend sending an email without human approval.

Inputs:
- Current date/time/timezone
- Manager profile
- Manager rules
- Relevant memories
- Work item source
- Thread summary
- Recent messages
- Deterministic signals

Output:
- summary
- category
- urgency
- priority_score
- requires_reply
- requires_decision
- requires_approval
- can_delegate
- suggested_delegate
- detected_deadline
- suggested_action
- user_visible_reason
- risk_flags
- memory_suggestions
- confidence
```

### 15.5 AI Output Validation

Use Zod schema:

```ts
const WorkItemAnalysisSchema = z.object({
  summary: z.string().min(1).max(500),
  category: z.enum([
    'must_reply',
    'waiting_on_me',
    'waiting_on_other',
    'needs_decision',
    'needs_approval',
    'follow_up_risk',
    'delegate',
    'reminder',
    'draft_ready',
    'manual_task',
    'fyi',
    'low_priority',
    'unknown',
  ]),
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  priority_score: z.number().int().min(0).max(100),
  requires_reply: z.boolean(),
  requires_decision: z.boolean(),
  requires_approval: z.boolean(),
  can_delegate: z.boolean(),
  suggested_delegate: z.string().nullable(),
  detected_deadline: z.string().datetime().nullable(),
  suggested_action: z.string().max(700),
  user_visible_reason: z.string().max(700),
  risk_flags: z.array(z.string()).default([]),
  memory_suggestions: z
    .array(
      z.object({
        type: z.string(),
        text: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .default([]),
  confidence: z.number().min(0).max(1),
});
```

### 15.6 AI Draft Reply Prompt Contract

Prompt rules:

```txt
You draft emails for the manager.
Use the manager's preferred tone.
Do not overpromise.
Do not create commitments that were not requested.
If a decision is missing, ask a concise question or propose a safe holding reply.
Never include confidential info not present in context.
Return subject/body and optional warnings.
```

Output:

```json
{
  "subject": "Re: Contract approval",
  "body_text": "Hi Samir, thanks for following up. We are reviewing the contract and I will confirm by Thursday.",
  "tone": "polite_direct",
  "warnings": ["This mentions a commitment date; manager should confirm before sending."],
  "requires_human_review": true
}
```

### 15.7 AI Memory Extraction

AI can suggest memory but user approves.

Examples:

```txt
Suggestion: Always treat emails from legal@company.com as high priority.
Suggestion: Manager prefers short, direct replies.
Suggestion: Finance requests should usually be delegated to Rania.
```

UI should show:

```txt
[Remember] [Ignore] [Edit] [Never suggest this again]
```

---

## 16. Memory and Behavior System

### 16.1 Memory Types

Use two memory layers.

#### Structured rules

Stored in `manager_rules`.

Use for deterministic behavior:

- VIP sender.
- Domain priority boost.
- Always delegate specific topics.
- Never auto-send to specific person.
- Preferred reply tone.
- Company-specific urgency keywords.

#### Semantic memories

Stored in `manager_memories` with embeddings.

Use for contextual retrieval:

- “Client X is sensitive and expects same-day replies.”
- “Manager prefers concise replies with no long introductions.”
- “Project Phoenix is high priority this quarter.”

### 16.2 Memory Retrieval Pipeline

For each AI analysis:

1. Build retrieval query from sender, subject, project, body summary.
2. Fetch deterministic rules matching sender/domain/project/keywords.
3. Fetch top semantic memories using pgvector.
4. Deduplicate and limit to the most relevant memories.
5. Pass only necessary memories into AI prompt.

### 16.3 Memory Safety

Rules:

- User can review all memories.
- User can delete/disable memories.
- User must approve AI-suggested memory.
- Do not store passwords, secrets, private medical information, or unnecessary sensitive data.
- Add `source` and `created_at` to every memory.
- Show where memory came from when possible.

### 16.4 Learning From Feedback

Feedback buttons:

```txt
Not urgent
More urgent
This is FYI
Always VIP
Never VIP
Delegate this type
Good draft
Bad draft
Remember this
Forget this
```

Feedback effects:

- Update `feedback_events`.
- Optionally create/update manager rule.
- Optionally create/update memory.
- Recalculate future priority scoring.

---

## 17. Follow-up Detection Design

### 17.1 Signals

Detect follow-ups using:

- Same Graph conversation ID.
- Multiple inbound messages after latest outbound manager reply.
- Keywords: follow up, following up, reminder, any update, checking in, just checking, urgent, pending, please confirm.
- Time since first unanswered inbound.
- Sender/domain importance.
- Deadline language.

### 17.2 Core Algorithm

```ts
function calculateThreadFollowupState(messages, managerEmails) {
  const sorted = messages.sort(byTimeAsc);
  const outbound = sorted.filter((m) => managerEmails.includes(m.from_email));
  const inbound = sorted.filter((m) => !managerEmails.includes(m.from_email));

  const latestOutboundAt = max(outbound.map((m) => m.sent_at ?? m.received_at));
  const latestInboundAt = max(inbound.map((m) => m.received_at ?? m.sent_at));

  const inboundAfterLastOutbound = inbound.filter((m) => {
    const t = m.received_at ?? m.sent_at;
    return !latestOutboundAt || t > latestOutboundAt;
  });

  const keywordFollowups = inboundAfterLastOutbound.filter((m) =>
    /follow\s?up|following up|any update|checking in|reminder|pending|please confirm/i.test(
      `${m.subject ?? ''} ${m.body_preview ?? ''}`,
    ),
  );

  return {
    latestOutboundAt,
    latestInboundAt,
    isWaitingOnManager:
      latestInboundAt && (!latestOutboundAt || latestInboundAt > latestOutboundAt),
    inboundAfterLastOutboundCount: inboundAfterLastOutbound.length,
    followupCount: Math.max(keywordFollowups.length, inboundAfterLastOutbound.length - 1),
  };
}
```

### 17.3 Work Item Categories from Thread State

```txt
if followup_count >= 2 and waiting_on_manager:
  category = follow_up_risk
  priority_score minimum 85

if waiting_on_manager and sender_vip:
  category = must_reply
  priority_score minimum 80

if waiting_on_manager and age > 48h:
  category = waiting_on_me
  priority_score minimum 70

if latest_outbound > latest_inbound:
  category = waiting_on_other
  priority_score depends on deadline/project
```

---

## 18. Dashboard UX Specification

### 18.1 Main Dashboard Sections

```txt
Header
├── Greeting + current date
├── Connect status
├── Search
├── Quick add task
└── Daily brief shortcut

Top alert cards
├── Critical now
├── You are blocking people
├── Multiple follow-ups
├── Drafts waiting for approval
└── Reminders due

Main work list
├── Must Reply
├── Waiting on Me
├── Follow-up Risk
├── Needs Decision
├── Delegate
├── Waiting on Others
├── Later / FYI
└── Done / Archived
```

### 18.2 Work Item Card

Each card should show:

```txt
[Priority badge] [Category] [Source icon]
Title / subject
Sender / related person
Summary
Urgency reason
Due date / age
Suggested action
Buttons:
  Open
  Draft reply
  Remind me
  Snooze
  Delegate
  Done
  Not urgent
```

### 18.3 Work Item Detail Page

Tabs:

```txt
Overview
Thread
AI Analysis
Draft Reply
Reminders
Memory / Rules
Audit
```

Overview fields:

- Summary.
- Why urgent.
- Suggested action.
- Sender profile.
- Related project.
- Follow-up count.
- Deadline.
- Source link.

### 18.4 Quick Add Task

Input:

```txt
+ Add anything: "Remind me to send budget to Rania Friday at 10"
```

After submit:

- Show parsed title/due/reminder.
- Allow user to confirm or edit.

### 18.5 Memory Settings Page

Sections:

```txt
VIP people
Delegation rules
Tone preferences
Project context
Do-not-do rules
AI-suggested memories pending approval
Disabled memories
```

### 18.6 Integration Settings Page

Show:

- Microsoft connected account.
- Granted scopes.
- Last sync time.
- Webhook status.
- Subscription expiration.
- Reconnect button.
- Sync now button.
- Disconnect/delete data button.

---

## 19. Security and Privacy Plan

### 19.1 Core Rules

1. Enable RLS on all exposed tables.
2. Keep tokens in private schema or encrypted fields.
3. Never expose service role key to browser.
4. Never expose Microsoft refresh token to browser.
5. Graph webhook endpoint must validate `clientState`.
6. All AI actions must be auditable.
7. Auto-send is disabled by default.
8. Drafts must be approved by manager before send.
9. Use least-privilege Microsoft Graph scopes.
10. Add disconnect and data deletion path.

### 19.2 RLS Pattern

Every user-owned table should have policies like:

```sql
create policy "select own rows"
  on public.work_items for select
  using (auth.uid() = user_id);

create policy "insert own rows"
  on public.work_items for insert
  with check (auth.uid() = user_id);

create policy "update own rows"
  on public.work_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows"
  on public.work_items for delete
  using (auth.uid() = user_id);
```

For tables only Edge Functions should write, allow select to user but restrict insert/update/delete to service role through RPC functions or no public policies.

### 19.3 Token Encryption

Recommended:

- Use Supabase Vault if practical for secrets.
- For per-user tokens, encrypt refresh tokens before storing.
- Store encryption key only in environment variable / secret manager.
- Rotate encryption key with migration plan later.

### 19.4 AI Data Minimization

Do not send unnecessary full mailbox data to AI.

For analysis send:

- Subject.
- Sender.
- Body preview or cleaned relevant body excerpt.
- Recent thread summary.
- Deterministic signals.
- Relevant memories only.

Avoid sending:

- Large attachments in MVP.
- Entire inbox.
- Unrelated old emails.
- Secrets/passwords/API keys found in email.

### 19.5 Human Approval Gates

Require explicit approval for:

- Sending email.
- Creating Outlook rules.
- Saving AI-suggested memory.
- Marking sender as VIP from AI suggestion.
- Delegating externally.
- Any action involving legal, HR, finance, contracts, or confidential topics.

### 19.6 Audit Events to Log

```txt
microsoft_connected
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
```

---

## 20. Performance and Cost Controls

### 20.1 Avoid Reanalysis

Use hashes:

```txt
content_hash = hash(subject + body_preview/body_text + sender + recipients + timestamp)
ai_relevant_hash = hash(content_hash + relevant_rule_versions + relevant_memory_versions + prompt_version)
```

Only enqueue AI analysis if relevant hash changed.

### 20.2 Batch Sizes

Recommended starting values:

```txt
Delta sync page size: 25–50 messages
AI analysis batch: 5–10 work items per function invocation
Thread processing batch: 20 threads
Reminder batch: 100 reminders
Memory embedding batch: 20 memories
```

### 20.3 Model Strategy

Use environment-configured model names:

```txt
OPENAI_ANALYSIS_MODEL=...
OPENAI_DRAFT_MODEL=...
OPENAI_EMBEDDING_MODEL=...
```

Do not hardcode model names throughout code. Store model in `ai_analyses` and `draft_replies`.

Suggested routing:

```txt
Classification / urgency: cheaper, fast model
Draft reply: stronger writing model
Daily brief: stronger summarization model
Embeddings: embedding model
```

### 20.4 Token Usage Tracking

Store:

- input tokens.
- output tokens.
- estimated cost.
- prompt version.
- model.
- source work item.

This helps optimize cost later.

---

## 21. Deployment Plan

### 21.1 Supabase Setup

1. Create Supabase project.
2. Enable extensions:

```sql
vector
pgmq
pg_net
pg_cron
pgcrypto
```

3. Run migrations.
4. Configure RLS policies.
5. Configure storage bucket if needed:

```txt
attachments-later
exports
```

6. Deploy Edge Functions:

```bash
supabase functions deploy graph-webhook --no-verify-jwt
supabase functions deploy microsoft-token-refresh
supabase functions deploy outlook-initial-sync
supabase functions deploy outlook-delta-sync
supabase functions deploy process-email-thread
supabase functions deploy ai-analyze-work-item
supabase functions deploy parse-manual-task
supabase functions deploy process-reminders
supabase functions deploy generate-daily-brief
supabase functions deploy create-draft-reply
supabase functions deploy send-approved-email
supabase functions deploy memory-update
supabase functions deploy memory-embed
supabase functions deploy renew-graph-subscriptions
supabase functions deploy integration-health-check
```

Only `graph-webhook` should normally be deployed without JWT verification.

### 21.2 Supabase Secrets

```bash
supabase secrets set APP_URL="https://your-domain.com"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
supabase secrets set MICROSOFT_CLIENT_ID="..."
supabase secrets set MICROSOFT_CLIENT_SECRET="..."
supabase secrets set MICROSOFT_TENANT_ID="..."
supabase secrets set MICROSOFT_REDIRECT_URI="https://your-domain.com/api/integrations/microsoft/callback"
supabase secrets set GRAPH_WEBHOOK_CLIENT_STATE_SECRET="random-long-secret"
supabase secrets set TOKEN_ENCRYPTION_KEY="random-32-byte-key"
supabase secrets set OPENAI_API_KEY="..."
supabase secrets set OPENAI_ANALYSIS_MODEL="..."
supabase secrets set OPENAI_DRAFT_MODEL="..."
supabase secrets set OPENAI_EMBEDDING_MODEL="..."
```

### 21.3 Vercel Setup

Environment variables:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_URL
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_TENANT_ID
MICROSOFT_REDIRECT_URI
```

Do not expose secrets with `NEXT_PUBLIC_` prefix.

### 21.4 Microsoft Entra Setup

1. Register app.
2. Add redirect URIs.
3. Add Graph API delegated permissions.
4. Add client secret.
5. For single-tenant internal use, keep app single tenant.
6. For SaaS later, switch to multi-tenant and add tenant onboarding flow.
7. Configure publisher verification later if public SaaS.
8. Get admin consent if needed for higher permissions.

### 21.5 Domain / HTTPS

- Vercel app domain for dashboard.
- Supabase Edge Function URL for Graph webhook.
- Graph webhook must be public HTTPS.

---

## 22. Testing Plan

### 22.1 Unit Tests

Test modules:

```txt
priority scoring
follow-up detection
thread state calculation
email direction detection
deadline parsing fallback
AI output schema validation
memory retrieval ranking
RLS helper policies if using SQL tests
Graph webhook validation handler
```

### 22.2 Integration Tests

Use mocked Graph responses.

Scenarios:

1. Initial Inbox sync creates email messages.
2. Initial Sent Items sync marks manager replies.
3. Delta sync handles created messages.
4. Delta sync handles deleted/moved messages.
5. Webhook validation token returns plain text.
6. Webhook normal notification enqueues job.
7. Expired access token refreshes successfully.
8. Refresh token revoked marks integration as `reauth_required`.
9. AI analysis updates work item.
10. Draft approval sends email.

### 22.3 E2E Tests

Use Playwright.

Flows:

```txt
login
connect Microsoft mock
view dashboard
add manual task
create reminder
open email work item
generate draft
edit draft
approve send mock
create memory
change priority feedback
```

### 22.4 Manual QA Scenarios

Create fixture email threads:

1. VIP sender, no follow-up.
2. VIP sender, 3 follow-ups.
3. Newsletter.
4. Manager CC only.
5. Client asks for approval tomorrow.
6. Manager already replied.
7. Manager waiting for client.
8. Legal/contract sensitive item.
9. Payment/invoice delegation item.
10. Angry client escalation.

For each scenario, verify:

- Correct category.
- Reasonable priority score.
- Correct “waiting on me” state.
- Draft reply is safe.
- Audit log exists.

---

## 23. Observability and Admin Monitoring

### 23.1 Tables / Views

Create admin views:

```txt
job_health_view
sync_health_view
integration_health_view
ai_cost_daily_view
webhook_recent_errors_view
queue_depth_view
```

### 23.2 Metrics to Track

```txt
Graph webhook response time
Webhook events received per hour
Delta sync last success
Queue depth by queue
Queue failures
AI requests per day
AI cost estimate per day
Reminder delivery failures
Draft send failures
Subscription renewal failures
Average time from email received to dashboard item analyzed
```

### 23.3 Alerts

Trigger alerts when:

```txt
No successful sync in 30 minutes
Webhook validation fails
Graph token refresh fails
Graph subscription expires within 2 hours
AI queue depth > threshold
Reminder processor failed
OpenAI API errors exceed threshold
```

For MVP, alerts can be visible in an internal `/admin/health` page.

Later, send alerts to email/Teams/Sentry.

---

## 24. UX Safety Copy

Use clear text in the UI:

```txt
AI drafted this reply. Please review before sending.
```

```txt
This priority was generated by AI and rules. You can correct it to teach the assistant.
```

```txt
The assistant will never send emails automatically unless you explicitly enable that behavior later.
```

```txt
This memory affects future prioritization. You can edit or delete it anytime.
```

---

## 25. Phase-by-Phase Build Roadmap

## Phase 0 — Foundation

Duration target: first implementation sprint.

Build:

- Repo scaffold.
- Supabase local setup.
- Vercel deployment.
- Auth shell.
- DB base migrations.
- RLS base policies.

Done when:

- User can log in and see empty dashboard.

---

## Phase 1 — Microsoft Connection

Build:

- Microsoft Entra app registration.
- Connect Outlook button.
- OAuth callback.
- Token storage.
- Token refresh.
- Graph `/me` test.
- Integration settings page.

Done when:

- User sees “Outlook connected”.
- Access token refresh works.

---

## Phase 2 — Email Import

Build:

- Initial Inbox sync.
- Initial Sent Items sync.
- Email tables.
- Thread table.
- People table.
- Basic dashboard showing synced emails.

Done when:

- Recent emails appear in dashboard.
- Sent replies are recognized.

---

## Phase 3 — Delta Sync + Webhooks

Build:

- Delta sync cursor.
- Scheduled fallback sync.
- Graph webhook function.
- Subscription creation/renewal.
- Webhook event logging.
- Queue-based processing.

Done when:

- New emails appear without manual refresh.
- Missed webhook is recovered by cron delta sync.

---

## Phase 4 — Work Items + Follow-up Engine

Build:

- `work_items` table.
- Thread state calculator.
- Follow-up count.
- Waiting on manager/other detection.
- Rule-based priority score.
- Dashboard categories.

Done when:

- Manager can see “must reply”, “waiting on me”, “multiple follow-ups”.

---

## Phase 5 — AI Analysis

Build:

- AI prompt and schema.
- `ai_analyses` table.
- AI analysis queue.
- Work item updates from AI output.
- User-visible urgency reason.
- AI cost/token tracking.

Done when:

- Each important work item has summary, category, reason, suggested action.

---

## Phase 6 — Manual Tasks + Reminders

Build:

- Quick add task UI.
- AI task parser.
- Task table.
- Reminder table.
- Reminder cron processor.
- Dashboard reminder notifications.
- Snooze/done actions.

Done when:

- Manager can type natural language tasks and get reminders.

---

## Phase 7 — Draft Replies

Build:

- Draft generation UI.
- Draft prompt.
- Draft storage.
- Edit draft.
- Approve send.
- Send through Graph.
- Audit log.
- Learn from edits later.

Done when:

- Manager can generate, edit, approve, and send an email reply.

---

## Phase 8 — Memory and Behavior Learning

Build:

- Memory table.
- Rules table.
- Memory settings UI.
- “Remember this” buttons.
- “Forget this” buttons.
- VIP people.
- Delegation rules.
- Tone preferences.
- pgvector embeddings.
- Memory retrieval in AI analysis/drafting.

Done when:

- Manager can teach the assistant preferences and see them affect future output.

---

## Phase 9 — Daily Brief and Polishing

Build:

- Daily brief generator.
- Brief page/card.
- “You are blocking” section.
- “Suggested first action”.
- UI polish.
- Empty states.
- Error states.
- Health page.

Done when:

- Manager gets a useful daily summary and feels the product is polished.

---

## Phase 10 — Teams Integration Later

Start simple. Do not begin with tenant-wide Teams monitoring.

Recommended order:

1. **Teams notification bot**

   - Send proactive daily brief/reminders to manager.
   - Requires bot installation/conversation reference.

2. **Bot mentions**

   - Bot receives messages where it is @mentioned.
   - Lower permission complexity.

3. **Selected chats/channels**

   - Manager chooses specific chats/channels to monitor.
   - Use delegated permissions or resource-specific consent where possible.

4. **Wider Teams message monitoring**
   - Requires admin consent and stronger compliance review.

Done when:

- Teams can send reminders/daily brief.
- Later, Teams messages can become work items.

---

## Phase 11 — Multi-user SaaS Later

When turning into a product for many users:

Build:

- Tenant onboarding.
- Organization table.
- User roles.
- Admin consent flow.
- Per-user / per-tenant isolation.
- Usage limits.
- Billing plan.
- Data retention controls.
- Admin dashboard.
- Support impersonation with audit.
- Tenant-specific encryption keys if needed.

Schema additions:

```txt
organizations
organization_members
tenants
billing_customers
usage_events
admin_consent_records
data_retention_policies
```

Multi-user rule:

> Design from the beginning with `user_id` on all data, but do not complicate the MVP with full organizations until needed.

---

## 26. API / Route Design

### 26.1 Next.js Routes

```txt
GET  /dashboard
GET  /work-items
GET  /work-items/[id]
GET  /settings/integrations
GET  /settings/memory
GET  /settings/rules
GET  /daily-brief
GET  /admin/health

GET  /api/integrations/microsoft/start
GET  /api/integrations/microsoft/callback
POST /api/integrations/microsoft/disconnect
POST /api/work-items/[id]/snooze
POST /api/work-items/[id]/done
POST /api/work-items/[id]/feedback
POST /api/tasks/quick-add
POST /api/drafts/[id]/approve
POST /api/drafts/[id]/send
```

For sensitive server actions, use server routes/server actions that verify user session and call Supabase securely.

### 26.2 Supabase Edge Function Endpoints

```txt
POST /functions/v1/graph-webhook
POST /functions/v1/outlook-initial-sync
POST /functions/v1/outlook-delta-sync
POST /functions/v1/process-email-thread
POST /functions/v1/ai-analyze-work-item
POST /functions/v1/parse-manual-task
POST /functions/v1/process-reminders
POST /functions/v1/generate-daily-brief
POST /functions/v1/create-draft-reply
POST /functions/v1/send-approved-email
POST /functions/v1/memory-update
POST /functions/v1/memory-embed
POST /functions/v1/renew-graph-subscriptions
POST /functions/v1/integration-health-check
```

---

## 27. Component Design

### 27.1 Frontend Components

```txt
DashboardHeader
QuickAddTask
DailyBriefCard
CriticalSummaryCards
WorkItemList
WorkItemCard
PriorityBadge
CategoryBadge
SourceIcon
WorkItemDetailDrawer
ThreadTimeline
AiReasonPanel
DraftReplyEditor
ReminderEditor
MemorySuggestionCard
IntegrationStatusCard
HealthStatusPanel
```

### 27.2 Server Utilities

```txt
getCurrentUser
requireUser
createSupabaseServerClient
createServiceRoleClient
getGraphAccessTokenForUser
refreshGraphTokenIfNeeded
auditLog
enqueueJob
```

### 27.3 Shared Packages

```txt
packages/shared/schemas/work-item.ts
packages/shared/schemas/ai-analysis.ts
packages/shared/constants/categories.ts
packages/graph/client.ts
packages/graph/types.ts
packages/ai/prompts/analyze-work-item.ts
packages/ai/prompts/draft-reply.ts
packages/ai/schemas.ts
```

---

## 28. Coding Standards for Codex

When using Codex later, implement one phase at a time.

### 28.1 General Rules for Codex

- Do not implement all phases at once.
- Always create migrations before code that depends on tables.
- Keep functions small.
- Add tests for logic-heavy modules.
- Use TypeScript types everywhere.
- Do not hardcode model names.
- Do not hardcode domains or user IDs.
- Do not expose secrets to frontend.
- Add audit logs for sensitive actions.
- Add TODO comments only when linked to a phase.

### 28.2 Codex Task Template

Use this format:

```md
Implement Phase X: <name>

Context:

- This project is AI Chief of Staff / Executive Work Radar.
- Stack: Next.js, Supabase, Edge Functions, Microsoft Graph.
- Follow docs/technical-plan.md.

Scope:

- Implement only the tasks listed below.

Tasks:

1. ...
2. ...
3. ...

Acceptance criteria:

- ...

Constraints:

- Do not change unrelated files.
- Do not expose secrets.
- Add tests for pure logic.
```

### 28.3 First Codex Tasks

#### Task 1 — Create Base Schema

```md
Implement the initial Supabase migrations for profiles, integrations, email tables, work_items, ai_analyses, reminders, draft_replies, manager_rules, manager_memories, audit_logs, and webhook_events. Enable RLS on all public tables. Add user-owned select/insert/update/delete policies where appropriate. Keep graph_tokens in private schema with no public RLS exposure.
```

#### Task 2 — Build Dashboard Shell

```md
Create the authenticated dashboard shell in Next.js with placeholder sections: Critical, Waiting on Me, Follow-up Risk, Drafts, Reminders, and FYI. Use Supabase auth session. No real Graph data yet.
```

#### Task 3 — Microsoft OAuth

```md
Implement Microsoft Graph OAuth start/callback flow. Store integration and encrypted refresh token. Add settings page card showing connection status. Add server utility to refresh access token.
```

#### Task 4 — Initial Email Sync

```md
Implement outlook-initial-sync Edge Function. Sync Inbox and Sent Items from Microsoft Graph for the last 30 days. Upsert email_messages, email_threads, people, and create basic work_items. No AI yet.
```

#### Task 5 — Follow-up Engine

```md
Implement pure TypeScript thread state calculator with unit tests. It should detect latest inbound/outbound, waiting_on_manager, waiting_on_other, inbound_after_last_outbound_count, and followup_count.
```

#### Task 6 — AI Analysis Queue

```md
Implement ai_analysis queue processing and AI output schema validation. Update work_items with summary, category, urgency, priority_score, suggested_action, and user_visible_reason.
```

---

## 29. Risk Register

### Risk 1 — Microsoft Graph Permissions Complexity

Teams and some mail operations may require admin consent.

Mitigation:

- Start with delegated Outlook scopes.
- Add Teams later.
- Ask admin consent only when feature requires it.

### Risk 2 — Webhook Missed Notifications

Graph webhooks can fail or subscriptions can expire.

Mitigation:

- Always run scheduled delta sync fallback.
- Renew subscriptions early.
- Add health checks.

### Risk 3 — Edge Function Runtime Limits

Long tasks may timeout.

Mitigation:

- Use queues.
- Process small batches.
- Requeue continuation jobs.
- Avoid full mailbox import in one invocation.

### Risk 4 — AI Misclassification

AI may mark something urgent incorrectly.

Mitigation:

- Combine deterministic rules and AI.
- Let user correct priority.
- Show reason.
- Use feedback to improve rules.

### Risk 5 — Unsafe Email Sending

AI could draft incorrect or risky email.

Mitigation:

- Draft-first.
- Human approval required.
- Sensitive topic warnings.
- Audit log.

### Risk 6 — Sensitive Data Handling

Emails contain confidential company information.

Mitigation:

- Data minimization.
- RLS.
- Token encryption.
- Audit logs.
- Avoid attachments in MVP.
- Clear delete/disconnect flow.

### Risk 7 — Time Zone Errors

Reminders and deadlines can be wrong.

Mitigation:

- Store all timestamps in UTC.
- Store user timezone.
- Pass timezone into AI prompts.
- Show absolute date/time in confirmation UI.

### Risk 8 — Cost Growth

AI analysis for every email can become expensive.

Mitigation:

- Analyze only likely important items.
- Use rules to filter newsletters/automated emails.
- Use hashes to avoid reanalysis.
- Track token usage.

---

## 30. Production Readiness Checklist

### Security

- [ ] RLS enabled on all public tables.
- [ ] Service role never exposed to browser.
- [ ] Microsoft tokens encrypted.
- [ ] Graph webhook validates `clientState`.
- [ ] Audit logs exist for sensitive actions.
- [ ] Disconnect/delete data flow exists.
- [ ] Scopes are least privilege.
- [ ] Draft-send approval required.

### Reliability

- [ ] Delta sync fallback enabled.
- [ ] Graph subscription renewal enabled.
- [ ] Queue failures visible.
- [ ] Retry handling for Graph/OpenAI.
- [ ] Health page exists.
- [ ] Manual “Sync now” button exists.

### UX

- [ ] Dashboard loads quickly.
- [ ] Work item reasons are understandable.
- [ ] Empty states are clear.
- [ ] User can correct AI.
- [ ] Memory review page exists.
- [ ] Drafts are editable before send.

### AI

- [ ] Structured output validated.
- [ ] Prompt version stored.
- [ ] Cost/token usage stored.
- [ ] Sensitive topics flagged.
- [ ] No hidden chain-of-thought stored.

### Deployment

- [ ] Vercel env vars configured.
- [ ] Supabase secrets configured.
- [ ] Microsoft redirect URIs configured.
- [ ] Supabase cron jobs installed.
- [ ] Edge Functions deployed.
- [ ] Webhook endpoint tested.

---

## 31. Future Feature Ideas

### 31.1 Meeting Prep Pack

Before meetings, prepare:

- Attendees.
- Last email threads.
- Open work items.
- Previous commitments.
- Questions to ask.
- Decisions needed.

Requires calendar integration.

### 31.2 Commitment Extractor

Detect promises:

```txt
I will send it tomorrow.
Let me check and get back to you.
We will confirm next week.
I’ll ask finance.
```

Then create hidden work item:

```txt
You promised to send pricing to Client X by Thursday.
```

### 31.3 Relationship Heatmap

Show people/projects:

```txt
Green: no open risk
Yellow: waiting / due soon
Red: multiple unanswered follow-ups
```

### 31.4 Clean Inbox Mode

AI groups emails into:

```txt
Reply now
Delegate
Archive
Read later
Create task
Waiting on someone
Newsletter
```

Requires explicit approval before applying actions.

### 31.5 Weekly Executive Review

Weekly report:

- Completed tasks.
- Missed follow-ups.
- Longest unanswered important threads.
- People waiting on manager.
- Recurring bottlenecks.
- Suggested automations.

### 31.6 Smart Delegation

AI suggests delegate and drafts message:

```txt
Hi Rania, can you please check this supplier payment request and update me by tomorrow?
```

Requires manager approval.

### 31.7 Outlook Rules Automation

AI suggests rules:

```txt
Move newsletters to low priority.
Mark CEO as VIP.
Flag client contract emails.
```

Requires approval and `MailboxSettings.ReadWrite`.

---

## 32. Final Recommended MVP Definition

The best first version is:

```txt
A private web-based AI Chief of Staff for one manager, connected to Outlook, powered by Supabase and Vercel, that detects urgent emails, multiple follow-ups, people waiting on the manager, manual tasks, reminders, AI-drafted replies, and manager-specific memory/rules.
```

The first version is successful if the manager can say:

```txt
I no longer need to scan my inbox to know what matters today.
```

---

## 33. Immediate Next Step When Development Starts

Start with:

1. Create repo and Supabase migrations.
2. Build dashboard shell.
3. Implement Microsoft OAuth.
4. Sync Inbox/Sent Items.
5. Build follow-up engine.
6. Add AI analysis.

Do not start with Teams. Do not start with auto-send. Do not start with multi-user SaaS.

Build the reliable Outlook MVP first, then expand.
