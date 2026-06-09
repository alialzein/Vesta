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

/** GET an absolute Graph URL (e.g. an @odata.nextLink / @odata.deltaLink). */
export async function graphGetUrl<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph GET ${url} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

/** Fetch the signed-in user's identity (used as the connection test + mailbox id). */
export function getMe(accessToken: string): Promise<GraphMe> {
  return graphGet<GraphMe>(accessToken, '/me');
}

/** A Graph error we can branch on — notably 403 (missing the Mail.Send scope). */
export class GraphRequestError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(`Graph ${path} failed (${status}): ${body}`);
    this.name = 'GraphRequestError';
  }
}

/** POST a JSON body and return the parsed response (used for createReply). */
export async function graphPost<T>(accessToken: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new GraphRequestError(res.status, path, await res.text());
  return (await res.json()) as T;
}

/** POST with no response body expected (used for /send — returns 202 Accepted). */
export async function graphPostNoContent(
  accessToken: string,
  path: string,
  body?: unknown,
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new GraphRequestError(res.status, path, await res.text());
}

/** PATCH a JSON body with no meaningful response (used to set a draft's body). */
export async function graphPatchNoContent(
  accessToken: string,
  path: string,
  body: unknown,
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new GraphRequestError(res.status, path, await res.text());
}
