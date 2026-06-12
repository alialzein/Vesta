import { describe, expect, it } from 'vitest';
import { dayKeyInTz, dayLabel, groupMeetingsByDay, timeRangeInTz } from '@/lib/meetings/group';
import type { CalendarEventView } from '@/lib/graph/calendar';

function event(id: string, startIso: string, endIso: string): CalendarEventView {
  return {
    id,
    subject: `Meeting ${id}`,
    startIso,
    endIso,
    organizerName: null,
    organizerEmail: null,
    attendees: [],
    isOnline: false,
    joinUrl: null,
    location: null,
  };
}

describe('dayKeyInTz', () => {
  it('resolves the day in the MANAGER timezone, not UTC', () => {
    // 22:30 UTC on Jun 12 is already Jun 13 in Beirut (UTC+3).
    expect(dayKeyInTz('2026-06-12T22:30:00Z', 'Asia/Beirut')).toBe('2026-06-13');
    expect(dayKeyInTz('2026-06-12T22:30:00Z', 'UTC')).toBe('2026-06-12');
  });
});

describe('dayLabel', () => {
  it('labels today, tomorrow, and plain days', () => {
    expect(dayLabel('2026-06-12', '2026-06-12')).toBe('Today — Friday, June 12');
    expect(dayLabel('2026-06-13', '2026-06-12')).toBe('Tomorrow — Saturday, June 13');
    expect(dayLabel('2026-06-15', '2026-06-12')).toBe('Monday, June 15');
  });
});

describe('groupMeetingsByDay', () => {
  it('always puts today first — even with no meetings — and only keeps non-empty other days', () => {
    const days = groupMeetingsByDay(
      [event('a', '2026-06-14T09:00:00Z', '2026-06-14T10:00:00Z')],
      'UTC',
      '2026-06-12',
    );
    expect(days.map((d) => d.date)).toEqual(['2026-06-12', '2026-06-14']);
    expect(days[0].isToday).toBe(true);
    expect(days[0].events).toHaveLength(0);
    expect(days[1].events.map((e) => e.id)).toEqual(['a']);
  });

  it('sorts events within a day by start time', () => {
    const days = groupMeetingsByDay(
      [
        event('late', '2026-06-12T15:00:00Z', '2026-06-12T16:00:00Z'),
        event('early', '2026-06-12T08:00:00Z', '2026-06-12T09:00:00Z'),
      ],
      'UTC',
      '2026-06-12',
    );
    expect(days[0].events.map((e) => e.id)).toEqual(['early', 'late']);
  });

  it('buckets a late-UTC event onto the next manager-local day', () => {
    const days = groupMeetingsByDay(
      [event('x', '2026-06-12T22:30:00Z', '2026-06-12T23:00:00Z')],
      'Asia/Beirut',
      '2026-06-12',
    );
    // Today (empty) + the event on Jun 13 Beirut time.
    expect(days.map((d) => d.date)).toEqual(['2026-06-12', '2026-06-13']);
  });
});

describe('timeRangeInTz', () => {
  it('formats the range in the manager zone', () => {
    expect(timeRangeInTz('2026-06-12T12:00:00Z', '2026-06-12T12:30:00Z', 'Asia/Beirut')).toBe(
      '3:00 PM – 3:30 PM',
    );
  });
});
