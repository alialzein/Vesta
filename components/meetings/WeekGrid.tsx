'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CalendarEventView } from '@/lib/graph/calendar';
import {
  eventsByDay,
  hourRange,
  layoutDay,
  minutesOfDayInTz,
  weekDays,
  type TimedBlock,
} from '@/lib/meetings/calendar';
import { timeRangeInTz } from '@/lib/meetings/group';

/**
 * The week time-grid (Google-Calendar style, Vesta-styled): 7 day columns on
 * hour lines, meetings as positioned blocks (overlaps share the width), an
 * all-day strip for holidays/OOO, and a glowing "now" line sweeping across
 * today. Pure math lives in lib/meetings/calendar; this renders it.
 * Horizontal scroll keeps it usable on phones; both themes via tokens only.
 */

const HOUR_PX = 56;

export function WeekGrid({
  weekStart,
  todayKey,
  timezone,
  events,
  onSelect,
}: {
  weekStart: string;
  todayKey: string;
  timezone: string;
  events: CalendarEventView[];
  onSelect: (event: CalendarEventView) => void;
}) {
  const days = useMemo(() => weekDays(weekStart, todayKey), [weekStart, todayKey]);
  const byDay = useMemo(
    () => eventsByDay(events, weekStart, timezone),
    [events, weekStart, timezone],
  );
  const blocksByDay = useMemo(
    () =>
      days.map((d) =>
        layoutDay(
          (byDay.get(d.date) ?? []).filter((e) => !e.isAllDay),
          timezone,
        ),
      ),
    [days, byDay, timezone],
  );
  const { startHour, endHour } = useMemo(() => hourRange(blocksByDay), [blocksByDay]);
  const gridH = (endHour - startHour) * HOUR_PX;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // The "now" line, re-anchored every minute (manager timezone).
  const [nowMin, setNowMin] = useState(() => minutesOfDayInTz(new Date().toISOString(), timezone));
  useEffect(() => {
    const t = setInterval(
      () => setNowMin(minutesOfDayInTz(new Date().toISOString(), timezone)),
      60_000,
    );
    return () => clearInterval(t);
  }, [timezone]);
  const nowTop = ((nowMin - startHour * 60) / 60) * HOUR_PX;
  const nowMs = Date.now();

  const hasAllDay = days.some((d) => (byDay.get(d.date) ?? []).some((e) => e.isAllDay));
  const cols = 'grid grid-cols-[48px_repeat(7,minmax(86px,1fr))]';

  return (
    <div className="v-scroll overflow-x-auto rounded-[14px] border border-line bg-panel shadow-soft">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className={`${cols} border-b border-line`}>
          <div aria-hidden="true" />
          {days.map((d) => (
            <div key={d.date} className="flex items-center justify-center gap-[6px] py-[8px]">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide ${d.isToday ? 'text-accent' : 'text-muted'}`}
              >
                {d.weekday}
              </span>
              <span
                className={[
                  'grid h-[24px] w-[24px] place-items-center rounded-full font-mono text-[12px] font-bold',
                  d.isToday
                    ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_4px_12px_rgba(47,125,235,0.4)]'
                    : 'text-ink-soft',
                ].join(' ')}
              >
                {d.dayNum}
              </span>
            </div>
          ))}
        </div>

        {/* All-day strip (holidays, OOO) */}
        {hasAllDay && (
          <div className={`${cols} border-b border-line`}>
            <div className="py-[6px] pr-[6px] text-right font-mono text-[9px] uppercase text-muted">
              all-day
            </div>
            {days.map((d) => (
              <div key={d.date} className="flex flex-col gap-[3px] border-l border-line p-[3px]">
                {(byDay.get(d.date) ?? [])
                  .filter((e) => e.isAllDay)
                  .map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelect(e)}
                      className="truncate rounded-[6px] bg-violet-soft px-[6px] py-[3px] text-left text-[10.5px] font-semibold text-violet transition hover:brightness-110"
                    >
                      {e.subject}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className={cols}>
          {/* Hour gutter */}
          <div className="relative" style={{ height: gridH }}>
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-[6px] -translate-y-1/2 font-mono text-[9.5px] text-muted"
                style={{ top: (h - startHour) * HOUR_PX }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {days.map((d, i) => (
            <div
              key={d.date}
              className="relative border-l border-line"
              style={{ height: gridH }}
            >
              {d.isToday && (
                <div aria-hidden="true" className="absolute inset-0 bg-accent-soft opacity-40" />
              )}
              {hours.slice(1).map((h) => (
                <div
                  key={h}
                  aria-hidden="true"
                  className="absolute left-0 right-0 border-t border-line opacity-60"
                  style={{ top: (h - startHour) * HOUR_PX }}
                />
              ))}

              {blocksByDay[i].map((b) => (
                <EventBlock
                  key={b.event.id}
                  block={b}
                  startHour={startHour}
                  timezone={timezone}
                  live={
                    Boolean(b.event.startIso && b.event.endIso) &&
                    nowMs >= new Date(b.event.startIso).getTime() &&
                    nowMs < new Date(b.event.endIso).getTime()
                  }
                  onSelect={onSelect}
                />
              ))}

              {d.isToday && nowTop >= 0 && nowTop <= gridH && (
                <div
                  aria-hidden="true"
                  className="absolute left-0 right-0 z-20"
                  style={{ top: nowTop }}
                >
                  <span className="absolute -left-[4px] -top-[3px] h-[8px] w-[8px] animate-vesta-pulse rounded-full bg-accent shadow-[0_0_8px_rgba(47,125,235,0.8)]" />
                  <div className="h-[2px] bg-gradient-to-r from-accent via-accent to-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventBlock({
  block,
  startHour,
  timezone,
  live,
  onSelect,
}: {
  block: TimedBlock;
  startHour: number;
  timezone: string;
  live: boolean;
  onSelect: (event: CalendarEventView) => void;
}) {
  const { event, startMin, endMin, col, cols } = block;
  const top = ((startMin - startHour * 60) / 60) * HOUR_PX;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 2, 22);
  const width = 100 / cols;
  // Blocks under ~45 min can't fit two lines — collapse to one (title + start),
  // Google-Calendar style, so short meetings never render clipped text.
  const compact = height < 38;

  const liveDot = live && (
    <span className="mr-[4px] inline-block h-[5px] w-[5px] animate-vesta-pulse rounded-full bg-white align-middle" />
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      aria-label={`${event.subject}, ${timeRangeInTz(event.startIso, event.endIso, timezone)}`}
      className={[
        'absolute z-10 flex flex-col justify-center overflow-hidden rounded-[8px] border-l-[3px] px-[6px] py-[2px] text-left shadow-soft transition hover:z-30 hover:brightness-110',
        live
          ? 'border-l-accent bg-gradient-to-br from-accent to-accent-2 text-white'
          : 'border-l-accent border border-line bg-card text-ink',
      ].join(' ')}
      style={{
        top,
        height,
        left: `calc(${col * width}% + 2px)`,
        width: `calc(${width}% - 4px)`,
      }}
    >
      {compact ? (
        <span className="flex min-w-0 items-baseline gap-[6px]">
          <span className="truncate text-[11px] font-semibold leading-none">
            {liveDot}
            {event.subject}
          </span>
          <span
            className={`flex-none font-mono text-[9px] font-semibold ${live ? 'text-white/85' : 'text-muted'}`}
          >
            {startTimeInTz(event.startIso, timezone)}
          </span>
        </span>
      ) : (
        <>
          <span
            className={`block truncate font-mono text-[9px] font-semibold ${live ? 'text-white/85' : 'text-muted'}`}
          >
            {liveDot}
            {timeRangeInTz(event.startIso, event.endIso, timezone)}
          </span>
          <span className="block truncate text-[11px] font-semibold leading-tight">
            {event.subject}
          </span>
        </>
      )}
    </button>
  );
}

/** "1:00 PM" in the manager's zone — the compact block's whole time story. */
function startTimeInTz(iso: string, tz: string): string {
  return iso
    ? new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
    : '?';
}
