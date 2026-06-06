import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// useFormState / useFormStatus are server-action hooks provided by the Next.js
// runtime; they are not callable in plain jsdom. Stub them so the test can
// exercise the AuthForm's own UI logic (mode toggle, fields, copy). The
// server actions are mocked to avoid pulling in server-only modules.
vi.mock('react-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-dom')>();
  return {
    ...actual,
    useFormState: <S,>(_action: unknown, initial: S) => [initial, () => {}] as const,
    useFormStatus: () => ({ pending: false }),
  };
});
vi.mock('@/app/(auth)/actions', () => ({ signIn: vi.fn(), signUp: vi.fn() }));

import { AuthForm } from '@/app/(auth)/AuthForm';

describe('AuthForm', () => {
  it('renders the sign-in form by default', () => {
    render(<AuthForm />);
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
  });

  it('switches to sign-up mode and reveals the full-name field', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Create one/i }));

    expect(screen.getByRole('heading', { name: /Create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
  });

  it('always shows the safety copy', () => {
    render(<AuthForm />);
    expect(screen.getByText(/never sends email automatically/i)).toBeInTheDocument();
  });
});
