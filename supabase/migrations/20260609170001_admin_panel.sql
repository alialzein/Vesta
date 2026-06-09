-- Migration: Admin Panel (Operator Console) — Wave 1
--
-- Adds the operator-only configuration + observability surface used by /admin:
--   * profiles: account-suspend fields (+ role='admin' convention for access).
--   * is_admin(): SECURITY DEFINER helper used by admin-only RLS policies.
--   * app_settings: global operator config (single row).
--   * user_settings: per-user overrides of those defaults.
--   * ai_usage: unified per-call AI usage/cost ledger (all features).
--   * purge_jobs: audit of retention / soft-delete / manual-wipe runs.
--
-- All four new tables are operator-only (is_admin()); the app writes via the
-- service role after an in-app admin check, so RLS here is defense-in-depth.
-- See docs/plans/admin-panel-plan.md.

-- ---------------------------------------------------------------------------
-- profiles: account suspend (admin-controlled). role already exists.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

comment on column public.profiles.role is
  'Application role. NULL/''user'' = normal manager; ''admin'' = operator-console (/admin) access.';
comment on column public.profiles.suspended is
  'When true, the user is blocked from using the app (admin-controlled).';

-- ---------------------------------------------------------------------------
-- is_admin(uid): true when the user has role='admin'. SECURITY DEFINER so it can
-- read profiles regardless of the caller's RLS (no recursion: it bypasses the
-- profiles policies). Used by the admin-only policies below.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- app_settings: global operator config. Single row (id = true). The admin panel
-- edits this; runtime reads it as defaults layered over env. NULL = "use env".
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true,
  -- Email data / retention
  initial_scan_back_days integer not null default 7,   -- first-connect import window
  retention_months integer,                            -- null = keep forever
  soft_delete_grace_days integer not null default 30,  -- purge deleted_at after N days
  -- AI provider / model (per task; null = fall back to global/env)
  ai_provider text,
  ai_model text,
  ai_model_analysis text,
  ai_model_draft text,
  ai_max_per_run integer,
  ai_max_per_day integer,
  ai_price_input numeric(12, 4),                       -- USD per 1M input tokens
  ai_price_output numeric(12, 4),                      -- USD per 1M output tokens
  ai_daily_cost_cap_usd numeric(12, 2),                -- global daily spend cap
  reply_intent_mode text,                              -- pregate_ai|ai_always|heuristic|off
  draft_send_mode text,                                -- graph|draft_only
  feature_flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint app_settings_singleton check (id)
);

comment on table public.app_settings is
  'Global operator config (single row). Admin-panel editable; runtime reads as defaults over env.';

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- user_settings: per-user overrides of the global defaults.
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  initial_scan_back_days integer,
  retention_months integer,
  reply_intent_mode text,
  draft_send_mode text,
  ai_daily_cost_cap_usd numeric(12, 2),
  ai_paused boolean not null default false,            -- stop AI spend for this user
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

comment on table public.user_settings is
  'Per-user overrides of app_settings defaults (retention, AI mode, budgets).';

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_usage: unified per-call AI ledger across every feature. Broader than
-- ai_analyses (which only covers analysis) so all AI cost lands in one place.
-- Service-write (bypasses RLS); admin-read (+ owner-read of own rows).
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  feature text not null,                  -- analysis|draft|reply_intent|brief|triage|other
  provider text,
  model text,
  token_input integer not null default 0,
  token_output integer not null default 0,
  request_count integer not null default 1,
  cost_estimate_usd numeric(12, 6),
  work_item_id uuid references public.work_items (id) on delete set null,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.ai_usage is
  'Per-call AI usage ledger across all features (tokens, cost). Service-write, admin-read.';

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
create index ai_usage_created_idx on public.ai_usage (created_at desc);
create index ai_usage_feature_idx on public.ai_usage (feature, created_at desc);

-- ---------------------------------------------------------------------------
-- purge_jobs: record of retention / soft-delete / manual-wipe runs.
-- ---------------------------------------------------------------------------
create table public.purge_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                     -- retention|soft_delete|manual_wipe
  user_id uuid references public.profiles (id) on delete set null,  -- null = global
  status text not null default 'done',    -- pending|running|done|error
  rows_affected integer not null default 0,
  params jsonb not null default '{}'::jsonb,
  error text,
  created_by uuid references public.profiles (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

comment on table public.purge_jobs is
  'Audit of email retention/purge/wipe runs (admin-triggered or scheduled).';

create index purge_jobs_created_idx on public.purge_jobs (started_at desc);

-- ---------------------------------------------------------------------------
-- RLS — operator-only (defense-in-depth; app writes via the service role).
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
create policy "app_settings_admin_all" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.user_settings enable row level security;
create policy "user_settings_admin_all" on public.user_settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

alter table public.ai_usage enable row level security;
create policy "ai_usage_admin_select" on public.ai_usage
  for select using (public.is_admin());
create policy "ai_usage_select_own" on public.ai_usage
  for select using (auth.uid() = user_id);

alter table public.purge_jobs enable row level security;
create policy "purge_jobs_admin_select" on public.purge_jobs
  for select using (public.is_admin());
