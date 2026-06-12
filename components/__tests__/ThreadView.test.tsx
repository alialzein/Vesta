import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreadView, type ThreadMessageVM } from '@/components/thread/ThreadView';
import { ToastProvider } from '@/components/ui/Toast';

const generateDraft = vi.fn();
vi.mock('@/app/actions/drafts', () => ({
  generateDraft: (...args: unknown[]) => generateDraft(...(args as [string])),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

function msg(over: Partial<ThreadMessageVM>): ThreadMessageVM {
  return {
    id: 'm1',
    senderName: 'Zahraa Daher',
    senderEmail: 'zahraa@x.com',
    toLine: 'Ali Alzein',
    ccLine: '',
    whenIso: '2026-06-09T09:09:48Z',
    outbound: false,
    bodyHtml: null,
    bodyText: 'i need your confirmation to be off on monday.',
    quotedHtml: null,
    quotedText: null,
    preview: 'preview: asks to be off Monday',
    ...over,
  };
}

const MESSAGES: ThreadMessageVM[] = [
  msg({ id: 'm1' }),
  msg({
    id: 'm2',
    senderName: 'Ali AL-Zein',
    senderEmail: 'ali@x.com',
    outbound: true,
    bodyText: 'Your request to be off next Monday is not approved.',
    quotedText: 'From: Zahraa\nSent: Tue\n\ni need your confirmation…',
    preview: 'preview: not approved',
  }),
];

const AI_READ = {
  workItemId: 'wi1',
  summary: 'Zahraa is asking you to approve her Monday off.',
  reason: 'Direct request to you with a date attached.',
  category: 'waiting',
  due: '2026-06-15',
  open: true,
};

function renderThread(aiRead: typeof AI_READ | null = AI_READ) {
  return render(
    <ToastProvider>
      <ThreadView
        subject="Urgent request to approve holidays"
        messages={MESSAGES}
        aiRead={aiRead}
        outlookLink="https://outlook.live.com/mail/x"
      />
    </ToastProvider>,
  );
}

describe('ThreadView', () => {
  beforeEach(() => generateDraft.mockReset());

  it('renders the header, Vesta read, and collapses all but the newest message', () => {
    renderThread();
    expect(screen.getByText('Urgent request to approve holidays')).toBeInTheDocument();
    expect(screen.getByText('2 messages in this conversation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open in Outlook/ })).toHaveAttribute(
      'href',
      'https://outlook.live.com/mail/x',
    );

    // Vesta's read panel: summary + why + chips.
    expect(screen.getByText(/Zahraa is asking you to approve her Monday off/)).toBeInTheDocument();
    expect(screen.getByText(/Direct request to you with a date attached/)).toBeInTheDocument();
    expect(screen.getByText('Waiting on you')).toBeInTheDocument();

    // Newest message open (its body shows), older one collapsed to a preview.
    expect(
      screen.getByText('Your request to be off next Monday is not approved.', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('i need your confirmation to be off on monday.', { selector: 'span' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument(); // outbound badge
  });

  it('expands a collapsed message on click, and reveals quoted history behind its toggle', async () => {
    const user = userEvent.setup();
    renderThread();

    // Expand the first (collapsed) message via its header row.
    await user.click(screen.getByRole('button', { name: /Zahraa Daher/ }));
    expect(
      screen.getByText('i need your confirmation to be off on monday.', { selector: 'span' }),
    ).toBeInTheDocument();

    // The reply's quoted history is split off — hidden until asked for.
    expect(screen.queryByText(/From: Zahraa/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show quoted history' }));
    expect(screen.getByText(/From: Zahraa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide quoted history' })).toBeInTheDocument();
  });

  it('drafts a reply through the approval-gated flow and links to Draft Replies', async () => {
    generateDraft.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderThread();

    await user.click(screen.getByRole('button', { name: /Draft a reply with Vesta/ }));
    expect(generateDraft).toHaveBeenCalledWith('wi1');
    expect(await screen.findByRole('link', { name: /Review in Draft Replies/ })).toHaveAttribute(
      'href',
      '/drafts',
    );
    expect(screen.getByText(/Nothing sends without your approval/)).toBeInTheDocument();
  });

  it('renders no AI panel when Vesta has not analyzed the thread', () => {
    renderThread(null);
    expect(screen.queryByText(/Vesta's read/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Draft a reply/ })).not.toBeInTheDocument();
  });
});
