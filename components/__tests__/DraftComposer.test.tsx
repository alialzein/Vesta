import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraftComposer } from '@/components/dashboard/DraftComposer';
import { ToastProvider } from '@/components/ui/Toast';
import type { DraftCapabilities } from '@/lib/drafts/capabilities';
import type { DraftView, WorkItem } from '@/lib/types';

vi.mock('@/app/actions/drafts', () => ({
  generateDraft: vi.fn(),
  ensureBlankDraft: vi.fn(),
  saveDraft: vi.fn(),
  sendDraft: vi.fn(),
  discardDraft: vi.fn(async () => ({ ok: true })),
}));

import { generateDraft, ensureBlankDraft, sendDraft } from '@/app/actions/drafts';

const SEND_CAPS: DraftCapabilities = {
  aiEnabled: true,
  mailboxConnected: true,
  sendingEnabled: true,
  sendMode: 'send',
};

function makeItem(over: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'wi-1',
    title: 'Q3 budget approval',
    categories: ['waiting'],
    source: 'outlook',
    person: 'Maya Chen',
    summary: 'Maya needs the Q3 sign-off.',
    priorityScore: 82,
    chips: [],
    dueLabel: 'Waiting on you',
    urgencyReason: 'Maya is waiting on your reply.',
    nextBestAction: 'Reply to Maya to unblock this.',
    suggestedDraft: '',
    riskChips: [],
    memoryUsed: [],
    activity: [],
    canDraft: true,
    ...over,
  };
}

function makeDraft(over: Partial<DraftView> = {}): DraftView {
  return {
    id: 'd-1',
    workItemId: 'wi-1',
    status: 'draft',
    subject: 'RE: Q3 budget approval',
    bodyText: 'Hi Maya,\n\nApproved — go ahead.\n\nAli',
    tone: 'professional',
    warnings: [],
    sensitiveTopics: [],
    requiresHumanReview: false,
    to: [{ name: 'Maya Chen', email: 'maya@acme.com' }],
    cc: [],
    bcc: [],
    replyAll: false,
    ...over,
  };
}

function renderComposer(props: Partial<React.ComponentProps<typeof DraftComposer>> = {}) {
  return render(
    <ToastProvider>
      <DraftComposer
        open
        onClose={() => {}}
        item={makeItem()}
        capabilities={SEND_CAPS}
        {...props}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftComposer', () => {
  it('auto-generates a draft on open when AI is enabled, and shows the safety copy', async () => {
    (generateDraft as Mock).mockResolvedValue({ ok: true, draft: makeDraft() });
    renderComposer();

    await waitFor(() => expect(generateDraft).toHaveBeenCalledWith('wi-1', expect.any(Object)));
    expect(await screen.findByDisplayValue(/Approved — go ahead/)).toBeInTheDocument();
    expect(screen.getByText(/Please review before sending/i)).toBeInTheDocument();
    // Recipient chip shows the real address (To/Cc/Bcc are all editable).
    expect(screen.getByText('maya@acme.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Bcc recipient')).toBeInTheDocument();
  });

  it('lets the manager remove a recipient and add a Bcc address', async () => {
    const user = userEvent.setup();
    renderComposer({ item: makeItem({ draft: makeDraft() }) });

    // Remove the seeded To recipient.
    await user.click(screen.getByRole('button', { name: /Remove maya@acme.com/i }));
    expect(screen.queryByText('maya@acme.com')).not.toBeInTheDocument();

    // Add a Bcc address (Enter commits it as a chip).
    const bcc = screen.getByLabelText('Add Bcc recipient');
    await user.type(bcc, 'boss@acme.com{Enter}');
    expect(screen.getByText('boss@acme.com')).toBeInTheDocument();
  });

  it('does not auto-generate when an existing draft is supplied', async () => {
    renderComposer({ item: makeItem({ draft: makeDraft({ bodyText: 'Existing reply text.' }) }) });
    expect(generateDraft).not.toHaveBeenCalled();
    expect(await screen.findByDisplayValue('Existing reply text.')).toBeInTheDocument();
  });

  it('approves & sends, then notifies the parent and clears the editor', async () => {
    (sendDraft as Mock).mockResolvedValue({ ok: true });
    const onSent = vi.fn();
    renderComposer({ item: makeItem({ draft: makeDraft() }), onSent });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Approve & Send/i }));

    await waitFor(() => expect(sendDraft).toHaveBeenCalled());
    expect(onSent).toHaveBeenCalledWith('wi-1');
  });

  it('uses the blank-draft path (no AI generate) when AI is disabled', async () => {
    (ensureBlankDraft as Mock).mockResolvedValue({ ok: true, draft: makeDraft({ bodyText: '' }) });
    renderComposer({ capabilities: { ...SEND_CAPS, aiEnabled: false } });

    await waitFor(() => expect(ensureBlankDraft).toHaveBeenCalled());
    expect(generateDraft).not.toHaveBeenCalled();
    // Manual editor is available.
    expect(screen.getByPlaceholderText(/Write your reply/i)).toBeInTheDocument();
  });

  it('explains there is nothing to reply to for a non-email item', () => {
    renderComposer({ item: makeItem({ canDraft: false }) });
    expect(screen.getByText(/Nothing to reply to/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve & Send/i })).not.toBeInTheDocument();
  });

  it('shows the reconnect hint when sending is not yet enabled', () => {
    renderComposer({
      item: makeItem({ draft: makeDraft() }),
      capabilities: { ...SEND_CAPS, sendingEnabled: false },
    });
    expect(screen.getByText(/Reconnect Outlook/i)).toBeInTheDocument();
  });
});
