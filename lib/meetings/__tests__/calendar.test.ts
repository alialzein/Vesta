import { describe, expect, it } from 'vitest';
import type { CalendarEventView } from '@/lib/graph/calendar';
import {
  addMonths,
  eventsByDay,
  hourRange,
  layoutDay,
  minutesOfDayInTz,
  monthGrid,
  monthKeyOf,
  monthLabel,
  weekDays,
  weekRangeLabel,
  weekStartKey,
} from '@/lib/meetings/calendar';

function event(over: Partial<CalendarEventView> = {}): CalendarEventView {
  return {
    id: over.id ?? 'e1',
    subject: 'Meeting',
    startIso: '2026-06-12T07:00:00Z',
    endIso: '2026-06-12T07:30:00Z',
    organizerName: null,
    organizerEmail: null,
    attendees: [],
    isOnline: false,
    joinUrl: null,
    location: null,
    webLink: null,
    isAllDay: false,
    ...over,
  };
}

describe('date-key arithmetic', () => {
  it('weekStartKey finds the Monday of any day', () => {
    expect(weekStartKey('2026-06-12')).toBe('2026-06-08'); // Friday → Monday
    expect(weekStartKey('2026-06-08')).toBe('2026-06-08'); // Monday stays
    expect(weekStartKey('2026-06-14')).toBe('2026-06-08'); // Sunday belongs to the past Monday
  });

  it('addMonths rolls years', () => {
    expect(addMonths('2026-06', 1)).toBe('2026-07');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('labels are human', () => {
    expect(monthKeyOf('2026-06-12')).toBe('2026-06');
    expect(monthLabel('2026-06')).toBe('June 2026');
    expect(weekRangeLabel('2026-06-08')).toBe('Jun 8 – 14');
    expect(weekRangeLabel('2026-06-29')).toBe('Jun 29 – Jul 5'); // crosses months
  });

  it('weekDays marks today and numbers the days', () => {
    const days = weekDays('2026-06-08', '2026-06-12');
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ date: '2026-06-08', weekday: 'Mon', dayNum: '8' });
    expect(days[4]).toMatchObject({ date: '2026-06-12', isToday: true });
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });
});

describe('monthGrid', () => {
  it('always yields 6 Monday-first weeks with in/out-of-month flags', () => {
    const cells = monthGrid('2026-06', '2026-06-12');
    expect(cells).toHaveLength(42);
    // June 2026 starts on a Monday.
    expect(cells[0]).toMatchObject({ date: '2026-06-01', inMonth: true });
    expect(cells.filter((c) => c.inMonth)).toHaveLength(30);
    expect(cells.find((c) => c.isToday)?.date).toBe('2026-06-12');
    // Trailing cells belong to July and are flagged out-of-month.
    expect(cells[41]).toMatchObject({ date: '2026-07-12', inMonth: false });
  });
});

describe('minutesOfDayInTz', () => {
  it('resolves clock minutes in the manager zone', () => {
    // 07:00 UTC = 10:00 in Beirut (+03, June).
    expect(minutesOfDayInTz('2026-06-12T07:00:00Z', 'Asia/Beirut')).toBe(600);
    expect(minutesOfDayInTz('2026-06-12T07:00:00Z', 'UTC')).toBe(420);
  });

  it('midnight is 0, not 1440', () => {
    expect(minutesOfDayInTz('2026-06-12T00:00:00Z', 'UTC')).toBe(0);
  });
});

describe('layoutDay', () => {
  it('overlapping meetings share the width side by side', () => {
    const blocks = layoutDay(
      [
        event({ id: 'a', startIso: '2026-06-12T09:00:00Z', endIso: '2026-06-12T10:00:00Z' }),
        event({ id: 'b', startIso: '2026-06-12T09:30:00Z', endIso: '2026-06-12T10:30:00Z' }),
        event({ id: 'c', startIso: '2026-06-12T11:00:00Z', endIso: '2026-06-12T11:30:00Z' }),
      ],
      'UTC',
    );
    const byId = Object.fromEntries(blocks.map((b) => [b.event.id, b]));
    expect(byId.a).toMatchObject({ startMin: 540, endMin: 600, col: 0, cols: 2 });
    expect(byId.b).toMatchObject({ col: 1, cols: 2 });
    // The 11:00 meeting is past the cluster — full width again.
    expect(byId.c).toMatchObject({ col: 0, cols: 1 });
  });

  it('skips all-day events and floors tiny ones at 20 minutes', () => {
    const blocks = layoutDay(
      [
        event({ id: 'holiday', isAllDay: true }),
        event({ id: 'instant', startIso: '2026-06-12T09:00:00Z', endIso: '2026-06-12T09:00:00Z' }),
      ],
      'UTC',
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].endMin - blocks[0].startMin).toBe(20);
  });
});

describe('hourRange', () => {
  it('defaults to business hours and stretches to cover early/late meetings', () => {
    expect(hourRange([[]])).toEqual({ startHour: 8, endHour: 18 });
    const early = layoutDay(
      [event({ startIso: '2026-06-12T06:10:00Z', endIso: '2026-06-12T21:40:00Z' })],
      'UTC',
    );
    expect(hourRange([early])).toEqual({ startHour: 6, endHour: 22 });
  });
});

describe('eventsByDay', () => {
  it('buckets a window into the 7 days of the week (manager tz)', () => {
    const map = eventsByDay(
      [
        // 23:30 UTC Thursday = 02:30 Friday in Beirut.
        event({ id: 'late', startIso: '2026-06-11T23:30:00Z', endIso: '2026-06-12T00:00:00Z' }),
        event({ id: 'out', startIso: '2026-06-20T09:00:00Z', endIso: '2026-06-20T10:00:00Z' }),
      ],
      '2026-06-08',
      'Asia/Beirut',
    );
    expect(map.get('2026-06-12')?.map((e) => e.id)).toEqual(['late']);
    expect([...map.keys()]).toHaveLength(7);
    // The out-of-week event lands nowhere in this map.
    expect([...map.values()].flat().map((e) => e.id)).toEqual(['late']);
  });
});
