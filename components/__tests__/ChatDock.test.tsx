import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatDock } from '@/components/chat/ChatDock';
import type { ChatMessageView } from '@/lib/chat/data';
import { ToastProvider } from '@/components/ui/Toast';

const sendChatMessage = vi.fn();
vi.mock('@/app/actions/chat', () => ({
  sendChatMessage: (...args: unknown[]) => sendChatMessage(...(args as [])),
}));

const AI_MSG: ChatMessageView = {
  id: 'm2',
  role: 'assistant',
  content: 'Zahraa is waiting on the meeting timing.',
  learned: [],
  createdAt: '2026-06-11T10:00:01.000Z',
};

function renderDock(open = true, onClose = vi.fn()) {
  return render(
    <ToastProvider>
      <ChatDock open={open} onClose={onClose} />
    </ToastProvider>,
  );
}

describe('ChatDock', () => {
  beforeEach(() => sendChatMessage.mockReset());

  it('shows starters and is NON-modal (no backdrop element)', () => {
    const { container } = renderDock();
    expect(screen.getByRole('button', { name: "Who's waiting on me?" })).toBeInTheDocument();
    // No full-screen backdrop: nothing covers the dashboard behind the panel.
    expect(container.querySelector('.fixed.inset-0')).toBeNull();
  });

  it('sends through the real chat backend and keeps the conversation id', async () => {
    sendChatMessage.mockResolvedValue({ ok: true, conversationId: 'c9', message: AI_MSG });
    const user = userEvent.setup();
    renderDock();

    await user.type(screen.getByLabelText('Message Vesta'), 'who is waiting?');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByText(/Zahraa is waiting on the meeting timing/)).toBeInTheDocument(),
    );
    expect(sendChatMessage).toHaveBeenCalledWith({ conversationId: null, text: 'who is waiting?' });

    // The expand link now targets the same conversation in the full view.
    expect(screen.getByRole('link', { name: 'Open full chat view' })).toHaveAttribute(
      'href',
      '/chat?c=c9',
    );

    // Second message continues the same conversation.
    sendChatMessage.mockResolvedValue({ ok: true, conversationId: 'c9', message: { ...AI_MSG, id: 'm4' } });
    await user.type(screen.getByLabelText('Message Vesta'), 'and?');
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(sendChatMessage).toHaveBeenLastCalledWith({ conversationId: 'c9', text: 'and?' }),
    );
  });

  it('before any message the expand link goes to a fresh /chat', () => {
    renderDock();
    expect(screen.getByRole('link', { name: 'Open full chat view' })).toHaveAttribute(
      'href',
      '/chat',
    );
  });

  it('close button calls onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDock(true, onClose);
    await user.click(screen.getByRole('button', { name: 'Close mini chat' }));
    expect(onClose).toHaveBeenCalled();
  });
});
