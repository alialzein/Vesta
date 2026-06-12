import 'server-only';
import { GraphRequestError } from './client';

/**
 * Phase C — Microsoft Graph calendar: read the manager's day + create meetings
 * from CONFIRMED chat orders. Needs the Calendars.ReadWrite scope (mailboxes
 * connected earlier must reconnect once to grant it).
 *
 * Reading feeds the chat context ("what meetings do I have today?", "am I in
 * the X meeting?") and later the real Meeting Prep. Creating is only ever
 * called by executeChatAction AFTER the manager tapped Confirm on the card.
 *
 * Online-meeting note: work/school accounts get a Teams link
 * (teamsForBusiness); personal accounts (hotmail/outlook.com) don't support
 * it, so creation falls back to skypeForConsumer, then to a plain event —
 * the meeting always lands on the calendar, the link is best-effort.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

type GraphDateTime = { dateTime?: string; timeZone?: string };
type GraphAttendee = {
  emailAddress?: { name?: string; address?: string };
  type?: string;
};

/** The raw Graph event slice we read (calendarView / created event). */
export type GraphEvent = {
  id: string;
  subject?: string | null;
  start?: GraphDateTime;
  end?: GraphDateTime;
  organizer?: { emailAddress?: { name?: string; address?: string } };
  attendees?: GraphAttendee[];
  isOnlineMeeting?: boolean;
  onlineMeeting?: { joinUrl?: string | null } | null;
  /** Legacy field — personal (outlook.com) accounts often put the Skype join
   *  link ONLY here, leaving onlineMeeting null. */
  onlineMeetingUrl?: string | null;
  isCancelled?: boolean;
  location?: { displayName?: string | null } | null;
  webLink?: string | null;
};

export type CalendarEventView = {
  id: string;
  subject: string;
  /** UTC instants (we request Prefer: outlook.timezone="UTC"). */
  startIso: string;
  endIso: string;
  organizerName: string | null;
  organizerEmail: string | null;
  attendees: { name: string | null; email: string }[];
  isOnline: boolean;
  joinUrl: string | null;
  location: string | null;
  /** Deep link to the event in Outlook on the web — always present, so the
   *  manager can reach the invite (and its link) even without a joinUrl. */
  webLink: string | null;
};

// ---------------------------------------------------------------------------
// Pure mapping — unit tested.
// ---------------------------------------------------------------------------

/** Graph returns "2026-06-12T15:00:00.0000000" in the requested zone (UTC). */
function isoOf(dt?: GraphDateTime): string {
  const raw = (dt?.dateTime ?? '').trim();
  if (!raw) return '';
  // Trim sub-second noise and mark UTC explicitly.
  const m = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  return m ? `${m[1]}Z` : raw;
}

export function toEventView(e: GraphEvent): CalendarEventView {
  return {
    id: e.id,
    subject: e.subject?.trim() || '(no subject)',
    startIso: isoOf(e.start),
    endIso: isoOf(e.end),
    organizerName: e.organizer?.emailAddress?.name ?? null,
    organizerEmail: e.organizer?.emailAddress?.address?.toLowerCase() ?? null,
    attendees: (e.attendees ?? [])
      .map((a) => ({
        name: a.emailAddress?.name ?? null,
        email: a.emailAddress?.address?.toLowerCase() ?? '',
      }))
      .filter((a) => a.email),
    isOnline: Boolean(e.isOnlineMeeting),
    joinUrl: e.onlineMeeting?.joinUrl ?? e.onlineMeetingUrl ?? null,
    location: e.location?.displayName?.trim() || null,
    webLink: e.webLink ?? null,
  };
}

/** Compact one-line-per-meeting block for the chat prompt, times in the
 *  manager's zone ("09:30–10:00 Standup — organizer Maya, 4 attendees, Teams"). */
export function meetingLinesForChat(events: CalendarEventView[], tz: string): string[] {
  const t = (iso: string) =>
    iso
      ? new Date(iso).toLocaleTimeString('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '?';
  return events.map((e) => {
    const bits = [
      `${t(e.startIso)}–${t(e.endIso)} ${e.subject}`,
      e.organizerName || e.organizerEmail ? `organizer ${e.organizerName ?? e.organizerEmail}` : null,
      e.attendees.length > 0 ? `${e.attendees.length} attendee${e.attendees.length === 1 ? '' : 's'}` : null,
      e.isOnline ? 'online meeting' : e.location,
    ].filter(Boolean);
    return bits.join(' — ');
  });
}

// ---------------------------------------------------------------------------
// Graph I/O.
// ---------------------------------------------------------------------------

async function graphCalendarGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // All event times come back as UTC instants regardless of mailbox zone.
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  if (!res.ok) throw new GraphRequestError(res.status, path, await res.text());
  return (await res.json()) as T;
}

/** The manager's meetings between two UTC instants (calendarView expands
 *  recurrences). Cancelled events are dropped. `top` defaults to a day's worth;
 *  the Meetings page asks for a week (50). */
export async function fetchCalendarView(
  accessToken: string,
  startIso: string,
  endIso: string,
  top = 25,
): Promise<CalendarEventView[]> {
  const params = new URLSearchParams({
    startDateTime: startIso,
    endDateTime: endIso,
    $orderby: 'start/dateTime',
    $top: String(top),
    $select:
      'id,subject,start,end,organizer,attendees,isOnlineMeeting,onlineMeeting,onlineMeetingUrl,isCancelled,location,webLink',
  });
  const data = await graphCalendarGet<{ value: GraphEvent[] }>(
    accessToken,
    `/me/calendarView?${params.toString()}`,
  );
  return (data.value ?? []).filter((e) => !e.isCancelled).map(toEventView);
}

export type CreateMeetingInput = {
  subject: string;
  /** UTC instants. */
  startIso: string;
  endIso: string;
  attendees: { email: string; name?: string | null }[];
  /** Shown in the event body so invitees know where it came from. */
  bodyText?: string;
};

export type CreatedMeeting = {
  id: string;
  webLink: string | null;
  joinUrl: string | null;
  /** Which online-meeting provider stuck (null = plain calendar event). */
  onlineProvider: 'teamsForBusiness' | 'skypeForConsumer' | null;
};

function eventPayload(input: CreateMeetingInput, provider: string | null): Record<string, unknown> {
  return {
    subject: input.subject,
    start: { dateTime: input.startIso.replace(/Z$/, ''), timeZone: 'UTC' },
    end: { dateTime: input.endIso.replace(/Z$/, ''), timeZone: 'UTC' },
    attendees: input.attendees.map((a) => ({
      emailAddress: { address: a.email, name: a.name ?? a.email },
      type: 'required',
    })),
    ...(input.bodyText
      ? { body: { contentType: 'text', content: input.bodyText } }
      : {}),
    ...(provider ? { isOnlineMeeting: true, onlineMeetingProvider: provider } : {}),
  };
}

async function postEvent(
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<GraphEvent> {
  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'outlook.timezone="UTC"',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new GraphRequestError(res.status, '/me/events', await res.text());
  return (await res.json()) as GraphEvent;
}

/**
 * Create the meeting, preferring a Teams link. Work/school accounts support
 * teamsForBusiness; personal accounts get skypeForConsumer; if neither sticks
 * (license/account limitations) the event is still created without a link.
 */
export async function createMeeting(
  accessToken: string,
  input: CreateMeetingInput,
): Promise<CreatedMeeting> {
  const providers: ('teamsForBusiness' | 'skypeForConsumer' | null)[] = [
    'teamsForBusiness',
    'skypeForConsumer',
    null,
  ];
  let lastError: unknown = null;
  for (const provider of providers) {
    try {
      const e = await postEvent(accessToken, eventPayload(input, provider));
      return {
        id: e.id,
        webLink: e.webLink ?? null,
        joinUrl: e.onlineMeeting?.joinUrl ?? e.onlineMeetingUrl ?? null,
        onlineProvider: provider,
      };
    } catch (err) {
      lastError = err;
      // Only retry on Graph rejections (bad provider for this account type);
      // auth/network failures should surface immediately.
      if (!(err instanceof GraphRequestError) || err.status === 401 || err.status === 403) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not create the meeting.');
}
