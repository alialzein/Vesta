import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, hasCalendarScope } from '@/lib/graph/tokens';
import { fetchCalendarView, type CalendarEventView } from '@/lib/graph/calendar';
import { GraphRequestError } from '@/lib/graph/client';
import { addDays } from '@/lib/meetings/group';
import { addMonths, monthKeyOf, weekStartKey } from '@/lib/meetings/calendar';
import { todayInTz, zonedTimeToUtc } from '@/lib/time/zone';

/**
 * Meetings page loader — the manager's REAL Outlook calendar (Graph
 * calendarView; recurrences expanded) over a window wide enough for the
 * calendar views: the current week AND the current month, through 4 weeks
 * out. The client derives agenda/week/month from the raw events (pure
 * helpers in lib/meetings/{group,calendar}); navigation beyond the window
 * fetches more via the getCalendarRange server action.
 * RLS/own-mailbox scoped; every state is explicit so the page is honest
 * about why it's empty (no mailbox vs missing calendar scope vs a hiccup).
 */

export type MeetingsData =
  | { status: 'no_mailbox' }
  | { status: 'needs_reconnect' }
  | { status: 'error' }
  | {
      status: 'ok';
      timezone: string;
      /** Manager-local YYYY-MM-DD. */
      todayKey: string;
      /** Manager-local day keys covered by `events` (inclusive / exclusive). */
      windowFromKey: string;
      windowToKey: string;
      events: CalendarEventView[];
    };

/** The initial fetch window: everything the default views can reach without
 *  a round-trip (current week start OR month start, whichever is earlier →
 *  4 weeks out OR next month start, whichever is later). */
export function initialWindow(todayKey: string): { fromKey: string; toKey: string } {
  const weekStart = weekStartKey(todayKey);
  const monthStart = `${monthKeyOf(todayKey)}-01`;
  const fromKey = weekStart < monthStart ? weekStart : monthStart;
  const fourWeeksOut = addDays(weekStart, 28);
  const nextMonthStart = `${addMonths(monthKeyOf(todayKey), 1)}-01`;
  const toKey = fourWeeksOut > nextMonthStart ? fourWeeksOut : nextMonthStart;
  return { fromKey, toKey };
}

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
    const { fromKey, toKey } = initialWindow(todayKey);
    const events = await fetchCalendarView(
      token,
      zonedTimeToUtc(fromKey, '00:00', tz).toISOString(),
      zonedTimeToUtc(toKey, '00:00', tz).toISOString(),
      150,
    );
    return {
      status: 'ok',
      timezone: tz,
      todayKey,
      windowFromKey: fromKey,
      windowToKey: toKey,
      events,
    };
  } catch (err) {
    if (err instanceof GraphRequestError && (err.status === 401 || err.status === 403)) {
      return { status: 'needs_reconnect' };
    }
    return { status: 'error' };
  }
}
