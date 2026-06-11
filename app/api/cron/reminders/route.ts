import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { getValidAccessToken } from '@/lib/graph/tokens';
import { sendNewMail } from '@/lib/graph/send';
import { afterSend, reminderEmail, MAX_SEND_FAILURES } from '@/lib/reminders/logic';
import type { Database } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ReminderRow = Database['public']['Tables']['reminders']['Row'];

/**
 * Reminder processor (Phase B chat orders). Schedule this every 5 minutes
 * alongside the sync cron (same CRON_SECRET): picks due `scheduled`
 * reminders, sends each through the manager's own connected mailbox
 * (Mail.Send — the same path approved drafts use), then advances recurring
 * series or completes them. Send failures retry on later runs without
 * advancing the clock, up to MAX_SEND_FAILURES.
 *
 * Every reminder row was created by an explicitly confirmed chat order, and
 * stays cancellable in Settings → Scheduled reminders until it finishes.
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data: dueRows } = await service
    .from('reminders')
    .select('*')
    .eq('status', 'scheduled')
    .not('send_to_email', 'is', null) // email reminders only (legacy rows are not ours)
    .lte('remind_at', nowIso)
    .order('remind_at', { ascending: true })
    .limit(25);
  const due = (dueRows ?? []) as ReminderRow[];

  // One mailbox/token lookup per user, not per reminder.
  const tokenByUser = new Map<string, string | null>();
  async function tokenFor(userId: string): Promise<string | null> {
    if (tokenByUser.has(userId)) return tokenByUser.get(userId) ?? null;
    const { data: mb } = await service
      .from('mailboxes')
      .select('integration_id')
      .eq('user_id', userId)
      .eq('provider', 'microsoft')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    const token = mb?.integration_id ? await getValidAccessToken(mb.integration_id) : null;
    tokenByUser.set(userId, token);
    return token;
  }

  let sent = 0;
  let failed = 0;
  for (const r of due) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    try {
      const token = await tokenFor(r.user_id);
      if (!token) throw new Error('No connected mailbox / valid token.');

      const mail = reminderEmail({
        subject: r.title,
        body: r.body,
        itemTitle: typeof meta.item_title === 'string' ? meta.item_title : null,
        sentNumber: r.sent_count + 1,
        totalSends: r.sent_count + r.remaining_sends,
      });
      await sendNewMail(token, { to: r.send_to_email!, subject: mail.subject, html: mail.html });

      const next = afterSend(r);
      await service
        .from('reminders')
        .update({
          status: next.status,
          remaining_sends: next.remaining_sends,
          sent_count: next.sent_count,
          remind_at: next.remind_at,
          last_sent_at: nowIso,
          metadata: { ...meta, failures: 0, last_error: null },
        })
        .eq('id', r.id);
      sent += 1;
    } catch (err) {
      // Retry next run without advancing; give up after the failure cap.
      const failures = (typeof meta.failures === 'number' ? meta.failures : 0) + 1;
      const lastError = err instanceof Error ? err.message : 'send failed';
      await service
        .from('reminders')
        .update({
          status: failures >= MAX_SEND_FAILURES ? 'failed' : 'scheduled',
          metadata: { ...meta, failures, last_error: lastError },
        })
        .eq('id', r.id);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, due: due.length, sent, failed });
}

export const GET = handle;
export const POST = handle;
