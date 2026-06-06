-- Migration: AI analysis and action tables
-- Phase 1 — Database Foundation
--
-- ai_analyses, tasks, reminders, draft_replies.

-- ---------------------------------------------------------------------------
-- ai_analyses — history of AI classification/analysis
-- ---------------------------------------------------------------------------
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete cascade,
  source_hash text,
  model text,
  prompt_version text,
  input_summary text,
  output jsonb,
  priority_score integer,
  category text,
  urgency text,
  user_visible_reason text,                      -- store user-visible reasoning ONLY, no hidden chain-of-thought
  confidence numeric(4, 3),
  token_input integer,
  token_output integer,
  cost_estimate_usd numeric(10, 6),
  error text,
  created_at timestamptz not null default now()
);

comment on table public.ai_analyses is 'History of AI analysis per work item. Stores user-visible reasoning only; no hidden chain-of-thought.';

create index ai_analyses_user_id_idx on public.ai_analyses (user_id);
create index ai_analyses_work_item_idx on public.ai_analyses (work_item_id, created_at desc);

-- ---------------------------------------------------------------------------
-- tasks — manual or AI-parsed tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'open',           -- open | done | cancelled
  source text not null default 'manual',          -- manual | ai_parsed
  parsed_from_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tasks is 'Manual or AI-parsed tasks. User-owned.';

create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_status_idx on public.tasks (user_id, status, due_at);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reminders — reminder scheduler
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  title text not null,
  remind_at timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled',       -- scheduled | sent | snoozed | cancelled | done
  recurrence_rule text,
  delivery_channels text[] not null default '{}',
  last_sent_at timestamptz,
  snoozed_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reminders is 'Reminder scheduler. remind_at stored in UTC; timezone column for user-facing display.';

create index reminders_user_id_idx on public.reminders (user_id);
create index reminders_due_idx on public.reminders (status, remind_at);

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- draft_replies — AI drafts and send-approval workflow
-- ---------------------------------------------------------------------------
create table public.draft_replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  email_message_id uuid references public.email_messages (id) on delete set null,
  graph_draft_message_id text,
  status text not null default 'draft',           -- draft | edited | approved | sent | failed | discarded
  to_recipients jsonb not null default '[]'::jsonb,
  cc_recipients jsonb not null default '[]'::jsonb,
  subject text,
  body_text text,
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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.draft_replies is 'AI draft replies and the approve-before-send workflow. Auto-send is forbidden until an explicitly approved later phase.';

create index draft_replies_user_id_idx on public.draft_replies (user_id);
create index draft_replies_work_item_idx on public.draft_replies (work_item_id);
create index draft_replies_status_idx on public.draft_replies (user_id, status);

create trigger draft_replies_set_updated_at
  before update on public.draft_replies
  for each row execute function public.set_updated_at();
