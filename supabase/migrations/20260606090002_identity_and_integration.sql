-- Migration: identity and integration tables
-- Phase 1 — Database Foundation
--
-- profiles, user_integrations, mailboxes, private.graph_tokens, sync_cursors.
--
-- Identity rule (docs/database/portability-and-email-migration.md):
--   profiles.id          = app user identity (references auth.users)
--   user_integrations.id = a connected provider account (e.g. Microsoft Graph)
--   mailboxes.id         = a specific Microsoft mailbox
-- Email addresses are display-only and never used as ownership identity.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,                       -- display only; NOT identity
  full_name text,
  timezone text not null default 'UTC',
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application user profile. id mirrors auth.users.id and is the app identity. email is display-only.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_integrations — one connected provider account for a user
-- ---------------------------------------------------------------------------
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'microsoft',
  status text not null default 'connected',     -- connected | disconnected | error | reauth_required
  provider_user_id text,                         -- Graph "id" of the signed-in user
  provider_tenant_id text,
  provider_email text,                           -- display only
  scopes text[] not null default '{}',
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_integrations is 'A connected provider account (Microsoft Graph). Provider identity, not email, links the user to the provider.';

create index user_integrations_user_id_idx on public.user_integrations (user_id);
create unique index user_integrations_user_provider_account_idx
  on public.user_integrations (user_id, provider, provider_user_id);

create trigger user_integrations_set_updated_at
  before update on public.user_integrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- mailboxes — one Microsoft mailbox connected through an integration
-- ---------------------------------------------------------------------------
create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  integration_id uuid not null references public.user_integrations (id) on delete cascade,
  provider text not null default 'microsoft',
  provider_tenant_id text,
  provider_user_id text,
  mailbox_email text,
  mailbox_display_name text,
  mailbox_type text not null default 'primary',  -- primary | shared | alias | previous
  aliases text[] not null default '{}',
  status text not null default 'active',         -- active | disconnected | archived | transfer_pending
  connected_at timestamptz,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, provider_user_id, mailbox_email)
);

comment on table public.mailboxes is 'A specific Microsoft mailbox. Email data is keyed by mailbox_id to support reconnecting/moving mailboxes later.';

create index mailboxes_user_id_idx on public.mailboxes (user_id);
create index mailboxes_integration_id_idx on public.mailboxes (integration_id);

create trigger mailboxes_set_updated_at
  before update on public.mailboxes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- private.graph_tokens — encrypted Microsoft tokens (service-only)
-- ---------------------------------------------------------------------------
create table private.graph_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.user_integrations (id) on delete cascade,
  encrypted_access_token text,
  encrypted_refresh_token text,
  access_token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id)
);

comment on table private.graph_tokens is 'Encrypted Microsoft Graph tokens. Lives in the private schema; no browser/anon/authenticated access. Service role / Edge Functions only.';

create trigger graph_tokens_set_updated_at
  before update on private.graph_tokens
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sync_cursors — delta sync cursor per mailbox resource/folder
-- ---------------------------------------------------------------------------
create table public.sync_cursors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  integration_id uuid references public.user_integrations (id) on delete cascade,
  mailbox_id uuid references public.mailboxes (id) on delete cascade,
  provider text not null default 'microsoft',
  resource_type text not null,                   -- e.g. messages | mailFolders
  resource_id text,                              -- e.g. folder id
  delta_link text,
  next_link text,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sync_cursors is 'Delta sync cursors scoped by mailbox/resource. User may read status; only service role writes.';

create index sync_cursors_user_id_idx on public.sync_cursors (user_id);
create unique index sync_cursors_resource_idx
  on public.sync_cursors (mailbox_id, resource_type, resource_id);

create trigger sync_cursors_set_updated_at
  before update on public.sync_cursors
  for each row execute function public.set_updated_at();
