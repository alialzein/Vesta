import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { renewAllSubscriptions } from '@/lib/sync/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled subscription renewal (Phase 5). Graph mail subscriptions expire in
 * ~2-3 days; this renews (or recreates) them before expiry for every connected
 * mailbox, keeping real-time webhooks alive. No-op until MS_GRAPH_WEBHOOK_URL is
 * set. Triggered by the same scheduler as /api/cron/sync (daily is plenty).
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const summary = await renewAllSubscriptions();
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
