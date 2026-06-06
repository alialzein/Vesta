-- Migration: Row Level Security
-- Phase 1 — Database Foundation
--
-- Enables RLS on every public table and applies policies per
-- docs/database/rls-security-rules.md:
--   * User-owned tables  -> own-rows pattern (select/insert/update/delete).
--   * Service-write tables -> users may SELECT own rows (where sensible),
--     but inserts/updates/deletes happen via the service role (which bypasses
--     RLS). Raw event tables get no read policy at all.
--   * private.graph_tokens -> NO policies; protected by the private schema and
--     revoked grants. Service role / Edge Functions only.

-- ===========================================================================
-- Helper: standard own-rows policies for a user-owned table.
-- (Written inline per-table for clarity and auditability.)
-- ===========================================================================

-- profiles: a profile row is keyed by id = auth.uid() (not a user_id column).
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- No delete policy: profile deletion is handled via auth.users cascade only.

-- ---------------------------------------------------------------------------
-- User-owned tables with a user_id column: full own-rows CRUD.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  owned_tables text[] := array[
    'user_integrations',
    'mailboxes',
    'people',
    'projects',
    'email_threads',
    'email_messages',
    'work_items',
    'commitments',
    'focus_sessions',
    'focus_session_items',
    'ai_analyses',
    'tasks',
    'reminders',
    'draft_replies',
    'manager_rules',
    'manager_memories',
    'feedback_events',
    'notification_events',
    'daily_briefs'
  ];
begin
  foreach t in array owned_tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format($f$
      create policy "%1$s_select_own" on public.%1$I
        for select using (auth.uid() = user_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_insert_own" on public.%1$I
        for insert with check (auth.uid() = user_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_update_own" on public.%1$I
        for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_delete_own" on public.%1$I
        for delete using (auth.uid() = user_id);
    $f$, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service-write tables: enable RLS, allow users to SELECT their own rows for
-- status visibility, but NO insert/update/delete policies — those run via the
-- service role (which bypasses RLS). sync_cursors and audit_logs are scoped by
-- user_id; users can see their own status/history but cannot write it.
-- ---------------------------------------------------------------------------
alter table public.sync_cursors enable row level security;
create policy "sync_cursors_select_own" on public.sync_cursors
  for select using (auth.uid() = user_id);

alter table public.audit_logs enable row level security;
create policy "audit_logs_select_own" on public.audit_logs
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Raw/system event tables: RLS enabled, NO policies for app users at all.
-- Only the service role (bypasses RLS) may read or write these.
-- ---------------------------------------------------------------------------
alter table public.webhook_events enable row level security;
alter table public.account_transfer_events enable row level security;

-- ---------------------------------------------------------------------------
-- private.graph_tokens: RLS enabled with NO policies. Combined with the
-- private schema (grants revoked from anon/authenticated in migration 0001),
-- this means no browser client can ever read tokens. Service role only.
-- ---------------------------------------------------------------------------
alter table private.graph_tokens enable row level security;
