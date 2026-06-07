const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/**
 * Microsoft Graph change-notification subscriptions (Phase 5 — scaffold).
 *
 * DORMANT until a public HTTPS notification URL exists. Set `MS_GRAPH_WEBHOOK_URL`
 * to `https://<your-domain>/api/outlook/webhook` once deployed, then call
 * `createMailSubscription` after connecting a mailbox and renew before expiry.
 * Microsoft can't reach localhost, so these aren't invoked in local dev — the
 * interval-based AutoSync (components/sync/AutoSync.tsx) keeps mail fresh instead.
 */

/** The public webhook URL Graph should POST to, or null when not configured. */
export function getWebhookUrl(): string | null {
  return process.env.MS_GRAPH_WEBHOOK_URL?.trim() || null;
}

export function isWebhookConfigured(): boolean {
  return Boolean(getWebhookUrl());
}

export type GraphSubscription = {
  id: string;
  resource: string;
  changeType: string;
  expirationDateTime: string;
  notificationUrl: string;
};

/** Graph caps message subscriptions near ~3 days; renew well before this. */
const MESSAGE_SUBSCRIPTION_MINUTES = 60 * 24 * 2; // 2 days

function expirationFromNow(minutes = MESSAGE_SUBSCRIPTION_MINUTES): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** Create a subscription on the mailbox's messages. Requires a public webhook URL. */
export async function createMailSubscription(
  accessToken: string,
  clientState: string,
): Promise<GraphSubscription> {
  const notificationUrl = getWebhookUrl();
  if (!notificationUrl) {
    throw new Error('MS_GRAPH_WEBHOOK_URL is not set — webhooks need a public HTTPS URL.');
  }
  const res = await fetch(`${GRAPH_BASE}/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changeType: 'created,updated',
      notificationUrl,
      resource: '/me/mailFolders/inbox/messages',
      expirationDateTime: expirationFromNow(),
      clientState,
    }),
  });
  if (!res.ok)
    throw new Error(`Graph subscription create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as GraphSubscription;
}

/** Extend an existing subscription's expiry. */
export async function renewSubscription(
  accessToken: string,
  subscriptionId: string,
): Promise<GraphSubscription> {
  const res = await fetch(`${GRAPH_BASE}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expirationDateTime: expirationFromNow() }),
  });
  if (!res.ok)
    throw new Error(`Graph subscription renew failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as GraphSubscription;
}

/** Delete a subscription (e.g. on disconnect). */
export async function deleteSubscription(
  accessToken: string,
  subscriptionId: string,
): Promise<void> {
  await fetch(`${GRAPH_BASE}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
