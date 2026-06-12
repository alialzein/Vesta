'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MeetingsData } from '@/lib/meetings/data';
import type { CalendarEventView } from '@/lib/graph/calendar';
import { timeRangeInTz } from '@/lib/meetings/group';
import { generateMeetingPrep, type PrepResult } from '@/app/actions/meetings';
import type { MeetingPrep } from '@/lib/ai/meeting-prep';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * Meetings v1 — the manager's real Outlook schedule: today front and center,
 * the next 7 days as an agenda below. Deliberately NOT a month grid (Outlook
 * already has one); Vesta's job is "what's today and what's coming, with the
 * prep". Each meeting offers Join (Teams) and "Prep with Vesta" — the real
 * Meeting Prep (Phase 12): one page grounded in the attendees' email history.
 */

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

  return (
    <div className="flex flex-col gap-5">
      {data.days.map((day) => (
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
                <MeetingCard key={e.id} event={e} timezone={data.timezone} />
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
        <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
        Read-only view of your Outlook calendar (next 7 days). To create a meeting, ask Vesta in
        chat — it proposes, you confirm.
      </p>
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
          {timeRangeInTz(event.startIso, event.endIso, timezone)}
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
