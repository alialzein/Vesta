/**
 * Lightweight natural-language parser for the manual "quick add" task box (Phase 8).
 *
 * Pure + deterministic (no AI cost, instant, client-and-server safe). It pulls a due
 * date/time out of a phrase like "Call the vendor tomorrow 3pm" and returns the
 * cleaned title plus the resolved absolute time. It deliberately handles the common
 * cases well rather than every phrasing — AI-assisted parsing can layer on later.
 */

export type ParsedTask = {
  /** The task text with the date/time words and any "remind me to" prefix removed. */
  title: string;
  /** Resolved due time as an ISO string, or null when no date/time was found. */
  dueAt: string | null;
};

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/** Default time-of-day (24h) for a date given without a clock time. */
const DEFAULT_HOUR = 9;

function atMidnight(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Parse "3pm", "3:30 pm", "at 9am", "15:00" → {hour, minute} or null. */
function matchTime(text: string): { hour: number; minute: number; raw: string } | null {
  // 12-hour with am/pm (am/pm required so we don't grab a bare "3" from "in 3 days").
  const twelve = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (twelve) {
    let hour = parseInt(twelve[1], 10) % 12;
    if (twelve[3].toLowerCase() === 'pm') hour += 12;
    return { hour, minute: twelve[2] ? parseInt(twelve[2], 10) : 0, raw: twelve[0] };
  }
  // 24-hour HH:MM (needs the colon to be unambiguous).
  const military = text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (military) {
    return { hour: parseInt(military[1], 10), minute: parseInt(military[2], 10), raw: military[0] };
  }
  return null;
}

/** Resolve a date phrase → a Date at midnight (time applied later), plus matched text. */
function matchDate(text: string, now: Date): { date: Date; raw: string; eveningDefault?: boolean } | null {
  const today = atMidnight(now);

  const tonight = text.match(/\btonight\b/i);
  if (tonight) return { date: today, raw: tonight[0], eveningDefault: true };

  // Tolerate common misspellings (tommorw, tomorow, tommorrow, 2morrow, …).
  const tomorrow = text.match(/\b(?:tomorrow|tomorow|tommorow|tommorrow|tommorw|tmrw|2morrow)\b/i);
  if (tomorrow) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d, raw: tomorrow[0] };
  }

  const today2 = text.match(/\btoday\b/i);
  if (today2) return { date: today, raw: today2[0] };

  const nextWeek = text.match(/\bnext week\b/i);
  if (nextWeek) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return { date: d, raw: nextWeek[0] };
  }

  const inN = text.match(/\bin\s+(\d+)\s+(day|days|week|weeks|hour|hours)\b/i);
  if (inN) {
    const n = parseInt(inN[1], 10);
    const unit = inN[2].toLowerCase();
    const d = new Date(now);
    if (unit.startsWith('day')) d.setDate(d.getDate() + n);
    else if (unit.startsWith('week')) d.setDate(d.getDate() + n * 7);
    else d.setHours(d.getHours() + n); // hours: keep the time-of-day shift
    return { date: unit.startsWith('hour') ? d : atMidnight(d), raw: inN[0] };
  }

  const weekday = text.match(
    /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  );
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[2].toLowerCase());
    let delta = (target - today.getDay() + 7) % 7;
    if (delta === 0) delta = 7; // "monday" on a Monday means the next one
    if (weekday[1]) delta += 7; // "next monday"
    const d = new Date(today);
    d.setDate(d.getDate() + delta);
    return { date: d, raw: weekday[0] };
  }

  return null;
}

/** Remove a matched phrase (case-insensitive, first occurrence) from the title. */
function strip(title: string, raw: string): string {
  const idx = title.toLowerCase().indexOf(raw.toLowerCase());
  if (idx < 0) return title;
  return title.slice(0, idx) + title.slice(idx + raw.length);
}

/** Tidy a title after stripping: drop dangling prepositions/connectors + extra space. */
function tidy(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/\s+[,;:-]+\s*$/, '')
    .replace(/\b(at|on|by|this|next)\s*$/i, '')
    .replace(/^(remind me to|remind me|remember to|note to self:?|todo:?|to-do:?|task:?)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseQuickTask(input: string, now: Date = new Date()): ParsedTask {
  const original = input.trim();
  if (!original) return { title: '', dueAt: null };

  // Strip a leading "remind me to" style prefix up front so date matching sees the rest.
  let working = original.replace(
    /^(remind me to|remind me|remember to|note to self:?|todo:?|to-do:?|task:?)\s+/i,
    '',
  );

  const dateMatch = matchDate(working, now);
  if (dateMatch) working = strip(working, dateMatch.raw);
  const timeMatch = matchTime(working);
  if (timeMatch) working = strip(working, timeMatch.raw);

  let dueAt: string | null = null;
  if (dateMatch || timeMatch) {
    let due: Date;
    if (dateMatch) {
      due = new Date(dateMatch.date);
      if (timeMatch) due.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
      else if (dateMatch.eveningDefault) due.setHours(19, 0, 0, 0);
      // "in N hours" already carries a time; only apply the default to date-only phrases.
      else if (!/\bin\s+\d+\s+hours?\b/i.test(dateMatch.raw)) due.setHours(DEFAULT_HOUR, 0, 0, 0);
    } else {
      // Time only → today at that time, rolling to tomorrow if it already passed.
      due = atMidnight(now);
      due.setHours(timeMatch!.hour, timeMatch!.minute, 0, 0);
      if (due.getTime() <= now.getTime()) due.setDate(due.getDate() + 1);
    }
    dueAt = due.toISOString();
  }

  const title = tidy(working) || tidy(original) || original;
  return { title, dueAt };
}
