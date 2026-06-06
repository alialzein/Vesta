-- Migration: logs, briefs, notifications, webhooks, transfer events
-- Phase 1 — Database Foundation
--
-- audit_logs, notification_events, daily_briefs, webhook_events,
-- account_transfer_events.

-- ---------------------------------------------------------------------------
-- audit_logs — immutable-ish log of important actions
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  actor_type text not null default 'user',        -- user | service | system
  actor_id text,
  action text not null,                          -- e.g. email_sent, draft_approved, memory_created
  entity_type text,
  entity_id text,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Sensitive action history. User may read own rows; only service role writes. Needed for transfer audit.';

create index audit_logs_user_id_idx on public.audit_logs (user_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action, created_at desc);

-- ---------------------------------------------------------------------------
-- notification_events — dashboard/email/Teams/browser notifications
-- ---------------------------------------------------------------------------
create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  channel text not null,                         -- dashboard | email | teams | browser
  title text,
  body text,
  status text not null default 'pending',         -- pending | sent | failed | read
  sent_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.notification_events is 'Notification events across channels. User-owned.';

create index notification_events_user_id_idx on public.notification_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- daily_briefs — generated morning briefs
-- ---------------------------------------------------------------------------
create table public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brief_date date not null,
  title text,
  summary text,
  sections jsonb not null default '[]'::jsonb,
  generated_by_model text,
  created_at timestamptz not null default now(),
  unique (user_id, brief_date)
);

comment on table public.daily_briefs is 'Generated morning briefs, one per user per day. User-owned.';

create index daily_briefs_user_id_idx on public.daily_briefs (user_id, brief_date desc);

-- ---------------------------------------------------------------------------
-- webhook_events — raw external webhook event tracking (service-write)
-- ---------------------------------------------------------------------------
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'microsoft',
  subscription_id text,
  user_id uuid references public.profiles (id) on delete set null,
  integration_id uuid references public.user_integrations (id) on delete set null,
  mailbox_id uuid references public.mailboxes (id) on delete set null,
  event_type text,
  payload jsonb,
  status text not null default 'received',         -- received | processed | failed
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.webhook_events is 'Raw external webhook events for processing/replay/debug. Service-write only; users do not read raw events.';

create index webhook_events_status_idx on public.webhook_events (status, created_at);
create index webhook_events_subscription_idx on public.webhook_events (subscription_id);

-- ---------------------------------------------------------------------------
-- account_transfer_events — audit account/mailbox transfer
-- ---------------------------------------------------------------------------
create table public.account_transfer_events (
  id uuid primary key default gen_random_uuid(),
  requested_by_user_id uuid references public.profiles (id) on delete set null,
  source_user_id uuid references public.profiles (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  source_mailbox_id uuid references public.mailboxes (id) on delete set null,
  target_mailbox_id uuid references public.mailboxes (id) on delete set null,
  transfer_type text,                            -- new_mailbox | new_user | reattach
  status text not null default 'requested',        -- requested | approved | running | completed | failed | rolled_back
  reason text,
  before_counts jsonb,
  after_counts jsonb,
  approved_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.account_transfer_events is 'Audit/control for reassigning data between users or mailboxes. Service-controlled; requires explicit approval.';

create index account_transfer_events_status_idx
  on public.account_transfer_events (status, created_at desc);
