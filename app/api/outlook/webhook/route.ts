import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/lib/database.types';

/**
 * Microsoft Graph change-notification endpoint (Phase 5 — scaffold).
 *
 * DORMANT until Vesta runs on a public HTTPS URL: Microsoft cannot reach
 * `localhost`, so no subscription points here yet (see lib/graph/subscriptions.ts).
 * When deployed, point a mail subscription's notificationUrl at this route.
 *
 * - Validation handshake: Graph calls with `?validationToken=…`; we must echo it
 *   back as text/plain within 10s to confirm the endpoint.
 * - Notifications: Graph POSTs `{ value: [...] }`; we store them in
 *   `webhook_events` (service-write) for processing. Real processing (kick off a
 *   delta sync per affected mailbox) is wired up when webhooks go live.
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
    const body = (await request.json()) as { value?: unknown[] };
    const notifications = Array.isArray(body?.value) ? body.value : [];
    if (notifications.length > 0) {
      const service = createServiceClient();
      await service.from('webhook_events').insert(
        notifications.map((n) => {
          const note = n as { subscriptionId?: string; changeType?: string };
          return {
            provider: 'microsoft',
            subscription_id: note.subscriptionId ?? null,
            event_type: note.changeType ?? null,
            payload: n as Json,
            status: 'received',
          };
        }),
      );
    }
  } catch {
    /* ignore malformed bodies — Graph retries on non-2xx */
  }

  // 202 Accepted: received; processing happens out of band.
  return new NextResponse(null, { status: 202 });
}
