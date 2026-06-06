/**
 * Microsoft identity platform OAuth (Phase 3) — authorization-code flow for
 * connecting an Outlook mailbox. ONE app registration (client id/secret) serves
 * all users; each user gets their own token pair. Server-only.
 *
 * Scopes: offline_access (refresh token → auto-reconnect), User.Read (identity),
 * Mail.Read (read mail). Least-privilege for the read MVP; send scopes come with
 * draft replies (later, approval-gated).
 */

export const GRAPH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.Read',
] as const;

export type GraphConfig = {
  clientId: string;
  clientSecret: string;
  tenant: string; // 'common' for multi-tenant + personal accounts
  redirectUri: string;
};

/** Read the Graph OAuth config from env, or null if not fully configured. */
export function getGraphConfig(): GraphConfig | null {
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  const redirectUri = process.env.MS_GRAPH_REDIRECT_URI;
  const tenant = process.env.MS_GRAPH_TENANT || 'common';
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, tenant, redirectUri };
}

export function isGraphConfigured(): boolean {
  return getGraphConfig() !== null;
}

function authority(tenant: string): string {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
}

/** Build the Microsoft authorize URL to redirect the user to. */
export function buildAuthorizeUrl(config: GraphConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: GRAPH_SCOPES.join(' '),
    state,
    prompt: 'select_account',
  });
  return `${authority(config.tenant)}/authorize?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  scope?: string;
  token_type: string;
};

async function tokenRequest(config: GraphConfig, body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(`${authority(config.tenant)}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft token request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Exchange an authorization code for tokens. */
export function exchangeCodeForTokens(config: GraphConfig, code: string): Promise<TokenResponse> {
  return tokenRequest(
    config,
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      scope: GRAPH_SCOPES.join(' '),
    }),
  );
}

/** Use a refresh token to get a fresh access token (auto-reconnect). */
export function refreshAccessToken(
  config: GraphConfig,
  refreshToken: string,
): Promise<TokenResponse> {
  return tokenRequest(
    config,
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: GRAPH_SCOPES.join(' '),
    }),
  );
}

/** True if an access token expiring at `expiresAt` should be refreshed now. */
export function shouldRefresh(expiresAt: Date | string | null, skewSeconds = 120): boolean {
  if (!expiresAt) return true;
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return exp.getTime() - Date.now() <= skewSeconds * 1000;
}

/** Convert an `expires_in` (seconds) to an absolute ISO expiry timestamp. */
export function expiryFromNow(expiresIn: number): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}
