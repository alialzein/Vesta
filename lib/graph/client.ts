/**
 * Minimal Microsoft Graph REST helper (Phase 3). Server-only.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export type GraphMe = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

/** GET a Graph resource with a bearer access token. */
export async function graphGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph GET ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

/** Fetch the signed-in user's identity (used as the connection test + mailbox id). */
export function getMe(accessToken: string): Promise<GraphMe> {
  return graphGet<GraphMe>(accessToken, '/me');
}
