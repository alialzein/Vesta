import { randomBytes } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { getValidAccessToken } from '@/lib/graph/tokens';
import {
  createMailSubscription,
  renewSubscription,
  deleteSubscription,
  isWebhookConfigured,
  type GraphSubscription,
} from '@/lib/graph/subscriptions';

/**
 * Microsoft Graph subscription lifecycle for real-time webhooks (Phase 5).
 *
 * Persists the subscription id + clientState + expiry in `mailboxes.metadata`
 * (no schema change) and drives create / renew / delete plus the
 * notification → mailbox lookup the webhook handler needs. Service-role; no user
 * session required (used by the OAuth callback, the renew cron, the webhook).
 */

export type StoredSubscription = {
  id: string;
  clientState: string;
  expiresAt: string;
  resource?: string;
};

type MailboxRow = { id: string; user_id: string; integration_id: string; metadata: unknown };

/** Read the subscription block we persist in mailboxes.metadata, if present. */
export function readStoredSubscription(metadata: unknown): StoredSubscription | null {
  const m = (metadata ?? {}) as { subscription?: Partial<StoredSubscription> };
  const s = m.subscription;
  if (s?.id && s.clientState && s.expiresAt) {
    return { id: s.id, clientState: s.clientState, expiresAt: s.expiresAt, resource: s.resource };
  }
  return null;
}

/** Renew when within this window of expiry (Graph mail subs last ~2-3 days). */
export const RENEW_WITHIN_MS = 12 * 60 * 60 * 1000; // 12h

/** True if a stored subscription is still comfortably fresh (no renew needed). */
export function isSubscriptionFresh(expiresAt: string, now = Date.now()): boolean {
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) && ms - now > RENEW_WITHIN_MS;
}

async function persistSubscription(
  mailbox: MailboxRow,
  sub: GraphSubscription,
  clientState: string,
): Promise<void> {
  const service = createServiceClient();
  const metadata = {
    ...((mailbox.metadata ?? {}) as Record<string, unknown>),
    subscription: {
      id: sub.id,
      clientState,
      expiresAt: sub.expirationDateTime,
      resource: sub.resource,
    },
  };
  await service.from('mailboxes').update({ metadata }).eq('id', mailbox.id);
}

/**
 * Ensure the mailbox has a live Graph subscription: renew if near expiry, create
 * one if missing/dead. No-op when webhooks aren't configured (no public URL) or
 * there is no valid token. Returns what it did.
 */
export async function ensureSubscription(
  mailbox: MailboxRow,
): Promise<'created' | 'renewed' | 'skipped'> {
  if (!isWebhookConfigured()) return 'skipped';
  const token = await getValidAccessToken(mailbox.integration_id);
  if (!token) return 'skipped';

  const stored = readStoredSubscription(mailbox.metadata);
  if (stored) {
    if (isSubscriptionFresh(stored.expiresAt)) return 'skipped';
    try {
      const sub = await renewSubscription(token, stored.id);
      await persistSubscription(mailbox, sub, stored.clientState);
      return 'renewed';
    } catch {
      // Renew failed (expired/deleted) — fall through and create a fresh one.
    }
  }

  const clientState = randomBytes(24).toString('hex');
  const sub = await createMailSubscription(token, clientState);
  await persistSubscription(mailbox, sub, clientState);
  return 'created';
}

async function loadActiveMailboxes(): Promise<MailboxRow[]> {
  const service = createServiceClient();
  const { data } = await service
    .from('mailboxes')
    .select('id, user_id, integration_id, metadata')
    .eq('provider', 'microsoft')
    .eq('status', 'active');
  return (data ?? []) as MailboxRow[];
}

/** Ensure/renew subscriptions for every active Microsoft mailbox (renew cron). */
export async function renewAllSubscriptions(): Promise<{
  created: number;
  renewed: number;
  skipped: number;
  failed: number;
}> {
  const counts = { created: 0, renewed: 0, skipped: 0, failed: 0 };
  if (!isWebhookConfigured()) return counts;
  for (const mb of await loadActiveMailboxes()) {
    try {
      counts[await ensureSubscription(mb)] += 1;
    } catch {
      counts.failed += 1;
    }
  }
  return counts;
}

export type SubscriptionTarget = {
  mailboxId: string;
  userId: string;
  integrationId: string;
  clientState: string;
};

/** Map active subscription id → its mailbox target, for the webhook handler. */
export async function loadSubscriptionMap(): Promise<Map<string, SubscriptionTarget>> {
  const map = new Map<string, SubscriptionTarget>();
  for (const mb of await loadActiveMailboxes()) {
    const stored = readStoredSubscription(mb.metadata);
    if (stored) {
      map.set(stored.id, {
        mailboxId: mb.id,
        userId: mb.user_id,
        integrationId: mb.integration_id,
        clientState: stored.clientState,
      });
    }
  }
  return map;
}

/** Delete a mailbox's subscription (best-effort, on disconnect). */
export async function removeSubscriptionForMailbox(mailbox: MailboxRow): Promise<void> {
  const stored = readStoredSubscription(mailbox.metadata);
  if (!stored) return;
  const token = await getValidAccessToken(mailbox.integration_id);
  if (!token) return;
  try {
    await deleteSubscription(token, stored.id);
  } catch {
    /* ignore — it will expire on its own */
  }
}
