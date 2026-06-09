import { createServiceClient } from '@/lib/supabase/service';
import { encryptToken, decryptToken } from './crypto';
import {
  getGraphConfig,
  refreshAccessToken,
  shouldRefresh,
  expiryFromNow,
  type TokenResponse,
} from './oauth';

/**
 * Per-user Microsoft token storage + retrieval with automatic refresh
 * (Phase 3). Tokens are encrypted at rest and stored in private.graph_tokens via
 * service-role SECURITY DEFINER RPCs. Server-only.
 *
 * "Stay connected automatically": getValidAccessToken refreshes a near-expired
 * access token using the stored refresh token, persists the new one, and returns
 * a usable token — so a connected mailbox keeps working without re-auth.
 */

/** Encrypt + persist a token pair for an integration. */
export async function storeTokens(integrationId: string, tokens: TokenResponse): Promise<void> {
  const supabase = createServiceClient();
  await supabase.rpc('upsert_graph_token', {
    p_integration_id: integrationId,
    p_access: encryptToken(tokens.access_token),
    p_refresh: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    p_expires: expiryFromNow(tokens.expires_in),
    p_scopes: tokens.scope ? tokens.scope.split(' ') : [],
  });
}

/** Remove stored tokens for an integration (on disconnect). */
export async function deleteTokens(integrationId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.rpc('delete_graph_token', { p_integration_id: integrationId });
}

/**
 * Whether this integration's stored token was granted the Mail.Send scope.
 * Mailboxes connected before Phase 9 won't have it; the UI uses this to ask the
 * manager to reconnect before sending. Microsoft may return scopes as short names
 * ("Mail.Send") or resource-qualified URIs, so we match the suffix, case-insensitively.
 */
export async function hasSendScope(integrationId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase.rpc('get_graph_token', { p_integration_id: integrationId });
  const row = Array.isArray(data) ? data[0] : data;
  const scopes: string[] = row?.granted_scopes ?? [];
  return scopes.some((s) => /(^|[/.])mail\.send$/i.test(String(s).trim()));
}

/**
 * Return a valid access token for an integration, refreshing if needed.
 * Returns null if there are no stored tokens or no config.
 */
export async function getValidAccessToken(integrationId: string): Promise<string | null> {
  const config = getGraphConfig();
  if (!config) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('get_graph_token', {
    p_integration_id: integrationId,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.encrypted_access_token) return null;

  if (!shouldRefresh(row.access_token_expires_at)) {
    return decryptToken(row.encrypted_access_token);
  }

  // Near/!expired → refresh using the stored refresh token.
  if (!row.encrypted_refresh_token) {
    // No refresh token; return the current one if still valid, else null.
    return shouldRefresh(row.access_token_expires_at)
      ? null
      : decryptToken(row.encrypted_access_token);
  }

  const refreshToken = decryptToken(row.encrypted_refresh_token);
  const refreshed = await refreshAccessToken(config, refreshToken);
  await supabase.rpc('update_graph_access_token', {
    p_integration_id: integrationId,
    p_access: encryptToken(refreshed.access_token),
    p_expires: expiryFromNow(refreshed.expires_in),
  });
  // Microsoft may also rotate the refresh token; persist the full pair if so.
  if (refreshed.refresh_token) {
    await storeTokens(integrationId, refreshed);
  }
  return refreshed.access_token;
}
