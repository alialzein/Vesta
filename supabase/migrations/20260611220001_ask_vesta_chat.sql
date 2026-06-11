-- Migration: Ask Vesta chat v1 (owner pre-approved 2026-06-11 — "you are
-- allowed to create anything on DB" for the Ask Vesta feature)
--
-- Two lean tables:
--   * chat_conversations: one row per conversation thread with Vesta.
--   * chat_messages: the turns (user + assistant), with what Vesta chose to
--     remember from each turn recorded in metadata.learned.
--
-- The learning itself lands in the EXISTING manager_memories table
-- (source='chat'), so everything Vesta learns is visible and deletable in
-- Memory & Rules. No changes to existing tables.
--
-- RLS: own-rows CRUD, same pattern as the other owned tables.

-- ---------------------------------------------------------------------------
-- chat_conversations — one thread of the manager talking with Vesta
-- ---------------------------------------------------------------------------
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New conversation',
  last_message_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chat_conversations is
  'Ask Vesta chat threads. User-owned; survives mailbox change.';

create index chat_conversations_user_recent_idx
  on public.chat_conversations (user_id, last_message_at desc);

create trigger chat_conversations_set_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- chat_messages — the turns inside a conversation
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,                                -- 'user' | 'assistant'
  content text not null,
  metadata jsonb not null default '{}'::jsonb,       -- { learned: string[], model, prompt_version }
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is
  'Ask Vesta chat turns. metadata.learned records what Vesta saved to memory from the turn. User-owned.';

create index chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS — own-rows CRUD (mirror of the briefing/owned-tables policy)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  owned_tables text[] := array['chat_conversations', 'chat_messages'];
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
