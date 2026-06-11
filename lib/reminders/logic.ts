/**
 * Reminders engine — pure scheduling logic (Phase B of chat orders).
 *
 * A reminder fires when `next_send_at` passes. After a successful send it
 * either advances (recurring, sends left) or completes. Send failures are
 * retried on later cron runs WITHOUT advancing the clock, up to a cap, so a
 * transient Graph error never silently eats a firing.
 */

/** Guard rails shared by the chat order parser and the executor. */
export const MIN_REPEAT_MINUTES = 15; // never spam more often than this
export const MAX_SENDS = 10; // "every hour, forever" is not a thing
export const MAX_SEND_FAILURES = 5; // then the reminder is marked failed

export type ReminderSchedule = {
  repeat_every_minutes: number | null;
  remaining_sends: number;
  sent_count: number;
  remind_at: string; // next firing, ISO (UTC)
};

export type AfterSend = {
  status: 'scheduled' | 'done';
  remaining_sends: number;
  sent_count: number;
  remind_at: string;
};

/** State transition after ONE successful send. Recurring reminders advance
 *  from the SCHEDULED time (not "now"), so a late cron run doesn't drift the
 *  series; a far-behind series catches up to the next future slot. */
export function afterSend(r: ReminderSchedule, now: Date = new Date()): AfterSend {
  const remaining = Math.max(0, r.remaining_sends - 1);
  const sent = r.sent_count + 1;
  if (remaining === 0 || !r.repeat_every_minutes) {
    return { status: 'done', remaining_sends: 0, sent_count: sent, remind_at: r.remind_at };
  }
  const step = Math.max(MIN_REPEAT_MINUTES, r.repeat_every_minutes) * 60_000;
  let next = new Date(r.remind_at).getTime() + step;
  // If the cron was down for a while, skip slots that are already in the past.
  while (next <= now.getTime()) next += step;
  return {
    status: 'scheduled',
    remaining_sends: remaining,
    sent_count: sent,
    remind_at: new Date(next).toISOString(),
  };
}

/** Clamp a proposed repeat/count pair to the engine's guard rails. */
export function clampSchedule(repeatMinutes: number | null, count: number): {
  repeat_every_minutes: number | null;
  remaining_sends: number;
} {
  const sends = Math.max(1, Math.min(MAX_SENDS, Math.round(count) || 1));
  if (!repeatMinutes || sends === 1) {
    return { repeat_every_minutes: null, remaining_sends: sends === 1 ? 1 : sends };
  }
  return {
    repeat_every_minutes: Math.max(MIN_REPEAT_MINUTES, Math.round(repeatMinutes)),
    remaining_sends: sends,
  };
}

/** The email subject/body for one firing (plain, manager-voice). */
export function reminderEmail(input: {
  subject: string;
  body: string | null;
  itemTitle?: string | null;
  sentNumber: number; // 1-based
  totalSends: number;
}): { subject: string; html: string } {
  const counter = input.totalSends > 1 ? ` (${input.sentNumber}/${input.totalSends})` : '';
  const lines = [
    `<p>${escapeHtml(input.body?.trim() || input.subject)}</p>`,
    input.itemTitle ? `<p>Thread: <b>${escapeHtml(input.itemTitle)}</b></p>` : '',
    '<p style="color:#888;font-size:12px">— Vesta, your reminder as requested. Manage reminders in Settings.</p>',
  ].filter(Boolean);
  return {
    subject: `Reminder${counter}: ${input.subject}`.slice(0, 200),
    html: lines.join('\n'),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
