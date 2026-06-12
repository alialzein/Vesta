/**
 * Microsoft identity platform OAuth (Phase 3) — authorization-code flow for
 * connecting an Outlook mailbox. ONE app registration (client id/secret) serves
 * all users; each user gets their own token pair. Server-only.
 *
 * Scopes: offline_access (refresh token → auto-reconnect), User.Read (identity),
 * Mail.Read (read mail), Mail.Send (send approved draft replies — Phase 9; every
 * send is still explicitly approved by the manager, never automatic),
 * Calendars.ReadWrite (read today's meetings + create events from confirmed chat
 * orders — Phase C; owner granted it on the Azure app 2026-06-11).
 *
 * Mailboxes connected before a scope was added won't have granted it; the app
 * detects that (granted_scopes on the stored token) and asks the manager to
 * reconnect once to enable the feature.
 */

export const GRAPH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.Send',
  'Calendars.ReadWrite',
] as const;

/** The scope required to send mail on the manager's behalf. */
export const SEND_SCOPE = 'Mail.Send';

/** The scope required to read the calendar + create meetings (Phase C). */
export const CALENDAR_SCOPE = 'Calendars.ReadWrite';

export type GraphConfig = {
  clientId: string;
  clientSecret: string;
  tenant: string; // 'common' for multi-tenant + personal accounts
};

/** Read the Graph OAuth config from env, or null if not fully configured. */
export function getGraphConfig(): GraphConfig | null {
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  const tenant = process.env.MS_GRAPH_TENANT || 'common';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, tenant };
}

export function isGraphConfigured(): boolean {
  return getGraphConfig() !== null;
}

/**
 * The OAuth callback URL. Auto-derives from the current request origin
 * (`<origin>/api/outlook/callback`) so it works on localhost, production, and
 * preview domains with zero per-environment config — you only register those
 * URLs on the Azure app. `MS_GRAPH_REDIRECT_URI` can override it (e.g. behind a
 * proxy where the public URL differs from the request origin).
 *
 * The SAME value must be used for both the authorize redirect and the token
 * exchange, so always derive it from the same request.
 */
export function resolveRedirectUri(origin: string): string {
  const override = process.env.MS_GRAPH_REDIRECT_URI;
  return override && override.length > 0 ? override : `${origin}/api/outlook/callback`;
}

function authority(tenant: string): string {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
}

/** Build the Microsoft authorize URL to redirect the user to. */
export function buildAuthorizeUrl(config: GraphConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
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

/** Exchange an authorization code for tokens. Use the SAME redirectUri as authorize. */
export function exchangeCodeForTokens(
  config: GraphConfig,
  redirectUri: string,
  code: string,
): Promise<TokenResponse> {
  return tokenRequest(
    config,
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
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
