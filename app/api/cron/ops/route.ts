import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/lib/database.types';
import { getHealthOverview } from '@/lib/admin/data';
import { buildAttention, attentionEmailHtml, type AttentionItem } from '@/lib/admin/attention';
import { detectCapBreaches, shouldSendDigest } from '@/lib/admin/ops-logic';
import { rowCost, type UsageRow } from '@/lib/admin/ai-usage';
import { getAppSettings, getConfiguredAiRates } from '@/lib/admin/settings';
import { adminAlertRecipients, sendSystemEmail } from '@/lib/system-mail';
import { syncOutlookForUser } from '@/lib/sync/outlook';
import { renewAllSubscriptions } from '@/lib/sync/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Ops automation (run every ~15 minutes by the same scheduler as
 * /api/cron/sync). The operator's standing orders:
 *
 * 1. COST-CAP BREACHES — when a user's AI spend today reaches their cap
 *    (per-user, else global; no cap = nothing ever fires), email the admin.
 *    The pause itself already happens in getEffectiveAi — this is the alarm.
 * 2. SELF-HEALING — stale mailboxes get ONE extra sync attempt per run;
 *    webhook subscriptions near expiry are renewed (renewAllSubscriptions
 *    is a no-op when nothing is due). Email only when self-healing FAILS.
 * 3. FAILED REMINDERS — surfaced through the shared attention list.
 * 4. DAILY DIGEST — the Needs-attention strip, mailed once a day at
 *    DIGEST_HOUR_UTC (default 05:00 UTC ≈ 8am Beirut), only when something
 *    is actually wrong.
 *
 * Every email is deduped per UTC day via audit_logs (action system_alert /
 * system_digest) and visible in Audit & Security like any other action.
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const svc = createServiceClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  const baseUrl = (process.env.APP_BASE_URL ?? '').trim() || request.nextUrl.origin;

  // What already went out today (dedupe keys: metadata.kind [+ user]).
  const { data: sentRows } = await svc
    .from('audit_logs')
    .select('action, metadata')
    .in('action', ['system_alert', 'system_digest'])
    .gte('created_at', todayIso);
  const sentKeys = new Set(
    (sentRows ?? []).map((r) => {
      const m = (r.metadata ?? {}) as Record<string, unknown>;
      return `${r.action}:${m.kind ?? ''}:${m.user_id ?? ''}`;
    }),
  );
  const alreadyDigested = (sentRows ?? []).some((r) => r.action === 'system_digest');

  const alerts: AttentionItem[] = [];
  const logAlert = async (kind: string, text: string, userId?: string) => {
    alerts.push({ text, href: '/admin', severity: 'bad' });
    await svc.from('audit_logs').insert({
      user_id: userId ?? null,
      actor_type: 'system',
      actor_id: null,
      action: 'system_alert',
      entity_type: 'ops',
      metadata: { kind, user_id: userId ?? null, text } as Json,
    });
  };

  // ---- 1. Cost-cap breaches --------------------------------------------
  const [{ data: usage }, settings, rates, { data: userSettings }, { data: profiles }] =
    await Promise.all([
      svc
        .from('ai_usage')
        .select('user_id, token_input, token_output, cost_estimate_usd, created_at, feature, model, error, metadata')
        .gte('created_at', todayIso),
      getAppSettings(),
      getConfiguredAiRates(),
      svc.from('user_settings').select('user_id, ai_daily_cost_cap_usd'),
      svc.from('profiles').select('id, email'),
    ]);
  const spendByUser = new Map<string, number>();
  for (const r of (usage ?? []) as UsageRow[]) {
    if (!r.user_id) continue;
    spendByUser.set(r.user_id, (spendByUser.get(r.user_id) ?? 0) + rowCost(r, rates));
  }
  const perUserCap = new Map<string, number | null>(
    (userSettings ?? []).map((s) => [s.user_id, s.ai_daily_cost_cap_usd]),
  );
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const breaches = detectCapBreaches(spendByUser, settings.ai_daily_cost_cap_usd, perUserCap);
  for (const b of breaches) {
    if (sentKeys.has(`system_alert:cost_cap:${b.userId}`)) continue;
    await logAlert(
      'cost_cap',
      `AI cost cap reached: ${emailById.get(b.userId) ?? b.userId} spent $${b.spentUsd.toFixed(2)} of $${b.capUsd.toFixed(2)} today — AI is paused for them until tomorrow.`,
      b.userId,
    );
  }

  // ---- 2a. Self-heal: one extra sync attempt for stale mailboxes ---------
  const staleCutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const [{ data: cursors }, { data: activeBoxes }] = await Promise.all([
    svc.from('sync_cursors').select('user_id, last_success_at, resource_type'),
    svc.from('mailboxes').select('user_id').eq('status', 'active'),
  ]);
  const activeUsers = new Set((activeBoxes ?? []).map((m) => m.user_id));
  const staleUsers = (cursors ?? [])
    .filter(
      (c) =>
        c.resource_type === 'messages' &&
        activeUsers.has(c.user_id) &&
        (!c.last_success_at || c.last_success_at < staleCutoff),
    )
    .map((c) => c.user_id)
    .slice(0, 2); // keep the run fast; the next tick takes the rest
  let healed = 0;
  for (const userId of staleUsers) {
    try {
      await syncOutlookForUser(userId);
      healed += 1;
    } catch (e) {
      if (!sentKeys.has(`system_alert:sync_fail:${userId}`)) {
        await logAlert(
          'sync_fail',
          `Self-healing sync FAILED for ${emailById.get(userId) ?? userId}: ${e instanceof Error ? e.message.slice(0, 140) : 'unknown error'}`,
          userId,
        );
      }
    }
  }

  // ---- 2b. Webhook subscriptions (no-op when nothing is near expiry) -----
  let subs: Awaited<ReturnType<typeof renewAllSubscriptions>> | null = null;
  try {
    subs = await renewAllSubscriptions();
    if (subs.failed > 0 && !sentKeys.has('system_alert:webhook_renew:')) {
      await logAlert(
        'webhook_renew',
        `${subs.failed} webhook subscription renewal(s) FAILED — real-time mail may stop; check Mailboxes & Sync.`,
      );
    }
  } catch {
    /* renewal problems surface on the next run */
  }

  // ---- Send the alert mail (new alerts only) -----------------------------
  const recipients = await adminAlertRecipients();
  let alertMail: string | null = null;
  if (alerts.length > 0 && recipients.length > 0) {
    const res = await sendSystemEmail({
      to: recipients,
      subject: `Vesta alert: ${alerts.length} issue${alerts.length === 1 ? '' : 's'} need you`,
      html: attentionEmailHtml(alerts, baseUrl),
    });
    alertMail = res.ok ? 'sent' : res.error ?? 'failed';
  }

  // ---- 4. Daily digest ----------------------------------------------------
  const health = await getHealthOverview(todayIso);
  const attention = buildAttention(health);
  const digestHour = Number(process.env.DIGEST_HOUR_UTC ?? 5);
  let digestMail: string | null = null;
  if (shouldSendDigest(new Date(), digestHour, alreadyDigested, attention.length) && recipients.length > 0) {
    const res = await sendSystemEmail({
      to: recipients,
      subject: `Vesta morning digest: ${attention.length} thing${attention.length === 1 ? '' : 's'} to look at`,
      html: attentionEmailHtml(attention, baseUrl),
    });
    digestMail = res.ok ? 'sent' : res.error ?? 'failed';
    if (res.ok) {
      await svc.from('audit_logs').insert({
        user_id: null,
        actor_type: 'system',
        actor_id: null,
        action: 'system_digest',
        entity_type: 'ops',
        metadata: { items: attention.length } as Json,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    breaches: breaches.length,
    staleTried: staleUsers.length,
    healed,
    subscriptions: subs,
    alerts: alerts.length,
    alertMail,
    digestMail,
  });
}

export const GET = handle;
export const POST = handle;
