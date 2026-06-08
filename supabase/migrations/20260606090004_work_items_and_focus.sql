-- Migration: work_items and focus tables
-- Phase 1 — Database Foundation
--
-- work_items (the table the dashboard mainly reads), commitments,
-- focus_sessions, focus_session_items.

-- ---------------------------------------------------------------------------
-- work_items — unified actionable items
-- ---------------------------------------------------------------------------
create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  integration_id uuid references public.user_integrations (id) on delete set null,
  mailbox_id uuid references public.mailboxes (id) on delete set null,
  source text not null,                          -- outlook | teams | manual | ai_commitment | calendar
  source_id uuid,                                -- internal row id of the source (e.g. email_messages.id)
  source_external_id text,                       -- external id (e.g. Graph message id)
  thread_id uuid references public.email_threads (id) on delete set null,
  title text not null,
  summary text,
  category text,                                 -- critical | waiting | followup | delegate | decision | promise | fyi
  status text not null default 'open',           -- open | snoozed | done | dismissed
  urgency text,
  priority_score integer not null default 0,
  due_at timestamptz,
  snoozed_until timestamptz,
  completed_at timestamptz,
  assigned_to text,
  related_person_id uuid references public.people (id) on delete set null,
  related_project_id uuid references public.projects (id) on delete set null,
  requires_reply boolean not null default false,
  requires_decision boolean not null default false,
  requires_approval boolean not null default false,
  can_delegate boolean not null default false,
  suggested_delegate text,
  suggested_action text,
  urgency_reason text,                           -- user-visible reasoning only
  confidence numeric(4, 3),
  last_analyzed_at timestamptz,
  analysis_version integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.work_items is 'Unified actionable items; the main table the dashboard reads. May link to a mailbox or be mailbox-independent.';

-- Indexes mandated by docs/reference/database/schema-v1.md for dashboard/sort queries.
create index work_items_dashboard_idx
  on public.work_items (user_id, status, priority_score desc, due_at asc nulls last);
create index work_items_category_idx
  on public.work_items (user_id, category, status);
create index work_items_source_external_idx
  on public.work_items (mailbox_id, source_external_id);

create trigger work_items_set_updated_at
  before update on public.work_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- commitments — promise / commitment tracker
-- ---------------------------------------------------------------------------
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  source text,
  source_id text,
  commitment_type text,                          -- manager_promised | other_promised | requested_from_manager | requested_from_other
  promisor_name text,
  promisor_email text,
  owner_user_id uuid references public.profiles (id) on delete set null,
  commitment_text text not null,
  due_at timestamptz,
  status text not null default 'open',           -- open | done | cancelled | overdue | waiting
  confidence numeric(4, 3),
  extracted_from_quote text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.commitments is 'First-class promise/commitment tracker. User-owned; links to a work item/source.';

create index commitments_user_id_idx on public.commitments (user_id);
create index commitments_work_item_idx on public.commitments (work_item_id);
create index commitments_status_idx on public.commitments (user_id, status, due_at);

create trigger commitments_set_updated_at
  before update on public.commitments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- focus_sessions — Clear My Day sessions
-- ---------------------------------------------------------------------------
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz,
  ended_at timestamptz,
  target_minutes integer,
  estimated_total_minutes integer,
  status text not null default 'active',          -- active | completed | abandoned
  summary text,
  created_at timestamptz not null default now()
);

comment on table public.focus_sessions is 'Focus Mode (Clear My Day) sessions. User-owned.';

create index focus_sessions_user_id_idx on public.focus_sessions (user_id);

-- ---------------------------------------------------------------------------
-- focus_session_items — ordered items within a focus session
-- ---------------------------------------------------------------------------
create table public.focus_session_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.focus_sessions (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  position integer not null default 0,
  estimated_minutes integer,
  recommended_action text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.focus_session_items is 'Ordered work items inside a focus session. User-owned.';

create index focus_session_items_user_id_idx on public.focus_session_items (user_id);
create index focus_session_items_session_idx
  on public.focus_session_items (session_id, position);
