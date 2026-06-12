'use client';

import { useMemo } from 'react';
import type { CalendarEventView } from '@/lib/graph/calendar';
import { monthGrid } from '@/lib/meetings/calendar';
import { eventDayKey, timeRangeInTz } from '@/lib/meetings/group';

/**
 * The month view — a classic Outlook/Google month: 6×7 manager-local days,
 * each with up to two event pills and a "+N more". Tapping a pill opens that
 * meeting; tapping the day (or +N) opens the whole day. All-day events
 * (holidays/OOO) wear the violet pill. Theme tokens only — both themes.
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_PILLS = 2;

export function MonthGrid({
  monthKey,
  todayKey,
  timezone,
  events,
  onSelectEvent,
  onSelectDay,
}: {
  monthKey: string;
  todayKey: string;
  timezone: string;
  events: CalendarEventView[];
  onSelectEvent: (event: CalendarEventView) => void;
  onSelectDay: (date: string) => void;
}) {
  const cells = useMemo(() => monthGrid(monthKey, todayKey), [monthKey, todayKey]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEventView[]>();
    for (const e of events) {
      if (!e.startIso) continue;
      const key = eventDayKey(e, timezone);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    for (const list of map.values()) list.sort((a, b) => a.startIso.localeCompare(b.startIso));
    return map;
  }, [events, timezone]);

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-panel shadow-soft">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-[7px] text-center text-[10.5px] font-semibold uppercase tracking-wide text-muted"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dayEvents = byDay.get(cell.date) ?? [];
          const extra = dayEvents.length - MAX_PILLS;
          return (
            <div
              key={cell.date}
              className={[
                'flex min-h-[76px] flex-col gap-[3px] border-line p-[4px] sm:min-h-[96px] sm:p-[6px]',
                i % 7 !== 0 ? 'border-l' : '',
                i >= 7 ? 'border-t' : '',
                cell.inMonth ? '' : 'bg-panel-2 opacity-55',
                cell.isToday ? 'bg-accent-soft/40' : '',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onSelectDay(cell.date)}
                aria-label={`Open ${cell.date}${dayEvents.length > 0 ? ` — ${dayEvents.length} meeting${dayEvents.length === 1 ? '' : 's'}` : ''}`}
                className={[
                  'grid h-[22px] w-[22px] flex-none place-items-center self-start rounded-full font-mono text-[11px] font-bold transition hover:bg-accent-soft',
                  cell.isToday
                    ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_4px_12px_rgba(47,125,235,0.4)]'
                    : 'text-ink-soft',
                ].join(' ')}
              >
                {Number(cell.date.slice(8, 10))}
              </button>

              {dayEvents.slice(0, MAX_PILLS).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelectEvent(e)}
                  title={`${e.subject} — ${e.isAllDay ? 'all day' : timeRangeInTz(e.startIso, e.endIso, timezone)}`}
                  className={[
                    'truncate rounded-[6px] px-[5px] py-[2px] text-left text-[10px] font-semibold transition hover:brightness-110',
                    e.isAllDay ? 'bg-violet-soft text-violet' : 'bg-accent-soft text-accent',
                  ].join(' ')}
                >
                  {e.subject}
                </button>
              ))}
              {extra > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectDay(cell.date)}
                  className="self-start rounded-[6px] px-[5px] py-[1px] text-[10px] font-semibold text-muted transition hover:bg-panel-2 hover:text-ink"
                >
                  +{extra} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
