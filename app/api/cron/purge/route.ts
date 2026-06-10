import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { getAppSettings, getUserSettingsMap } from '@/lib/admin/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled retention purge (Admin Wave 4). Runs the same cleanup the admin
 * Email & Retention buttons do, automatically:
 *   1. Hard-delete soft-deleted mail past the grace window.
 *   2. Apply each user's effective retention window (per-user override beats
 *      the global; no window set = keep forever).
 * Recorded in purge_jobs + audit_logs (actor 'system'). Schedule daily via
 * pg_cron / Vercel Cron with the CRON_SECRET — same pattern as /api/cron/sync.
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient();
  const app = await getAppSettings();
  const nowIso = () => new Date().toISOString();
  let softDeleted = 0;
  let retention = 0;

  // 1. Soft-deleted mail past the grace window.
  const graceDays = app.soft_delete_grace_days ?? 30;
  const graceCutoff = new Date(Date.now() - graceDays * 86_400_000).toISOString();
  const { data: purged } = await svc
    .from('email_messages')
    .delete()
    .not('deleted_at', 'is', null)
    .lt('deleted_at', graceCutoff)
    .select('id');
  softDeleted = purged?.length ?? 0;
  if (softDeleted > 0) {
    await svc.from('purge_jobs').insert({
      kind: 'soft_delete',
      status: 'done',
      rows_affected: softDeleted,
      params: { cutoff: graceCutoff, scheduled: true } as never,
      finished_at: nowIso(),
    });
  }

  // 2. Retention windows — per user (override) where set, else the global.
  const { data: profiles } = await svc.from('profiles').select('id');
  const userIds = (profiles ?? []).map((p) => p.id);
  const overrides = await getUserSettingsMap(userIds);

  for (const userId of userIds) {
    const months = overrides.get(userId)?.retention_months ?? app.retention_months;
    if (!months || months <= 0) continue; // keep forever
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    const { data } = await svc
      .from('email_messages')
      .delete()
      .eq('user_id', userId)
      .lt('received_at', cutoff.toISOString())
      .select('id');
    const rows = data?.length ?? 0;
    retention += rows;
    if (rows > 0) {
      await svc.from('purge_jobs').insert({
        kind: 'retention',
        user_id: userId,
        status: 'done',
        rows_affected: rows,
        params: { months, cutoff: cutoff.toISOString(), scheduled: true } as never,
        finished_at: nowIso(),
      });
    }
  }

  if (softDeleted > 0 || retention > 0) {
    await svc.from('audit_logs').insert({
      actor_type: 'system',
      action: 'scheduled_purge',
      entity_type: 'email_messages',
      metadata: { softDeleted, retention } as never,
    });
  }

  return NextResponse.json({ ok: true, softDeleted, retention });
}

export const GET = handle;
export const POST = handle;
