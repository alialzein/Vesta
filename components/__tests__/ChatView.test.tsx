import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatView } from '@/components/chat/ChatView';
import type { ChatData, ChatMessageView } from '@/lib/chat/data';
import { ToastProvider } from '@/components/ui/Toast';

// Server actions are stubbed (their logic lives in lib/ai/chat tests).
const sendChatMessage = vi.fn();
const deleteChatConversation = vi.fn(async () => ({ ok: true as const }));
const executeChatAction = vi.fn();
const cancelChatAction = vi.fn(async () => ({ ok: true as const }));
vi.mock('@/app/actions/chat', () => ({
  sendChatMessage: (...args: unknown[]) => sendChatMessage(...(args as [])),
  deleteChatConversation: (...args: unknown[]) => deleteChatConversation(...(args as [])),
  executeChatAction: (...args: unknown[]) => executeChatAction(...(args as [])),
  cancelChatAction: (...args: unknown[]) => cancelChatAction(...(args as [])),
}));
// Attendee autocomplete (composer @-mention + meeting cards).
const suggestAttendees = vi.fn(async (_q: string) => [] as { name: string | null; email: string }[]);
vi.mock('@/app/actions/people', () => ({
  suggestAttendees: (...args: unknown[]) => suggestAttendees(...(args as [string])),
}));

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/chat',
}));

const AI_MSG: ChatMessageView = {
  id: 'm2',
  role: 'assistant',
  content: 'Start with the Cedars approval — Maya is waiting.',
  learned: ['Maya from Cedars Group is a VIP client.'],
  action: null,
  createdAt: '2026-06-11T10:00:01.000Z',
};

function makeData(over: Partial<ChatData> = {}): ChatData {
  return { conversations: [], activeId: null, messages: [], ...over };
}

function renderChat(data: ChatData) {
  return render(
    <ToastProvider>
      <ChatView data={data} />
    </ToastProvider>,
  );
}

describe('ChatView', () => {
  beforeEach(() => {
    sendChatMessage.mockReset();
    deleteChatConversation.mockClear();
    executeChatAction.mockReset();
    cancelChatAction.mockClear();
    suggestAttendees.mockReset();
    suggestAttendees.mockResolvedValue([]);
    window.history.replaceState(null, '', '/chat');
  });

  it('empty state shows 4 ask starters, 3 action starters, and the capability toggle', async () => {
    const user = userEvent.setup();
    renderChat(makeData());
    expect(screen.getByText(/Talk to Vesta like you talk to yourself/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'What should I focus on right now?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'What meetings do I have today?' })).toBeInTheDocument();
    // Action starters PREFILL the composer (the manager completes the details).
    await user.click(screen.getByRole('button', { name: /Schedule a meeting/ }));
    expect(screen.getByLabelText('Message Vesta')).toHaveValue(
      'Schedule a 30-minute meeting with @',
    );
    // "What can Vesta do?" expands the full capability list.
    await user.click(screen.getByRole('button', { name: 'What can Vesta do?' }));
    expect(screen.getByText('Give orders — you always confirm first')).toBeInTheDocument();
    expect(screen.getByText(/saved to Memory & Rules/)).toBeInTheDocument();
  });

  it('sends a message optimistically and renders the reply with its learned chip', async () => {
    sendChatMessage.mockResolvedValue({ ok: true, conversationId: 'c1', message: AI_MSG });
    const user = userEvent.setup();
    renderChat(makeData());

    await user.type(screen.getByLabelText('Message Vesta'), 'Who is waiting on me?');
    await user.click(screen.getByLabelText('Send message'));

    // The manager's message appears immediately (optimistic). It can show up
    // twice — as the chat bubble and as the new conversation's rail title.
    expect(screen.getAllByText('Who is waiting on me?').length).toBeGreaterThanOrEqual(1);
    // …then the reply lands with the saved-to-memory chip linking to Memory & Rules.
    await waitFor(() =>
      expect(screen.getByText(/Start with the Cedars approval/)).toBeInTheDocument(),
    );
    expect(sendChatMessage).toHaveBeenCalledWith({
      conversationId: null,
      text: 'Who is waiting on me?',
    });
    const chip = screen.getByRole('link', { name: /Saved to memory/ });
    expect(chip).toHaveAttribute('href', '/?view=memory');
    expect(chip.textContent).toContain('Maya from Cedars Group is a VIP client.');
  });

  it('a failed send restores the input and drops the optimistic bubble', async () => {
    sendChatMessage.mockResolvedValue({ ok: false, error: 'AI is paused for this account.' });
    const user = userEvent.setup();
    renderChat(makeData());

    await user.type(screen.getByLabelText('Message Vesta'), 'hello');
    await user.click(screen.getByLabelText('Send message'));

    await waitFor(() =>
      expect(screen.getByLabelText('Message Vesta')).toHaveValue('hello'),
    );
    expect(screen.queryByText('hello', { selector: 'div' })).not.toBeInTheDocument();
  });

  it('lists conversations with links and supports deleting one', async () => {
    const user = userEvent.setup();
    renderChat(
      makeData({
        conversations: [
          { id: 'c1', title: 'Focus planning', lastMessageAt: '2026-06-11T08:00:00Z' },
        ],
      }),
    );
    expect(screen.getByRole('link', { name: /Focus planning/ })).toHaveAttribute(
      'href',
      '/chat?c=c1',
    );
    await user.click(screen.getByLabelText('Delete conversation Focus planning'));
    expect(deleteChatConversation).toHaveBeenCalledWith('c1');
    expect(screen.queryByText('Focus planning')).not.toBeInTheDocument();
  });

  it('a proposed order renders a confirmation card; Confirm executes it', async () => {
    executeChatAction.mockResolvedValue({ ok: true, result: 'Done — marked complete.' });
    const user = userEvent.setup();
    renderChat(
      makeData({
        activeId: 'c1',
        conversations: [{ id: 'c1', title: 'T', lastMessageAt: '2026-06-11T08:00:00Z' }],
        messages: [
          {
            ...AI_MSG,
            learned: [],
            action: {
              kind: 'mark_done',
              status: 'proposed',
              label: 'Mark "Cedars contract approval" as done',
              result: null,
              attendees: null,
              link: null,
            },
          },
        ],
      }),
    );

    expect(screen.getByText('Mark "Cedars contract approval" as done')).toBeInTheDocument();
    expect(screen.getByText(/Nothing runs until you confirm/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(executeChatAction).toHaveBeenCalledWith('m2', undefined);
    await waitFor(() => expect(screen.getByText('Done — marked complete.')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });

  it('a meeting card shows editable attendees, confirms with the edited list, and surfaces the join link', async () => {
    executeChatAction.mockResolvedValue({
      ok: true,
      result: 'Meeting scheduled.',
      link: 'https://join.skype.com/abc',
    });
    const user = userEvent.setup();
    renderChat(
      makeData({
        activeId: 'c1',
        conversations: [{ id: 'c1', title: 'T', lastMessageAt: '2026-06-11T08:00:00Z' }],
        messages: [
          {
            ...AI_MSG,
            learned: [],
            action: {
              kind: 'create_meeting',
              status: 'proposed',
              label: 'Schedule meeting "Sync" with maya@cedars.com — 2026-06-13 15:00, 30 min',
              result: null,
              attendees: ['maya@cedars.com'],
              link: null,
            },
          },
        ],
      }),
    );

    // The proposed attendee renders as a removable chip.
    expect(screen.getByText('maya@cedars.com')).toBeInTheDocument();
    // Add another attendee by typing a full email + Enter.
    await user.type(screen.getByLabelText('Add attendee'), 'sam@northwind.com{Enter}');
    expect(screen.getByText('sam@northwind.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(executeChatAction).toHaveBeenCalledWith('m2', {
      attendees: ['maya@cedars.com', 'sam@northwind.com'],
    });
    await waitFor(() => expect(screen.getByText('Meeting scheduled.')).toBeInTheDocument());
    // The created meeting's link is a real, clickable button on the card.
    expect(screen.getByRole('link', { name: /Open the meeting link/ })).toHaveAttribute(
      'href',
      'https://join.skype.com/abc',
    );
  });

  it('typing @name in the composer suggests people and inserts the picked email', async () => {
    suggestAttendees.mockResolvedValue([{ name: 'Zahraa Daher', email: 'zahraadaher17@gmail.com' }]);
    const user = userEvent.setup();
    renderChat(makeData());

    await user.type(screen.getByLabelText('Message Vesta'), 'Schedule a meeting with @zah');
    expect(await screen.findByText('zahraadaher17@gmail.com')).toBeInTheDocument();
    expect(suggestAttendees).toHaveBeenLastCalledWith('zah');

    await user.click(screen.getByRole('button', { name: /Zahraa Daher/ }));
    expect(screen.getByLabelText('Message Vesta')).toHaveValue(
      'Schedule a meeting with zahraadaher17@gmail.com ',
    );
  });

  it('Cancel settles the card without executing', async () => {
    const user = userEvent.setup();
    renderChat(
      makeData({
        activeId: 'c1',
        conversations: [{ id: 'c1', title: 'T', lastMessageAt: '2026-06-11T08:00:00Z' }],
        messages: [
          {
            ...AI_MSG,
            learned: [],
            action: {
              kind: 'snooze',
              status: 'proposed',
              label: 'Snooze it',
              result: null,
              attendees: null,
              link: null,
            },
          },
        ],
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelChatAction).toHaveBeenCalledWith('m2');
    expect(executeChatAction).not.toHaveBeenCalled();
    expect(screen.getByText(/Cancelled — nothing was changed/i)).toBeInTheDocument();
  });

  it('renders an existing thread with messages', () => {
    renderChat(
      makeData({
        activeId: 'c1',
        conversations: [{ id: 'c1', title: 'T', lastMessageAt: '2026-06-11T08:00:00Z' }],
        messages: [
          { id: 'm1', role: 'user', content: 'My question', learned: [], action: null, createdAt: '2026-06-11T08:00:00Z' },
          AI_MSG,
        ],
      }),
    );
    expect(screen.getByText('My question')).toBeInTheDocument();
    expect(screen.getByText(/Start with the Cedars approval/)).toBeInTheDocument();
  });
});
