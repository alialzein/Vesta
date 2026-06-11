import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RemindersCard } from '@/components/settings/RemindersCard';
import type { ReminderView } from '@/lib/reminders/data';
import { ToastProvider } from '@/components/ui/Toast';

const cancelReminder = vi.fn(async () => ({ ok: true as const }));
vi.mock('@/app/actions/reminders', () => ({
  cancelReminder: (...args: unknown[]) => cancelReminder(...(args as [])),
}));

const REMINDER: ReminderView = {
  id: 'r1',
  subject: 'Technical meeting timing',
  toEmail: 'ali@example.com',
  nextSendAt: '2026-06-12T15:00:00.000Z',
  scheduleLabel: 'hourly × 3 (1 sent)',
  itemTitle: 'Zahraa — meeting timing',
  status: 'scheduled',
};

function renderCard(reminders: ReminderView[]) {
  return render(
    <ToastProvider>
      <RemindersCard reminders={reminders} />
    </ToastProvider>,
  );
}

describe('RemindersCard', () => {
  beforeEach(() => cancelReminder.mockClear());

  it('lists active reminders with schedule, recipient, and thread', () => {
    renderCard([REMINDER]);
    expect(screen.getByText('Technical meeting timing')).toBeInTheDocument();
    expect(screen.getByText(/To ali@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/hourly × 3 \(1 sent\)/)).toBeInTheDocument();
    expect(screen.getByText(/thread: Zahraa — meeting timing/)).toBeInTheDocument();
  });

  it('cancelling removes the reminder optimistically', async () => {
    const user = userEvent.setup();
    renderCard([REMINDER]);
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(cancelReminder).toHaveBeenCalledWith('r1');
    expect(screen.queryByText('Technical meeting timing')).not.toBeInTheDocument();
  });

  it('explains itself when nothing is scheduled', () => {
    renderCard([]);
    expect(screen.getByText(/Nothing scheduled/)).toBeInTheDocument();
    expect(screen.getByText(/Email me a reminder/)).toBeInTheDocument();
  });
});
