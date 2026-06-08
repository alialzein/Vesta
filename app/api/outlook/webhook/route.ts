import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { loadSubscriptionMap } from '@/lib/sync/subscriptions';
import type { Json } from '@/lib/database.types';

export const runtime = 'nodejs';

/**
 * Microsoft Graph change-notification endpoint (Phase 5).
 *
 * - Validation handshake: Graph calls with `?validationToken=…`; echo it back as
 *   text/plain within 10s to confirm the endpoint.
 * - Notifications: Graph POSTs `{ value: [...] }`. We match each to a known
 *   subscription (validating `clientState` as anti-forgery), attribute it to its
 *   mailbox, and queue it in `webhook_events`. The scheduled `/api/cron/sync`
 *   drains the queue + syncs, so this stays fast (Graph disables slow endpoints).
 */
export async function POST(request: NextRequest) {
  const validationToken = new URL(request.url).searchParams.get('validationToken');
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    const body = (await request.json()) as {
      value?: Array<{ subscriptionId?: string; changeType?: string; clientState?: string }>;
    };
    const notifications = Array.isArray(body?.value) ? body.value : [];
    if (notifications.length > 0) {
      const subMap = await loadSubscriptionMap();
      const rows = notifications
        .map((n) => {
          const target = n.subscriptionId ? subMap.get(n.subscriptionId) : undefined;
          // Drop notifications we can't attribute, or whose clientState doesn't
          // match the subscription we created (anti-forgery).
          if (!target) return null;
          if (n.clientState && n.clientState !== target.clientState) return null;
          return {
            provider: 'microsoft',
            subscription_id: n.subscriptionId ?? null,
            user_id: target.userId,
            integration_id: target.integrationId,
            mailbox_id: target.mailboxId,
            event_type: n.changeType ?? null,
            payload: n as Json,
            status: 'received',
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (rows.length > 0) {
        const service = createServiceClient();
        await service.from('webhook_events').insert(rows);
      }
    }
  } catch {
    /* ignore malformed bodies — Graph retries on non-2xx */
  }

  // 202 Accepted: queued; processing happens out of band in the sync cron.
  return new NextResponse(null, { status: 202 });
}
