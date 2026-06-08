import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { syncAllConnectedMailboxes } from '@/lib/sync/outlook';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled background sync (Phase 5). Syncs every connected mailbox with the
 * service role (no user session) and drains the webhook queue, so mail stays
 * fresh even with no browser open. Triggered by an external scheduler
 * (Supabase pg_cron recommended; Vercel Cron also works) that sends the
 * CRON_SECRET. Host-agnostic — the trigger is swappable without code changes.
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Mark only events that existed before the sync started; anything arriving
  // mid-sync stays queued for the next run.
  const startedAt = new Date().toISOString();
  const summary = await syncAllConnectedMailboxes();

  const service = createServiceClient();
  await service
    .from('webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('status', 'received')
    .lte('created_at', startedAt);

  return NextResponse.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
