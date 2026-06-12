import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreadView, type ThreadMessageVM } from '@/components/thread/ThreadView';
import { ToastProvider } from '@/components/ui/Toast';

const generateDraft = vi.fn();
const ensureBlankDraft = vi.fn();
const sendDraft = vi.fn();
const ensureThreadWorkItem = vi.fn();
vi.mock('@/app/actions/drafts', () => ({
  generateDraft: (...args: unknown[]) => generateDraft(...(args as [string])),
  ensureBlankDraft: (...args: unknown[]) => ensureBlankDraft(...(args as [string])),
  sendDraft: (...args: unknown[]) => sendDraft(...(args as [string, unknown])),
}));
const getMessageAttachments = vi.fn(async (_id: string) => ({
  ok: true as const,
  attachments: [] as unknown[],
}));
const downloadAttachment = vi.fn();
const getInlineBody = vi.fn(async (_id: string) => ({ ok: true as const, html: '' }));
const forwardThreadMessage = vi.fn();
vi.mock('@/app/actions/thread', () => ({
  ensureThreadWorkItem: (...args: unknown[]) => ensureThreadWorkItem(...(args as [string])),
  getMessageAttachments: (...args: unknown[]) => getMessageAttachments(...(args as [string])),
  downloadAttachment: (...args: unknown[]) => downloadAttachment(...(args as [string, string])),
  getInlineBody: (...args: unknown[]) => getInlineBody(...(args as [string])),
  forwardThreadMessage: (...args: unknown[]) =>
    forwardThreadMessage(...(args as [string, unknown])),
}));
// AttendeeEditor (the Forward panel's recipient list) lives in chat/parts —
// stub that module's server-action imports.
vi.mock('@/app/actions/people', () => ({
  suggestAttendees: vi.fn(async () => []),
}));
vi.mock('@/app/actions/chat', () => ({
  executeChatAction: vi.fn(async () => ({ ok: true, result: 'done' })),
  cancelChatAction: vi.fn(async () => ({ ok: true })),
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
    hasAttachments: false,
    needsInlineImages: false,
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

function renderThread(
  aiRead: typeof AI_READ | null = AI_READ,
  messages: ThreadMessageVM[] = MESSAGES,
) {
  return render(
    <ToastProvider>
      <ThreadView
        subject="Urgent request to approve holidays"
        messages={messages}
        aiRead={aiRead}
        outlookLink="https://outlook.live.com/mail/x"
        conversationId="conv-1"
      />
    </ToastProvider>,
  );
}

describe('ThreadView', () => {
  beforeEach(() => {
    generateDraft.mockReset();
    ensureBlankDraft.mockReset();
    sendDraft.mockReset();
    ensureThreadWorkItem.mockReset();
    ensureThreadWorkItem.mockResolvedValue({ ok: true, workItemId: 'wi-thread' });
    getMessageAttachments.mockReset();
    getMessageAttachments.mockResolvedValue({ ok: true, attachments: [] });
    forwardThreadMessage.mockReset();
    getInlineBody.mockReset();
    getInlineBody.mockResolvedValue({ ok: true, html: '' });
  });

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

  it('sends a MANUAL reply through the draft pipeline (works without a radar item)', async () => {
    ensureBlankDraft.mockResolvedValue({ ok: true, draft: { id: 'd1' } });
    sendDraft.mockResolvedValue({ ok: true, draft: { id: 'd1', status: 'sent' } });
    const user = userEvent.setup();
    renderThread(null);

    await user.type(screen.getByLabelText('Reply text'), 'Approved, see you Monday.');
    await user.click(screen.getByRole('button', { name: /Send reply/ }));

    expect(ensureThreadWorkItem).toHaveBeenCalledWith('conv-1');
    expect(ensureBlankDraft).toHaveBeenCalledWith('wi-thread');
    expect(sendDraft).toHaveBeenCalledWith('d1', { bodyText: 'Approved, see you Monday.' });
    expect(await screen.findByText(/Reply sent — it threads onto this conversation/)).toBeInTheDocument();
    expect(screen.getByLabelText('Reply text')).toHaveValue('');
  });

  it('Write with Vesta fills the composer (the typed text becomes the instruction) and sends that draft', async () => {
    generateDraft.mockResolvedValue({
      ok: true,
      draft: { id: 'd-ai', bodyText: 'Hello Zahraa,\n\nYour Monday off is approved.' },
    });
    sendDraft.mockResolvedValue({ ok: true, draft: { id: 'd-ai', status: 'sent' } });
    const user = userEvent.setup();
    renderThread(null);

    await user.type(screen.getByLabelText('Reply text'), 'approve it warmly');
    await user.click(screen.getByRole('button', { name: 'Write with Vesta' }));

    expect(generateDraft).toHaveBeenCalledWith('wi-thread', { instruction: 'approve it warmly' });
    expect(screen.getByLabelText('Reply text')).toHaveValue(
      'Hello Zahraa,\n\nYour Monday off is approved.',
    );

    // Sending reuses the AI draft id — no blank draft needed.
    await user.click(screen.getByRole('button', { name: /Send reply/ }));
    expect(ensureBlankDraft).not.toHaveBeenCalled();
    expect(sendDraft).toHaveBeenCalledWith('d-ai', {
      bodyText: 'Hello Zahraa,\n\nYour Monday off is approved.',
    });
  });

  it('the draft-only send mode is reported honestly', async () => {
    ensureBlankDraft.mockResolvedValue({ ok: true, draft: { id: 'd2' } });
    sendDraft.mockResolvedValue({ ok: true, draft: { id: 'd2', status: 'draft' } });
    const user = userEvent.setup();
    renderThread(null);

    await user.type(screen.getByLabelText('Reply text'), 'ok');
    await user.click(screen.getByRole('button', { name: /Send reply/ }));
    expect(await screen.findByText(/saved to your Outlook Drafts/)).toBeInTheDocument();
  });

  it('an expanded message with attachments lists them, fetched on demand', async () => {
    getMessageAttachments.mockResolvedValue({
      ok: true,
      attachments: [
        { id: 'a1', name: 'budget.xlsx', contentType: 'application/x', size: 24576, isInline: false, contentId: null, isFile: true },
      ],
    });
    renderThread(null, [msg({ id: 'm9', hasAttachments: true })]);

    expect(await screen.findByRole('button', { name: /budget\.xlsx 24 KB/ })).toBeInTheDocument();
    expect(getMessageAttachments).toHaveBeenCalledWith('m9');
  });

  it('forwards a message to picked recipients with a note', async () => {
    forwardThreadMessage.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderThread(null, [msg({ id: 'm9' })]);

    await user.click(screen.getByRole('button', { name: 'Forward' }));
    await user.type(screen.getByLabelText('Add attendee'), 'zahraa@gmail.com{Enter}');
    await user.type(screen.getByLabelText('Forward note'), 'FYI');
    // Two "Forward" buttons exist now (toggle + submit) — submit is the last.
    const buttons = screen.getAllByRole('button', { name: 'Forward' });
    await user.click(buttons[buttons.length - 1]);

    expect(forwardThreadMessage).toHaveBeenCalledWith('m9', {
      to: ['zahraa@gmail.com'],
      note: 'FYI',
    });
    expect(await screen.findByText(/Forwarded — the original message/)).toBeInTheDocument();
  });
});
