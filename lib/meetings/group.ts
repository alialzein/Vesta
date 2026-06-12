import type { CalendarEventView } from '@/lib/graph/calendar';

/**
 * Pure day-grouping for the Meetings page (no I/O — unit tested). Events come
 * in as UTC instants; days are the MANAGER's calendar days (profiles.timezone),
 * so a 23:30 meeting lands on the right day wherever the server runs.
 */

export type MeetingsDay = {
  /** Manager-local calendar date, YYYY-MM-DD. */
  date: string;
  /** "Today — Friday, June 12" / "Tomorrow — Saturday, June 13" / "Monday, June 15". */
  label: string;
  isToday: boolean;
  events: CalendarEventView[];
};

/** The manager-local calendar date (YYYY-MM-DD) of a UTC instant. */
export function dayKeyInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
}

/** Which calendar day an event belongs to. All-day events (holidays, OOO)
 *  come from Graph as bare dates at UTC midnight — converting THOSE through
 *  the manager timezone would slide them to the previous day east of UTC, so
 *  they keep their raw date. */
export function eventDayKey(e: Pick<CalendarEventView, 'startIso' | 'isAllDay'>, tz: string): string {
  return e.isAllDay ? e.startIso.slice(0, 10) : dayKeyInTz(e.startIso, tz);
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`); // noon avoids DST edge shifts
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Human label for a calendar date (the date string is already tz-resolved). */
export function dayLabel(dateKey: string, todayKey: string): string {
  const pretty = new Date(`${dateKey}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  if (dateKey === todayKey) return `Today — ${pretty}`;
  if (dateKey === addDays(todayKey, 1)) return `Tomorrow — ${pretty}`;
  return pretty;
}

/**
 * Group events into manager-local days, ascending. Today is ALWAYS first —
 * even with no meetings ("No meetings today" is the morning answer the page
 * exists for). Other days appear only when they have events.
 */
export function groupMeetingsByDay(
  events: CalendarEventView[],
  tz: string,
  todayKey: string,
): MeetingsDay[] {
  const byDay = new Map<string, CalendarEventView[]>();
  byDay.set(todayKey, []);
  for (const e of events) {
    if (!e.startIso) continue;
    const key = eventDayKey(e, tz);
    const list = byDay.get(key);
    if (list) list.push(e);
    else byDay.set(key, [e]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEvents]) => ({
      date,
      label: dayLabel(date, todayKey),
      isToday: date === todayKey,
      events: dayEvents.sort((a, b) => a.startIso.localeCompare(b.startIso)),
    }));
}

/** "09:30 – 10:00" in the manager's zone. */
export function timeRangeInTz(startIso: string, endIso: string, tz: string): string {
  const fmt = (iso: string) =>
    iso
      ? new Date(iso).toLocaleTimeString('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: '2-digit',
        })
      : '?';
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}
