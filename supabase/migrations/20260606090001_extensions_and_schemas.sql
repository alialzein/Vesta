-- Migration: extensions and private schema
-- Phase 1 — Database Foundation
--
-- Sets up the extensions and the private schema used by later migrations.
-- - pgcrypto: gen_random_uuid() for primary keys.
-- - vector (pgvector): embedding column on manager_memories.
-- - private schema: holds graph_tokens, never exposed to browser clients.

-- Extensions live in the standard "extensions" schema on Supabase.
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema extensions;

-- Private schema for sensitive, service-only data (Microsoft tokens).
-- No RLS policies are ever added here; only the service role / Edge Functions
-- may read or write. The anon and authenticated roles get no access.
create schema if not exists private;

revoke all on schema private from anon, authenticated;

-- Shared trigger function to maintain updated_at columns.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
