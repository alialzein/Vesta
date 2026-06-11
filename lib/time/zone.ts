/**
 * Manager-timezone helpers (pure, no deps). The server runs in UTC, but due
 * dates, day buckets, the daily-brief date, and human date labels must follow
 * the MANAGER's clock (`profiles.timezone`, auto-detected from the browser).
 * Everything here takes an explicit IANA timezone and falls back to UTC when
 * the zone is missing or invalid — never throws into a calling feature.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_TZ = 'UTC';

/** True when `tz` is an IANA timezone this runtime can format with. */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** A safe timezone: the given one when valid, else UTC. */
export function safeTz(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}

/** The calendar date (YYYY-MM-DD) at `now` in the given timezone. */
export function todayInTz(tz: string | null | undefined, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Read a date's wall-clock fields in a timezone as a UTC-ms value. */
function wallTimeAsUtcMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // hour12:false can yield "24" for midnight in some runtimes — normalize.
  const hour = get('hour') % 24;
  return Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
}

/**
 * The UTC instant of a wall-clock time in a timezone — e.g.
 * zonedTimeToUtc('2026-06-12', '09:00', 'Asia/Beirut') → 2026-06-12T06:00:00Z.
 * Two-pass offset estimation handles DST; ambiguous/skipped local times resolve
 * to within an hour, which is fine for "due at 9 AM" semantics.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, tz: string | null | undefined): Date {
  const zone = safeTz(tz);
  const wallUtc = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
  // First guess: assume zero offset, then measure the real offset at the guess.
  let guess = wallUtc;
  for (let i = 0; i < 2; i++) {
    const offset = wallTimeAsUtcMs(new Date(guess), zone) - guess;
    guess = wallUtc - offset;
  }
  return new Date(guess);
}

/** Calendar days between an instant and now, counted in the manager's timezone
 *  (so "yesterday evening" is 1 day ago even if fewer than 24h passed). */
export function calendarDaysAgo(
  iso: string,
  tz: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(`${todayInTz(tz, d)}T00:00:00Z`).getTime();
  const b = new Date(`${todayInTz(tz, now)}T00:00:00Z`).getTime();
  return Math.round((b - a) / DAY_MS);
}

/** Short date label in the timezone, e.g. "Jun 9". Null for bad input. */
export function dayLabelInTz(iso: string | null | undefined, tz: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: safeTz(tz) });
}

/** Full received-at label with age, e.g. "Tue, Jun 9, 8:39 PM (2 days ago)".
 *  The age in plain words is what makes staleness unmissable to the model. */
export function receivedLabelInTz(
  iso: string | null | undefined,
  tz: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = calendarDaysAgo(iso, tz, now) ?? 0;
  const ago = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  const stamp = d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: safeTz(tz),
  });
  return `${stamp} (${ago})`;
}

/** Long human date in the timezone, e.g. "Thursday, June 11, 2026". */
export function longTodayInTz(tz: string | null | undefined, now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: safeTz(tz),
  });
}

/** Short weekday label for a YYYY-MM-DD calendar date (timezone-independent). */
export function weekdayShortOf(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

/** The last `days` calendar dates in the timezone, oldest → today. */
export function lastCalendarDays(
  tz: string | null | undefined,
  days: number,
  now: Date = new Date(),
): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(todayInTz(tz, new Date(now.getTime() - i * DAY_MS)));
  }
  return out;
}
