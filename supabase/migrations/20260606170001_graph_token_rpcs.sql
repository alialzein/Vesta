-- Migration: graph token access RPCs (Phase 3 — Outlook connection)
--
-- private.graph_tokens is not exposed through PostgREST (by design), so the app
-- reads/writes it via SECURITY DEFINER functions in the public schema. Execute
-- is REVOKED from anon/authenticated and GRANTED only to service_role — so only
-- the server (Edge Functions / server routes using the service-role key) can
-- touch encrypted tokens; browser clients never can.
--
-- Tokens are stored already-encrypted by the app (AES-256-GCM); these functions
-- only move opaque ciphertext in/out.

-- Upsert (one token row per integration).
create or replace function public.upsert_graph_token(
  p_integration_id uuid,
  p_access text,
  p_refresh text,
  p_expires timestamptz,
  p_scopes text[]
)
returns void
language plpgsql
security definer
set search_path = private, public
as $$
begin
  insert into private.graph_tokens as gt (
    integration_id, encrypted_access_token, encrypted_refresh_token,
    access_token_expires_at, granted_scopes, updated_at
  )
  values (p_integration_id, p_access, p_refresh, p_expires, coalesce(p_scopes, '{}'), now())
  on conflict (integration_id) do update set
    encrypted_access_token = excluded.encrypted_access_token,
    encrypted_refresh_token = coalesce(excluded.encrypted_refresh_token, gt.encrypted_refresh_token),
    access_token_expires_at = excluded.access_token_expires_at,
    granted_scopes = excluded.granted_scopes,
    updated_at = now();
end;
$$;

-- Fetch the encrypted token row for an integration.
create or replace function public.get_graph_token(p_integration_id uuid)
returns table (
  encrypted_access_token text,
  encrypted_refresh_token text,
  access_token_expires_at timestamptz,
  granted_scopes text[]
)
language plpgsql
security definer
set search_path = private, public
as $$
begin
  return query
    select gt.encrypted_access_token, gt.encrypted_refresh_token,
           gt.access_token_expires_at, gt.granted_scopes
    from private.graph_tokens gt
    where gt.integration_id = p_integration_id;
end;
$$;

-- Update just the access token + expiry after a refresh.
create or replace function public.update_graph_access_token(
  p_integration_id uuid,
  p_access text,
  p_expires timestamptz
)
returns void
language plpgsql
security definer
set search_path = private, public
as $$
begin
  update private.graph_tokens
    set encrypted_access_token = p_access,
        access_token_expires_at = p_expires,
        updated_at = now()
  where integration_id = p_integration_id;
end;
$$;

-- Delete tokens (on disconnect).
create or replace function public.delete_graph_token(p_integration_id uuid)
returns void
language plpgsql
security definer
set search_path = private, public
as $$
begin
  delete from private.graph_tokens where integration_id = p_integration_id;
end;
$$;

-- Lock down execution: server (service_role) only.
revoke execute on function public.upsert_graph_token(uuid, text, text, timestamptz, text[]) from public, anon, authenticated;
revoke execute on function public.get_graph_token(uuid) from public, anon, authenticated;
revoke execute on function public.update_graph_access_token(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.delete_graph_token(uuid) from public, anon, authenticated;

grant execute on function public.upsert_graph_token(uuid, text, text, timestamptz, text[]) to service_role;
grant execute on function public.get_graph_token(uuid) to service_role;
grant execute on function public.update_graph_access_token(uuid, text, timestamptz) to service_role;
grant execute on function public.delete_graph_token(uuid) to service_role;
