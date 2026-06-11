-- Migration: Personal Intelligence Brief v1 (owner-approved 2026-06-11)
--
-- Two lean tables:
--   * briefing_preferences: one row per manager — topics, companies, source
--     engine ('google_rss' | 'ai_search'), delivery knobs.
--   * briefing_items: the personalized, ranked items per day (with
--     save/dismiss status and a dedupe key so stories don't repeat).
--
-- RLS: own-rows CRUD, same pattern as the Phase 1 owned tables.

-- ---------------------------------------------------------------------------
-- briefing_preferences — what this manager cares about
-- ---------------------------------------------------------------------------
create table public.briefing_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default true,
  source_engine text not null default 'google_rss', -- 'google_rss' | 'ai_search'
  items_per_day integer not null default 8,
  languages text[] not null default array['en'],
  region text,                                       -- news region, e.g. 'AE', 'LB', 'US'
  topics text[] not null default '{}',               -- chosen + custom topics
  companies text[] not null default '{}',            -- company/clients/competitors/vendors
  blocked_sources text[] not null default '{}',
  tone text not null default 'executive',            -- 'executive' | 'detailed'
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.briefing_preferences is
  'Personal Intelligence Brief preferences — one row per manager. User-owned.';

create trigger briefing_preferences_set_updated_at
  before update on public.briefing_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- briefing_items — the personalized daily items
-- ---------------------------------------------------------------------------
create table public.briefing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brief_date date not null,
  rank integer not null default 0,
  title text not null,
  summary text,
  why_it_matters text,
  suggested_action text,
  category text,
  relevance_score integer,
  source_name text,
  source_url text,
  published_at timestamptz,
  status text not null default 'unread',             -- unread | read | saved | dismissed
  dedupe_key text,                                   -- normalized url/title hash
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.briefing_items is
  'Personalized daily briefing items (ranked, with manager save/dismiss state). User-owned.';

create index briefing_items_user_date_idx
  on public.briefing_items (user_id, brief_date desc, rank);

-- The same story (by dedupe key) is stored once per user across days.
create unique index briefing_items_user_dedupe_idx
  on public.briefing_items (user_id, dedupe_key)
  where dedupe_key is not null;

create trigger briefing_items_set_updated_at
  before update on public.briefing_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — own-rows CRUD (mirror of the Phase 1 owned-tables policy)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  owned_tables text[] := array['briefing_preferences', 'briefing_items'];
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
