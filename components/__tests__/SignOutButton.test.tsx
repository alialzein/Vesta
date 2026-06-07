import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn(async () => {}) }));
vi.mock('@/app/(auth)/actions', () => ({ signOut }));

import { SignOutButton } from '@/components/dashboard/SignOutButton';

describe('SignOutButton', () => {
  beforeEach(() => signOut.mockClear());

  it('renders a sign-out control', () => {
    render(<SignOutButton collapsed={false} />);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('calls the signOut action when clicked', async () => {
    const user = userEvent.setup();
    render(<SignOutButton collapsed={false} />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });
});
