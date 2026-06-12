import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, hasCalendarScope } from '@/lib/graph/tokens';
import { fetchCalendarView } from '@/lib/graph/calendar';
import { GraphRequestError } from '@/lib/graph/client';
import { groupMeetingsByDay, type MeetingsDay } from '@/lib/meetings/group';
import { todayInTz, zonedTimeToUtc } from '@/lib/time/zone';

/**
 * Meetings page loader (Meetings v1) — the manager's schedule for today + the
 * next 7 days from the REAL Outlook calendar (Graph calendarView; recurrences
 * expanded). Reuses the Phase C calendar plumbing the chat already trusts.
 * RLS/own-mailbox scoped; every state is explicit so the page is honest about
 * why it's empty (no mailbox vs missing calendar scope vs a Graph hiccup).
 */

export type MeetingsData =
  | { status: 'no_mailbox' }
  | { status: 'needs_reconnect' }
  | { status: 'error' }
  | { status: 'ok'; timezone: string; days: MeetingsDay[] };

export async function getMeetingsData(): Promise<MeetingsData> {
  const supabase = createClient();
  const [{ data: profile }, { data: mailbox }] = await Promise.all([
    supabase.from('profiles').select('timezone').maybeSingle(),
    supabase
      .from('mailboxes')
      .select('id, integration_id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ]);

  if (!mailbox?.integration_id) return { status: 'no_mailbox' };

  try {
    if (!(await hasCalendarScope(mailbox.integration_id))) {
      return { status: 'needs_reconnect' };
    }
    const token = await getValidAccessToken(mailbox.integration_id);
    if (!token) return { status: 'needs_reconnect' };

    const tz = profile?.timezone || 'UTC';
    const todayKey = todayInTz(tz);
    const windowStart = zonedTimeToUtc(todayKey, '00:00', tz);
    const windowEnd = new Date(windowStart.getTime() + 8 * 24 * 60 * 60 * 1000);
    const events = await fetchCalendarView(
      token,
      windowStart.toISOString(),
      windowEnd.toISOString(),
      50,
    );
    return { status: 'ok', timezone: tz, days: groupMeetingsByDay(events, tz, todayKey) };
  } catch (err) {
    if (err instanceof GraphRequestError && (err.status === 401 || err.status === 403)) {
      return { status: 'needs_reconnect' };
    }
    return { status: 'error' };
  }
}
