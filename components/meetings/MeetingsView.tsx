'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { MeetingsData } from '@/lib/meetings/data';
import type { CalendarEventView } from '@/lib/graph/calendar';
import {
  dayLabel,
  eventDayKey,
  groupMeetingsByDay,
  timeRangeInTz,
  addDays,
} from '@/lib/meetings/group';
import {
  addMonths,
  monthKeyOf,
  monthLabel,
  weekRangeLabel,
  weekStartKey,
} from '@/lib/meetings/calendar';
import { generateMeetingPrep, getCalendarRange, type PrepResult } from '@/app/actions/meetings';
import type { MeetingPrep } from '@/lib/ai/meeting-prep';
import { WeekGrid } from '@/components/meetings/WeekGrid';
import { MonthGrid } from '@/components/meetings/MonthGrid';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * Meetings v2 — the manager's real Outlook calendar, three ways:
 * **Week** (time-grid with the live "now" line), **Month** (classic grid),
 * **Agenda** (today + 7 days, the v1 list). One event store feeds all three;
 * navigating past the server-rendered window fetches more via
 * getCalendarRange. Tapping any meeting anywhere opens the same detail card
 * (Join / Open in Outlook / Prep with Vesta). Still read-only — creation
 * stays in chat behind the Confirm card.
 */

type ViewMode = 'week' | 'month' | 'agenda';
const VIEW_KEY = 'vesta-meetings-view';

export function MeetingsView({ data }: { data: MeetingsData }) {
  if (data.status === 'no_mailbox') {
    return (
      <EmptyState
        title="Connect your mailbox first"
        body="Meetings come straight from your Outlook calendar. Connect your mailbox in Settings and they appear here."
        cta={{ href: '/settings', label: 'Go to Settings' }}
      />
    );
  }
  if (data.status === 'needs_reconnect') {
    return (
      <EmptyState
        title="Reconnect to enable your calendar"
        body="Your mailbox was connected before calendar access existed. Reconnect once (Settings → Email connection → Reconnect) to grant it — read-only here; Vesta never changes events without your confirmation."
        cta={{ href: '/settings', label: 'Open Settings' }}
      />
    );
  }
  if (data.status === 'error') {
    return (
      <EmptyState
        title="Couldn't reach your calendar"
        body="Outlook didn't answer just now. Reload in a moment — your schedule is safe; this is only a read hiccup."
      />
    );
  }
  return <CalendarShell data={data} />;
}

function CalendarShell({ data }: { data: Extract<MeetingsData, { status: 'ok' }> }) {
  const { timezone, todayKey } = data;
  const { showToast } = useToast();

  const [view, setView] = useState<ViewMode>('week');
  const [weekStart, setWeekStart] = useState(() => weekStartKey(todayKey));
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(todayKey));
  const [events, setEvents] = useState<CalendarEventView[]>(data.events);
  const [window_, setWindow] = useState({ from: data.windowFromKey, to: data.windowToKey });
  const [busy, setBusy] = useState(false);
  // The detail overlay shows one meeting, or a whole day from the month view.
  const [selected, setSelected] = useState<
    | { kind: 'event'; event: CalendarEventView }
    | { kind: 'day'; date: string }
    | null
  >(null);

  // Restore the manager's preferred view; phones default to the agenda list.
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_KEY);
    if (stored === 'week' || stored === 'month' || stored === 'agenda') {
      setView(stored);
    } else if (window.matchMedia?.('(max-width: 640px)')?.matches) {
      setView('agenda');
    }
  }, []);
  function switchView(v: ViewMode) {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  }

  // Fetch events for day ranges the initial window doesn't cover.
  const ensureRange = useCallback(
    async (fromKey: string, toKey: string) => {
      if (fromKey >= window_.from && toKey <= window_.to) return;
      setBusy(true);
      const res = await getCalendarRange({ fromKey, toKey });
      setBusy(false);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      setEvents((prev) => {
        const known = new Set(prev.map((e) => e.id));
        return [...prev, ...res.events.filter((e) => !known.has(e.id))];
      });
      setWindow((w) => ({
        from: fromKey < w.from ? fromKey : w.from,
        to: toKey > w.to ? toKey : w.to,
      }));
    },
    [window_, showToast],
  );

  function navigate(delta: -1 | 1) {
    if (view === 'month') {
      const next = addMonths(monthKey, delta);
      setMonthKey(next);
      void ensureRange(weekStartKey(`${next}-01`), `${addMonths(next, 1)}-08`);
    } else {
      const next = addDays(weekStart, delta * 7);
      setWeekStart(next);
      void ensureRange(next, addDays(next, 7));
    }
  }
  function goToday() {
    setWeekStart(weekStartKey(todayKey));
    setMonthKey(monthKeyOf(todayKey));
  }
  function openDayWeek(date: string) {
    // From the month grid: jump straight to that day's week.
    setWeekStart(weekStartKey(date));
    switchView('week');
    void ensureRange(weekStartKey(date), addDays(weekStartKey(date), 7));
  }

  const agendaDays = useMemo(() => {
    const horizon = addDays(todayKey, 8);
    const upcoming = events.filter((e) => {
      if (!e.startIso) return false;
      const key = eventDayKey(e, timezone);
      return key >= todayKey && key < horizon;
    });
    return groupMeetingsByDay(upcoming, timezone, todayKey);
  }, [events, timezone, todayKey]);

  const selectedDayEvents = useMemo(() => {
    if (selected?.kind !== 'day') return [];
    return events
      .filter((e) => e.startIso && eventDayKey(e, timezone) === selected.date)
      .sort((a, b) => a.startIso.localeCompare(b.startIso));
  }, [selected, events, timezone]);

  const periodLabel =
    view === 'month' ? monthLabel(monthKey) : view === 'week' ? weekRangeLabel(weekStart) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls: view switch + period navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Calendar view"
          className="flex overflow-hidden rounded-[11px] border border-line bg-panel"
        >
          {(['week', 'month', 'agenda'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => switchView(v)}
              className={[
                'px-[13px] py-[7px] text-[12px] font-semibold capitalize transition',
                view === v
                  ? 'bg-gradient-to-br from-accent to-accent-2 text-white'
                  : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {v}
            </button>
          ))}
        </div>

        {view !== 'agenda' && (
          <div className="flex items-center gap-[6px]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
              className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-line bg-panel text-muted transition hover:border-accent hover:text-accent"
            >
              <Icon name="chevronLeft" className="h-[13px] w-[13px]" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-[9px] border border-line bg-panel px-[11px] py-[6px] text-[12px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label={view === 'month' ? 'Next month' : 'Next week'}
              className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-line bg-panel text-muted transition hover:border-accent hover:text-accent"
            >
              <Icon name="chevronRight" className="h-[13px] w-[13px]" />
            </button>
          </div>
        )}

        {periodLabel && (
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            {periodLabel}
          </span>
        )}
        {busy && (
          <span className="inline-flex items-center gap-[6px] text-[11.5px] font-semibold text-muted">
            <span className="h-[6px] w-[6px] animate-vesta-pulse rounded-full bg-accent" />
            Loading…
          </span>
        )}
      </div>

      {view === 'week' && (
        <WeekGrid
          weekStart={weekStart}
          todayKey={todayKey}
          timezone={timezone}
          events={events}
          onSelect={(event) => setSelected({ kind: 'event', event })}
        />
      )}
      {view === 'month' && (
        <MonthGrid
          monthKey={monthKey}
          todayKey={todayKey}
          timezone={timezone}
          events={events}
          onSelectEvent={(event) => setSelected({ kind: 'event', event })}
          onSelectDay={openDayWeek}
        />
      )}
      {view === 'agenda' && (
        <div className="flex flex-col gap-5">
          {agendaDays.map((day) => (
            <section key={day.date}>
              <h2
                className={[
                  'm-0 mb-2 font-display text-[15px] font-semibold tracking-tight',
                  day.isToday ? 'text-ink' : 'text-ink-soft',
                ].join(' ')}
              >
                {day.label}
                <span className="ml-2 rounded-full bg-panel-2 px-[8px] py-[2px] font-mono text-[11px] font-semibold text-muted">
                  {day.events.length}
                </span>
              </h2>
              {day.events.length === 0 ? (
                <p className="m-0 rounded-[14px] border border-dashed border-line bg-panel-2 px-4 py-4 text-[13px] text-muted">
                  No meetings today — a clear runway.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {day.events.map((e) => (
                    <MeetingCard key={e.id} event={e} timezone={timezone} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
        <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
        Read-only view of your Outlook calendar. To create a meeting, ask Vesta in chat — it
        proposes, you confirm.
      </p>

      {selected && (
        <DetailOverlay
          title={
            selected.kind === 'day' ? dayLabel(selected.date, todayKey) : 'Meeting details'
          }
          onClose={() => setSelected(null)}
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(selected.kind === 'event' ? [selected.event] : selectedDayEvents).map((e) => (
              <MeetingCard key={e.id} event={e} timezone={timezone} />
            ))}
            {selected.kind === 'day' && selectedDayEvents.length === 0 && (
              <li className="rounded-[14px] border border-dashed border-line bg-panel-2 px-4 py-4 text-[13px] text-muted">
                Nothing scheduled this day — a clear runway.
              </li>
            )}
          </ul>
        </DetailOverlay>
      )}
    </div>
  );
}

/** Centered overlay used for meeting/day details — backdrop or Escape closes. */
function DetailOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center"
    >
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 cursor-default border-none bg-black/50 backdrop-blur-[2px]"
      />
      <div className="v-scroll relative max-h-[82dvh] w-full max-w-[560px] overflow-y-auto rounded-[16px] border border-line bg-panel-solid p-4 shadow-panel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="m-0 font-display text-[16px] font-semibold tracking-tight text-ink">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] border-none bg-panel-2 text-muted transition hover:bg-red-soft hover:text-red"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MeetingCard({ event, timezone }: { event: CalendarEventView; timezone: string }) {
  const { showToast } = useToast();
  const [prepState, setPrepState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [prep, setPrep] = useState<MeetingPrep | null>(null);
  const [threadCount, setThreadCount] = useState(0);

  const now = Date.now();
  const live =
    event.startIso &&
    event.endIso &&
    now >= new Date(event.startIso).getTime() &&
    now < new Date(event.endIso).getTime();

  const attendeeNames = event.attendees.map((a) => a.name || a.email);
  const shownAttendees = attendeeNames.slice(0, 3).join(', ');
  const moreAttendees = attendeeNames.length - 3;

  async function runPrep() {
    if (prepState === 'loading') return;
    setPrepState('loading');
    const res: PrepResult = await generateMeetingPrep({
      subject: event.subject,
      startIso: event.startIso,
      organizer: event.organizerName ?? event.organizerEmail,
      attendees: event.attendees.map((a) => a.email),
    });
    if (res.ok) {
      setPrep(res.prep);
      setThreadCount(res.threadCount);
      setPrepState('ready');
    } else {
      setPrepState('idle');
      showToast(res.error);
    }
  }

  return (
    <li
      className={[
        'rounded-[14px] border bg-card p-[12px] shadow-soft transition sm:p-[14px]',
        live ? 'border-accent' : 'border-line',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[12.5px] font-semibold text-ink-soft">
          {event.isAllDay ? 'All day' : timeRangeInTz(event.startIso, event.endIso, timezone)}
        </span>
        {live && (
          <span className="inline-flex items-center gap-[5px] rounded-full bg-accent-soft px-[8px] py-[2px] font-mono text-[10.5px] font-bold uppercase tracking-wide text-accent">
            <span className="h-[6px] w-[6px] animate-vesta-pulse rounded-full bg-accent" />
            Now
          </span>
        )}
        {event.isOnline && !event.joinUrl && (
          <span className="rounded-full bg-panel-2 px-[8px] py-[2px] font-mono text-[10.5px] font-semibold text-muted">
            Online
          </span>
        )}
        {event.location && (
          <span className="truncate text-[11.5px] text-muted">{event.location}</span>
        )}
      </div>

      <h3 className="m-0 mt-[4px] text-[14.5px] font-semibold leading-snug text-ink">
        {event.subject}
      </h3>
      <p className="m-0 mt-[2px] text-[12px] text-muted">
        {event.organizerName || event.organizerEmail ? (
          <>Organizer: {event.organizerName ?? event.organizerEmail}</>
        ) : null}
        {attendeeNames.length > 0 && (
          <>
            {event.organizerName || event.organizerEmail ? ' · ' : ''}
            {shownAttendees}
            {moreAttendees > 0 ? ` +${moreAttendees}` : ''}
          </>
        )}
      </p>

      <div className="mt-[10px] flex flex-wrap items-center gap-[8px]">
        {event.joinUrl && (
          <a
            href={event.joinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[6px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[13px] py-[8px] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.3)] transition hover:brightness-110"
          >
            <Icon name="calendar" className="h-[14px] w-[14px]" />
            Join
          </a>
        )}
        {event.webLink && (
          <a
            href={event.webLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[6px] rounded-[11px] border border-line bg-panel px-[13px] py-[8px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
          >
            <Icon name="mail" className="h-[14px] w-[14px]" />
            Open in Outlook
          </a>
        )}
        <button
          type="button"
          onClick={() => void runPrep()}
          disabled={prepState === 'loading'}
          className="inline-flex items-center gap-[6px] rounded-[11px] border border-line-strong bg-panel-solid px-[13px] py-[8px] text-[12.5px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon
            name="sparkle"
            className={`h-[14px] w-[14px] ${prepState === 'loading' ? 'animate-vesta-pulse' : ''}`}
          />
          {prepState === 'loading'
            ? 'Vesta is prepping…'
            : prep
              ? 'Refresh prep'
              : 'Prep with Vesta'}
        </button>
      </div>

      {prep && (
        <div className="mt-[12px] rounded-[12px] border border-line bg-panel-solid p-[12px]">
          <p className="m-0 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent">
            Vesta&apos;s prep
            <span className="ml-2 normal-case tracking-normal text-muted">
              {threadCount > 0
                ? `from ${threadCount} email thread${threadCount === 1 ? '' : 's'} with these attendees`
                : 'no email history with these attendees'}
            </span>
          </p>
          <PrepList heading="What's live" items={prep.keyPoints} />
          <PrepList heading="Still open" items={prep.openItems} />
          <PrepList heading="Worth asking" items={prep.questions} />
        </div>
      )}
    </li>
  );
}

function PrepList({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-[8px]">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        {heading}
      </p>
      <ul className="m-0 mt-[3px] flex list-none flex-col gap-[3px] p-0">
        {items.map((line) => (
          <li key={line} className="flex gap-[7px] text-[12.5px] leading-snug text-ink-soft">
            <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-accent" aria-hidden="true" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon name="calendar" className="h-6 w-6" />
      </span>
      <h2 className="mt-3 font-display text-[18px] font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-1 max-w-[460px] text-[13px] leading-relaxed text-muted">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          prefetch
          className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-soft transition hover:brightness-110"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
