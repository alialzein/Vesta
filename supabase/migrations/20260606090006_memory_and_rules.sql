-- Migration: memory and rules tables
-- Phase 1 — Database Foundation
--
-- manager_rules, manager_memories (pgvector), feedback_events.
-- All user-owned and intended to survive mailbox change.

-- ---------------------------------------------------------------------------
-- manager_rules — deterministic rules that can override/boost AI
-- ---------------------------------------------------------------------------
create table public.manager_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  is_enabled boolean not null default true,
  rule_type text,                                -- vip | delegation | tone | suppression | boost | ...
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  created_from text,                             -- manual | ai_suggested
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.manager_rules is 'Deterministic manager rules that override/boost AI. User-owned; survives mailbox change.';

create index manager_rules_user_id_idx on public.manager_rules (user_id);
create index manager_rules_enabled_idx on public.manager_rules (user_id, is_enabled);

create trigger manager_rules_set_updated_at
  before update on public.manager_rules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- manager_memories — softer semantic context for AI (pgvector)
-- ---------------------------------------------------------------------------
create table public.manager_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  memory_type text not null,                     -- vip | tone | delegation_rule | do_not_do | project_context | company_context | preference
  memory_text text not null,
  scope text,                                    -- global | person | project | company
  scope_ref text,
  source text not null default 'manual',          -- manual | ai_suggested
  confidence numeric(4, 3),
  is_active boolean not null default true,
  embedding extensions.vector(1536),             -- nullable until embedded by a later phase
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.manager_memories is 'Soft semantic memory the AI uses. User-owned; survives mailbox change. AI suggests; the manager approves (is_active).';

create index manager_memories_user_id_idx on public.manager_memories (user_id);
create index manager_memories_active_idx on public.manager_memories (user_id, is_active);

create trigger manager_memories_set_updated_at
  before update on public.manager_memories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- feedback_events — user corrections that teach Vesta
-- ---------------------------------------------------------------------------
create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  event_type text not null,                      -- priority_correction | category_correction | not_urgent | teach_ai | ...
  feedback_text text,
  old_value jsonb,
  new_value jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.feedback_events is 'User corrections that teach Vesta. User-owned.';

create index feedback_events_user_id_idx on public.feedback_events (user_id);
create index feedback_events_work_item_idx on public.feedback_events (work_item_id);
