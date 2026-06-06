-- Migration: work source tables
-- Phase 1 — Database Foundation
--
-- people, projects, email_threads, email_messages.
-- Email data is keyed by mailbox_id (+ Graph IDs), never by email string,
-- for portability (docs/database/portability-and-email-migration.md).

-- ---------------------------------------------------------------------------
-- people — known senders/contacts (user-owned, survives mailbox change)
-- ---------------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text,
  email text,
  domain text,
  company text,
  is_vip boolean not null default false,
  vip_reason text,
  default_priority_boost integer not null default 0,
  relationship_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.people is 'People known to the manager. User-owned; survives mailbox change. email is an attribute, not identity.';

create index people_user_id_idx on public.people (user_id);
create unique index people_user_email_idx on public.people (user_id, email);

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects — projects/clients/topics used for prioritization
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  priority_boost integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is 'Projects/clients/topics for prioritization. User-owned and mailbox-independent.';

create index projects_user_id_idx on public.projects (user_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email_threads — grouped Outlook conversation
-- ---------------------------------------------------------------------------
create table public.email_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  integration_id uuid references public.user_integrations (id) on delete set null,
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  graph_conversation_id text not null,
  subject_normalized text,
  participants jsonb not null default '[]'::jsonb,
  latest_message_at timestamptz,
  latest_inbound_at timestamptz,
  latest_outbound_at timestamptz,
  inbound_after_last_outbound_count integer not null default 0,
  followup_count integer not null default 0,
  is_waiting_on_manager boolean not null default false,
  is_waiting_on_other boolean not null default false,
  thread_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mailbox_id, graph_conversation_id)
);

comment on table public.email_threads is 'Outlook conversation grouped per mailbox. Unique by (mailbox_id, graph_conversation_id) for portability.';

create index email_threads_user_id_idx on public.email_threads (user_id);
create index email_threads_mailbox_idx on public.email_threads (mailbox_id);
create index email_threads_waiting_idx
  on public.email_threads (user_id, is_waiting_on_manager);

create trigger email_threads_set_updated_at
  before update on public.email_threads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email_messages — Outlook messages stored locally
-- ---------------------------------------------------------------------------
create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  integration_id uuid references public.user_integrations (id) on delete set null,
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  thread_id uuid references public.email_threads (id) on delete set null,
  graph_message_id text not null,
  graph_folder_id text,
  graph_conversation_id text,
  internet_message_id text,
  conversation_index text,
  direction text,                                -- inbound | outbound
  subject text,
  body_preview text,
  body_text text,
  body_html text,
  sender_name text,
  sender_email text,
  from_email text,
  to_recipients jsonb not null default '[]'::jsonb,
  cc_recipients jsonb not null default '[]'::jsonb,
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
  unique (mailbox_id, graph_message_id)
);

comment on table public.email_messages is 'Outlook messages stored locally. Unique by (mailbox_id, graph_message_id), never (user_id, graph_message_id), for portability.';

create index email_messages_user_id_idx on public.email_messages (user_id);
create index email_messages_mailbox_idx on public.email_messages (mailbox_id);
create index email_messages_thread_idx on public.email_messages (thread_id);
create index email_messages_received_idx
  on public.email_messages (mailbox_id, received_at desc);

create trigger email_messages_set_updated_at
  before update on public.email_messages
  for each row execute function public.set_updated_at();
