import type { CalendarEventView } from '@/lib/graph/calendar';
import { addDays, eventDayKey } from '@/lib/meetings/group';

/**
 * Pure math for the Meetings calendar (week time-grid + month grid) — no I/O,
 * no DOM, unit tested. Dates are manager-local YYYY-MM-DD keys throughout
 * (resolved against profiles.timezone by the callers), so the grids land on
 * the manager's days wherever the server or browser runs.
 */

// ---------------------------------------------------------------------------
// Date-key arithmetic.
// ---------------------------------------------------------------------------

/** Monday of the week containing dateKey (business weeks start Monday). */
export function weekStartKey(dateKey: string): string {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(dateKey, -((day + 6) % 7));
}

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function addMonths(monthKey: string, months: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** "June 2026" */
export function monthLabel(monthKey: string): string {
  return new Date(`${monthKey}-15T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Jun 9 – 15" / "Jun 29 – Jul 5" for the week starting at weekStart. */
export function weekRangeLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const fmt = (key: string, withMonth: boolean) =>
    new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', {
      ...(withMonth ? { month: 'short' } : {}),
      day: 'numeric',
      timeZone: 'UTC',
    });
  const sameMonth = monthKeyOf(weekStart) === monthKeyOf(end);
  return `${fmt(weekStart, true)} – ${fmt(end, !sameMonth)}`;
}

export type WeekDay = {
  date: string;
  /** "Mon" */
  weekday: string;
  /** "9" */
  dayNum: string;
  isToday: boolean;
};

export function weekDays(weekStart: string, todayKey: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      weekday: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      }),
      dayNum: String(Number(date.slice(8, 10))),
      isToday: date === todayKey,
    };
  });
}

// ---------------------------------------------------------------------------
// Month grid — always 6 rows × 7 (Mon-first), like Outlook/Google.
// ---------------------------------------------------------------------------

export type MonthCell = { date: string; inMonth: boolean; isToday: boolean };

export function monthGrid(monthKey: string, todayKey: string): MonthCell[] {
  const first = `${monthKey}-01`;
  const start = weekStartKey(first);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: monthKeyOf(date) === monthKey, isToday: date === todayKey };
  });
}

// ---------------------------------------------------------------------------
// Week time-grid layout.
// ---------------------------------------------------------------------------

/** Minutes past local midnight of a UTC instant, in the manager's zone. */
export function minutesOfDayInTz(iso: string, tz: string): number {
  const hm = new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = hm.split(':').map(Number);
  return (h === 24 ? 0 : h) * 60 + m; // en-GB can yield "24:00" at midnight
}

export type TimedBlock = {
  event: CalendarEventView;
  /** Minutes past local midnight (clamped into this day). */
  startMin: number;
  endMin: number;
  /** Side-by-side slot when meetings overlap: this block's column / total. */
  col: number;
  cols: number;
};

/**
 * Lay out one day's TIMED events for the week grid: minutes-of-day plus
 * side-by-side columns for overlaps (a cluster of mutually overlapping
 * meetings shares the width, Google-Calendar style). All-day events are the
 * caller's strip; events ending at/before start render with a 20-min floor.
 */
export function layoutDay(events: CalendarEventView[], tz: string): TimedBlock[] {
  const blocks = events
    .filter((e) => !e.isAllDay && e.startIso)
    .map((e) => {
      const startMin = minutesOfDayInTz(e.startIso, tz);
      const rawEnd = e.endIso ? minutesOfDayInTz(e.endIso, tz) : startMin + 30;
      // Cross-midnight (or zero-length) ends clamp to end-of-day / a floor.
      const endMin =
        rawEnd > startMin ? rawEnd : e.endIso && rawEnd < startMin ? 24 * 60 : startMin + 20;
      return { event: e, startMin, endMin: Math.max(endMin, startMin + 20), col: 0, cols: 1 };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // Greedy column assignment within overlap clusters.
  let cluster: TimedBlock[] = [];
  let clusterEnd = -1;
  const closeCluster = () => {
    const cols = Math.max(1, ...cluster.map((b) => b.col + 1));
    for (const b of cluster) b.cols = cols;
    cluster = [];
  };
  for (const b of blocks) {
    if (cluster.length > 0 && b.startMin >= clusterEnd) closeCluster();
    const taken = new Set(
      cluster.filter((o) => o.endMin > b.startMin).map((o) => o.col),
    );
    let col = 0;
    while (taken.has(col)) col += 1;
    b.col = col;
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.endMin);
  }
  if (cluster.length > 0) closeCluster();
  return blocks;
}

/** The hour range the grid should show: 08–18 minimum, stretched to cover
 *  every timed event of the week (so nothing is ever clipped away). */
export function hourRange(blocksByDay: TimedBlock[][]): { startHour: number; endHour: number } {
  let startHour = 8;
  let endHour = 18;
  for (const day of blocksByDay) {
    for (const b of day) {
      startHour = Math.min(startHour, Math.floor(b.startMin / 60));
      endHour = Math.max(endHour, Math.ceil(b.endMin / 60));
    }
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

/** Split a window of events into per-day buckets for a 7-day week. */
export function eventsByDay(
  events: CalendarEventView[],
  weekStart: string,
  tz: string,
): Map<string, CalendarEventView[]> {
  const days = new Map<string, CalendarEventView[]>();
  for (let i = 0; i < 7; i += 1) days.set(addDays(weekStart, i), []);
  for (const e of events) {
    if (!e.startIso) continue;
    days.get(eventDayKey(e, tz))?.push(e);
  }
  return days;
}
