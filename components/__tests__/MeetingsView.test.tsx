import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeetingsView } from '@/components/meetings/MeetingsView';
import { ToastProvider } from '@/components/ui/Toast';
import type { MeetingsData } from '@/lib/meetings/data';

// The prep button calls the server action; stub it (prompt/parser logic is
// covered by lib/ai/__tests__/meeting-prep.test.ts).
const generateMeetingPrep = vi.fn(async (_input: unknown) => ({
  ok: true as const,
  threadCount: 2,
  prep: {
    keyPoints: ['Maya sent revised numbers.'],
    openItems: ['Budget sign-off pending.'],
    questions: ['Does it include the vendor change?'],
  },
}));
vi.mock('@/app/actions/meetings', () => ({
  generateMeetingPrep: (input: unknown) => generateMeetingPrep(input),
}));

const OK: MeetingsData = {
  status: 'ok',
  timezone: 'UTC',
  days: [
    {
      date: '2026-06-12',
      label: 'Today — Friday, June 12',
      isToday: true,
      events: [
        {
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
        },
      ],
    },
    { date: '2026-06-14', label: 'Sunday, June 14', isToday: false, events: [] },
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
  it('renders days, the meeting facts, and Join + Outlook links', () => {
    renderView(OK);
    expect(screen.getByText('Today — Friday, June 12')).toBeInTheDocument();
    expect(screen.getByText('Q3 kickoff')).toBeInTheDocument();
    expect(screen.getByText(/Organizer: Maya Khoury/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Join/ })).toHaveAttribute(
      'href',
      'https://teams.example/join/abc',
    );
    expect(screen.getByRole('link', { name: /Open in Outlook/ })).toHaveAttribute(
      'href',
      'https://outlook.live.com/calendar/item/ev1',
    );
  });

  it('runs Meeting Prep and shows the grounded result', async () => {
    const user = userEvent.setup();
    renderView(OK);

    await user.click(screen.getByRole('button', { name: /Prep with Vesta/i }));

    expect(generateMeetingPrep).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Q3 kickoff', attendees: ['maya@cedars.com'] }),
    );
    expect(await screen.findByText('Maya sent revised numbers.')).toBeInTheDocument();
    expect(screen.getByText('Budget sign-off pending.')).toBeInTheDocument();
    expect(screen.getByText(/from 2 email threads/)).toBeInTheDocument();
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
