import { describe, expect, it } from 'vitest';
import {
  calendarDaysAgo,
  dayLabelInTz,
  isValidTimeZone,
  lastCalendarDays,
  longTodayInTz,
  receivedLabelInTz,
  safeTz,
  todayInTz,
  weekdayShortOf,
  zonedTimeToUtc,
} from '@/lib/time/zone';

// 22:00 UTC on Jun 11 — already Jun 12 in Beirut (UTC+3), still Jun 11 in NY.
const LATE_UTC = new Date('2026-06-11T22:00:00.000Z');

describe('isValidTimeZone / safeTz', () => {
  it('accepts real IANA zones and rejects junk', () => {
    expect(isValidTimeZone('Asia/Beirut')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
    expect(safeTz('Not/AZone')).toBe('UTC');
    expect(safeTz('Asia/Beirut')).toBe('Asia/Beirut');
  });
});

describe('todayInTz', () => {
  it('rolls the calendar date with the timezone', () => {
    expect(todayInTz('UTC', LATE_UTC)).toBe('2026-06-11');
    expect(todayInTz('Asia/Beirut', LATE_UTC)).toBe('2026-06-12'); // UTC+3
    expect(todayInTz('America/New_York', LATE_UTC)).toBe('2026-06-11'); // UTC-4 (EDT)
  });

  it('falls back to UTC for invalid zones', () => {
    expect(todayInTz('Not/AZone', LATE_UTC)).toBe('2026-06-11');
  });
});

describe('zonedTimeToUtc', () => {
  it('converts a wall-clock 9 AM to the right UTC instant', () => {
    expect(zonedTimeToUtc('2026-06-12', '09:00', 'Asia/Beirut').toISOString()).toBe(
      '2026-06-12T06:00:00.000Z',
    );
    // New York in June = EDT (UTC-4).
    expect(zonedTimeToUtc('2026-06-12', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-06-12T13:00:00.000Z',
    );
    expect(zonedTimeToUtc('2026-06-12', '09:00', 'UTC').toISOString()).toBe(
      '2026-06-12T09:00:00.000Z',
    );
  });

  it('handles winter offsets (no DST drift)', () => {
    // New York in January = EST (UTC-5).
    expect(zonedTimeToUtc('2026-01-15', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-01-15T14:00:00.000Z',
    );
  });
});

describe('calendarDaysAgo', () => {
  it('counts calendar days in the zone, not 24h blocks', () => {
    // 23:30 Beirut on Jun 11 vs 01:00 Beirut on Jun 12 — under 2h apart, 1 day ago.
    const sent = '2026-06-11T20:30:00.000Z'; // 23:30 Beirut
    const now = new Date('2026-06-11T22:00:00.000Z'); // 01:00 Beirut Jun 12
    expect(calendarDaysAgo(sent, 'Asia/Beirut', now)).toBe(1);
    expect(calendarDaysAgo(sent, 'UTC', now)).toBe(0); // same UTC day
  });
});

describe('labels', () => {
  it('formats day / received / long-today labels in the zone', () => {
    expect(dayLabelInTz('2026-06-09T20:39:00.000Z', 'UTC')).toBe('Jun 9');
    expect(dayLabelInTz('2026-06-09T22:39:00.000Z', 'Asia/Beirut')).toBe('Jun 10');
    const received = receivedLabelInTz(
      '2026-06-09T17:39:00.000Z',
      'Asia/Beirut',
      new Date('2026-06-11T12:00:00.000Z'),
    );
    expect(received).toContain('Jun 9');
    expect(received).toContain('8:39 PM');
    expect(received).toContain('(2 days ago)');
    expect(longTodayInTz('UTC', LATE_UTC)).toBe('Thursday, June 11, 2026');
    expect(longTodayInTz('Asia/Beirut', LATE_UTC)).toBe('Friday, June 12, 2026');
  });

  it('weekdayShortOf labels a calendar date', () => {
    expect(weekdayShortOf('2026-06-11')).toBe('Thu');
    expect(weekdayShortOf('2026-06-12')).toBe('Fri');
  });
});

describe('lastCalendarDays', () => {
  it('returns the trailing dates oldest-first in the zone', () => {
    const days = lastCalendarDays('Asia/Beirut', 3, LATE_UTC);
    expect(days).toEqual(['2026-06-10', '2026-06-11', '2026-06-12']);
  });
});
