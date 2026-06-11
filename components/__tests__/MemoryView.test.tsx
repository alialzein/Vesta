import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRecord } from '@/lib/types';
import { ToastProvider } from '@/components/ui/Toast';

// Server actions pull in server-only modules; stub them (their logic is
// covered by RLS + the lib/ai/memory unit tests).
vi.mock('@/app/actions/memories', () => ({
  addMemory: vi.fn(async () => ({ ok: true })),
  updateMemoryText: vi.fn(async () => ({ ok: true })),
  setMemoryActive: vi.fn(async () => ({ ok: true })),
  deleteMemory: vi.fn(async () => ({ ok: true })),
  approveMemory: vi.fn(async () => ({ ok: true })),
  rejectMemory: vi.fn(async () => ({ ok: true })),
}));

import {
  addMemory,
  approveMemory,
  deleteMemory,
  rejectMemory,
  setMemoryActive,
} from '@/app/actions/memories';
import { MemoryView } from '@/components/dashboard/MemoryView';

const MEMORIES: MemoryRecord[] = [
  {
    id: 'm-vip',
    type: 'vip',
    text: 'Treat maya@cedars.com as VIP.',
    scopeEmail: null,
    source: 'manual',
    isActive: true,
    pending: false,
    createdAt: '2026-06-10T10:00:00Z',
  },
  {
    id: 'm-tone',
    type: 'tone',
    text: 'Short sentences, no fluff.',
    scopeEmail: null,
    source: 'manual',
    isActive: false, // paused by the manager
    pending: false,
    createdAt: '2026-06-10T10:00:00Z',
  },
  {
    id: 'm-suggested',
    type: 'preference',
    text: 'When replying to Maya: always include the ticket number.',
    scopeEmail: 'maya@cedars.com',
    source: 'ai_suggested',
    isActive: false,
    pending: true,
    createdAt: '2026-06-11T08:00:00Z',
  },
];

function renderView(memories: MemoryRecord[] = MEMORIES) {
  return render(
    <ToastProvider>
      <MemoryView memories={memories} />
    </ToastProvider>,
  );
}

describe('MemoryView (Phase 10)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists saved memories and shows paused state', () => {
    renderView();
    expect(screen.getByText('Treat maya@cedars.com as VIP.')).toBeInTheDocument();
    expect(screen.getByText('Short sentences, no fluff.')).toBeInTheDocument();
    // The paused row offers Resume; the active one offers Pause.
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('shows pending suggestions in the approval queue, separate from saved ones', () => {
    renderView();
    expect(screen.getByText(/Vesta suggests — waiting for your approval/)).toBeInTheDocument();
    expect(
      screen.getByText('When replying to Maya: always include the ticket number.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('approves a suggestion via the server action', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(approveMemory).toHaveBeenCalledWith('m-suggested');
  });

  it('rejects a suggestion via the server action', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(rejectMemory).toHaveBeenCalledWith('m-suggested');
  });

  it('adds a typed memory with the selected type', async () => {
    const user = userEvent.setup();
    renderView([]);
    await user.selectOptions(screen.getByLabelText('Memory type'), 'do_not_do');
    await user.type(screen.getByLabelText('New memory text'), 'Never commit budget on email');
    await user.click(screen.getByRole('button', { name: /Remember this/ }));
    expect(addMemory).toHaveBeenCalledWith({
      type: 'do_not_do',
      text: 'Never commit budget on email',
    });
  });

  it('pauses and deletes via the server actions', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(setMemoryActive).toHaveBeenCalledWith('m-vip', false);
    await user.click(
      screen.getByRole('button', { name: 'Forget memory: Treat maya@cedars.com as VIP.' }),
    );
    expect(deleteMemory).toHaveBeenCalledWith('m-vip');
  });

  it('renders the empty state when there are no memories', () => {
    renderView([]);
    expect(screen.queryByText(/waiting for your approval/)).not.toBeInTheDocument();
  });
});
