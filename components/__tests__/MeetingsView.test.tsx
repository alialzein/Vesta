import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeetingsView } from '@/components/meetings/MeetingsView';
import { ToastProvider } from '@/components/ui/Toast';
import type { MeetingsData } from '@/lib/meetings/data';
import type { CalendarEventView } from '@/lib/graph/calendar';

// Server actions are stubbed (prep logic is covered by lib/ai tests; range
// fetching by the action's own validation).
const generateMeetingPrep = vi.fn(async (_input: unknown) => ({
  ok: true as const,
  threadCount: 2,
  prep: {
    keyPoints: ['Maya sent revised numbers.'],
    openItems: ['Budget sign-off pending.'],
    questions: ['Does it include the vendor change?'],
  },
}));
const getCalendarRange = vi.fn(async (_input: unknown) => ({
  ok: true as const,
  events: [] as CalendarEventView[],
}));
vi.mock('@/app/actions/meetings', () => ({
  generateMeetingPrep: (input: unknown) => generateMeetingPrep(input),
  getCalendarRange: (input: unknown) => getCalendarRange(input),
}));

// 2026-06-12 is a Friday; the test "today".
const EV: CalendarEventView = {
  id: 'ev1',
  subject: 'Q3 kickoff',
  startIso: '2026-06-12T09:00:00Z',
  endIso: '2026-06-12T09:30:00Z',
  organizerName: 'Maya Khoury',
  organizerEmail: 'maya@cedars.com',
  attendees: [{ name: 'Maya Khoury', email: 'maya@cedars.com' }],
  isOnline: true,
  joinUrl: 'https://teams.example/join/abc',
  location: null,
  webLink: 'https://outlook.live.com/calendar/item/ev1',
  isAllDay: false,
};

const OK: MeetingsData = {
  status: 'ok',
  timezone: 'UTC',
  todayKey: '2026-06-12',
  windowFromKey: '2026-06-01',
  windowToKey: '2026-07-06',
  events: [
    EV,
    {
      ...EV,
      id: 'ev2',
      subject: 'Eid holiday',
      startIso: '2026-06-13T00:00:00Z',
      endIso: '2026-06-14T00:00:00Z',
      isAllDay: true,
      isOnline: false,
      joinUrl: null,
      organizerName: null,
      organizerEmail: null,
      attendees: [],
    },
  ],
};

function renderView(data: MeetingsData) {
  return render(
    <ToastProvider>
      <MeetingsView data={data} />
    </ToastProvider>,
  );
}

describe('MeetingsView', () => {
  beforeEach(() => {
    localStorage.clear();
    generateMeetingPrep.mockClear();
    getCalendarRange.mockClear();
  });

  it('defaults to the week grid: day headers, the meeting block, the all-day chip', () => {
    renderView(OK);
    expect(screen.getByRole('button', { name: 'week' })).toHaveAttribute('aria-pressed', 'true');
    // Week of Jun 8–14 with the meeting positioned as a labelled block.
    expect(screen.getByText('Jun 8 – 14')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Q3 kickoff, 9:00 AM – 9:30 AM/ }),
    ).toBeInTheDocument();
    // The Saturday holiday rides the all-day strip.
    expect(screen.getByRole('button', { name: 'Eid holiday' })).toBeInTheDocument();
  });

  it('clicking a week block opens the detail card with Join, Outlook, and Prep', async () => {
    const user = userEvent.setup();
    renderView(OK);

    await user.click(screen.getByRole('button', { name: /Q3 kickoff, 9:00 AM/ }));
    const dialog = screen.getByRole('dialog', { name: 'Meeting details' });
    expect(within(dialog).getByText('Q3 kickoff')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Join/ })).toHaveAttribute(
      'href',
      'https://teams.example/join/abc',
    );
    expect(within(dialog).getByRole('link', { name: /Open in Outlook/ })).toHaveAttribute(
      'href',
      'https://outlook.live.com/calendar/item/ev1',
    );

    // Prep runs from inside the overlay too.
    await user.click(within(dialog).getByRole('button', { name: /Prep with Vesta/i }));
    expect(generateMeetingPrep).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Q3 kickoff', attendees: ['maya@cedars.com'] }),
    );
    expect(await within(dialog).findByText('Maya sent revised numbers.')).toBeInTheDocument();
  });

  it('month view shows the grid with event pills; a day click jumps to its week', async () => {
    const user = userEvent.setup();
    renderView(OK);

    await user.click(screen.getByRole('button', { name: 'month' }));
    expect(screen.getByText('June 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Q3 kickoff' })).toBeInTheDocument();

    // Jumping to a specific day switches to that week (within the window — no fetch).
    await user.click(screen.getByRole('button', { name: /Open 2026-06-12 — 1 meeting/ }));
    expect(screen.getByRole('button', { name: 'week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Jun 8 – 14')).toBeInTheDocument();
    expect(getCalendarRange).not.toHaveBeenCalled();
  });

  it('agenda view lists today first and remembers the choice', async () => {
    const user = userEvent.setup();
    renderView(OK);

    await user.click(screen.getByRole('button', { name: 'agenda' }));
    expect(screen.getByText('Today — Friday, June 12')).toBeInTheDocument();
    expect(screen.getByText(/Organizer: Maya Khoury/)).toBeInTheDocument();
    expect(localStorage.getItem('vesta-meetings-view')).toBe('agenda');
  });

  it('navigating past the loaded window fetches the missing range', async () => {
    const user = userEvent.setup();
    renderView(OK);

    // Window ends 2026-07-06; four weeks forward crosses it.
    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Next week' }));
    }
    expect(getCalendarRange).toHaveBeenCalledWith({ fromKey: '2026-07-06', toKey: '2026-07-13' });
  });

  it('shows the honest reconnect state when the calendar scope is missing', () => {
    renderView({ status: 'needs_reconnect' });
    expect(screen.getByText(/Reconnect to enable your calendar/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Settings/ })).toHaveAttribute(
      'href',
      '/settings',
    );
  });
});
