import type { Chip, WorkItemCategory } from '@/lib/types';
import { priorityBand } from '@/lib/priority';

/**
 * Pure presentation helpers for the Today dashboard mapping (extracted from
 * lib/dashboard/data.ts so they can be unit-tested — AGENTS.md: "Add tests for
 * pure logic"). No Supabase, no server-only imports.
 */

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * Trim the quoted reply chain out of a body preview so the row shows just the new
 * message, not "…On Mon, Jun 8 … wrote: <the whole previous email>". Cuts at common
 * reply markers (only when they appear mid-text, never at the very start), then
 * collapses whitespace.
 */
export function cleanPreview(s: string | null): string {
  if (!s) return '';
  let t = s.replace(/\r/g, ' ');
  const markers = [
    /\bOn\s.+?\bwrote:/s,
    /\bFrom:\s.+?\bSent:/s,
    /-{3,}\s*Original Message\s*-{3,}/i,
    /_{5,}/,
  ];
  for (const m of markers) {
    const idx = t.search(m);
    if (idx > 0) t = t.slice(0, idx);
  }
  return t.replace(/\s+/g, ' ').trim();
}

/** Pull the counterpart's name out of an urgency reason ("Maya is waiting…" or
 *  "Waiting on Maya to reply"). Fallback only — the real sender comes from
 *  email_messages.sender_name / sender_email when the item is a thread. */
export function personFrom(reason: string | null): string | undefined {
  const waiting = reason?.match(/^(.+?)\s+is waiting/i);
  if (waiting?.[1]) return waiting[1].trim();
  const owed = reason?.match(/^Waiting on (.+?) to reply/i);
  return owed?.[1]?.trim() || undefined;
}

/**
 * Display name for a real email sender: the stored display name when present,
 * otherwise a humanized local part ("rania.haddad" → "Rania Haddad").
 */
export function senderDisplay(
  name: string | null | undefined,
  email: string | null | undefined,
): string | undefined {
  const n = name?.trim();
  // Some senders arrive with the address duplicated into the name field; the
  // humanized local part reads better than a raw address either way.
  if (n && !n.includes('@')) return n;
  const local = email?.split('@')[0]?.trim();
  if (!local) return undefined;
  return local
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export type DueView = { label: string; detail?: string; overdue: boolean };

/**
 * Due label for a radar row. A past due_at is a real state — red "Overdue"
 * with the original date AND time as the detail (a 3 PM deadline is not
 * overdue at 10 AM, and when it is, the manager should see "was due Jun 12,
 * 3:00 PM" — not just the date). Labels render in the MANAGER's timezone
 * (profiles.timezone), not the server's. `now` is injectable for tests.
 */
export function dueOf(
  due: string | null,
  category: WorkItemCategory,
  tz?: string,
  now: Date = new Date(),
): DueView {
  if (due) {
    const d = new Date(due);
    const timeZone = tz || undefined;
    const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone });
    const timeLabel = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    });
    if (d.getTime() < now.getTime()) {
      return { label: 'Overdue', detail: `was due ${dateLabel}, ${timeLabel}`, overdue: true };
    }
    return { label: `Due ${dateLabel}`, detail: timeLabel, overdue: false };
  }
  return {
    label: category === 'waiting' ? 'Waiting on you' : 'In your queue',
    overdue: false,
  };
}

export function chipsFor(category: WorkItemCategory, score: number): Chip[] {
  const chips: Chip[] = [];
  if (category === 'waiting') chips.push({ label: 'Waiting on you', tone: 'red' });
  else if (category === 'followup') chips.push({ label: 'Follow-up', tone: 'amber' });
  else if (category === 'fyi') chips.push({ label: 'FYI', tone: 'neutral' });
  else if (category === 'task') chips.push({ label: 'Task', tone: 'blue' });
  else if (category === 'waiting_on_them')
    chips.push({ label: 'Waiting on them', tone: 'amber' });
  else chips.push({ label: CATEGORY_LABEL[category] ?? category, tone: 'blue' });
  // One vocabulary everywhere: "High priority" means the red band (85+), the
  // same threshold the score badge and the rail's band label use.
  if (priorityBand(score) === 'red') chips.push({ label: 'High priority', tone: 'red' });
  return chips;
}

export const CATEGORY_LABEL: Record<string, string> = {
  critical: 'Critical',
  waiting: 'Waiting on you',
  followup: 'Follow-up',
  delegate: 'Can delegate',
  decision: 'Decision',
  promise: 'Promise',
  task: 'Task',
  waiting_on_them: 'Waiting on them',
  fyi: 'FYI',
};
