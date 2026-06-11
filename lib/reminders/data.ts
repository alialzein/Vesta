import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

/** Reminders — shared shapes + the Settings-panel loader (RLS-scoped). */

export type ReminderRow = Database['public']['Tables']['reminders']['Row'];

export type ReminderView = {
  id: string;
  subject: string;
  toEmail: string;
  /** ISO of the next firing. */
  nextSendAt: string;
  /** e.g. "hourly × 3 (1 sent)" or "once". */
  scheduleLabel: string;
  itemTitle: string | null;
  status: 'scheduled' | 'done' | 'cancelled' | 'failed';
};

export function toReminderView(r: ReminderRow): ReminderView {
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  const total = r.sent_count + r.remaining_sends;
  let scheduleLabel = 'once';
  if (r.repeat_every_minutes && total > 1) {
    const every =
      r.repeat_every_minutes % 60 === 0
        ? r.repeat_every_minutes === 60
          ? 'hourly'
          : `every ${r.repeat_every_minutes / 60}h`
        : `every ${r.repeat_every_minutes}min`;
    scheduleLabel = `${every} × ${total}${r.sent_count > 0 ? ` (${r.sent_count} sent)` : ''}`;
  }
  return {
    id: r.id,
    subject: r.title,
    toEmail: r.send_to_email ?? '(no recipient)',
    nextSendAt: r.remind_at,
    scheduleLabel,
    itemTitle: typeof meta.item_title === 'string' ? meta.item_title : null,
    status: (['done', 'cancelled', 'failed'].includes(r.status)
      ? r.status
      : 'scheduled') as ReminderView['status'],
  };
}

/** Active (still scheduled) EMAIL reminders for the signed-in manager,
 *  soonest first. (send_to_email filters out any legacy Phase 1 rows.) */
export async function getActiveReminders(): Promise<ReminderView[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('reminders')
    .select('*')
    .eq('status', 'scheduled')
    .not('send_to_email', 'is', null)
    .order('remind_at', { ascending: true })
    .limit(50);
  return ((data ?? []) as ReminderRow[]).map(toReminderView);
}
