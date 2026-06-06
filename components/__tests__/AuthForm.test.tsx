import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// useFormState / useFormStatus are server-action hooks provided by the Next.js
// runtime; they are not callable in plain jsdom. Stub them so the test can
// exercise the AuthForm's own UI logic. The server actions are mocked to avoid
// pulling in server-only modules (and to assert no real call is made).
// vi.hoisted lets the mock factory (hoisted to the top) reference these spies.
const { signIn, signUp } = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }));
vi.mock('react-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-dom')>();
  return {
    ...actual,
    useFormState: <S,>(_action: unknown, initial: S) => [initial, () => {}] as const,
    useFormStatus: () => ({ pending: false }),
  };
});
vi.mock('@/app/(auth)/actions', () => ({ signIn, signUp }));

import { AuthForm } from '@/app/(auth)/AuthForm';

describe('AuthForm', () => {
  it('renders the sign-in form with the AI core and status chip', () => {
    render(<AuthForm />);
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByTestId('vesta-auth-core')).toBeInTheDocument();
    expect(screen.getByText('AI workspace ready')).toBeInTheDocument();
  });

  it('shows Microsoft as the primary CTA, with an email divider and fields', () => {
    render(<AuthForm />);
    expect(screen.getByRole('button', { name: /Continue with Microsoft/i })).toBeInTheDocument();
    expect(screen.getByText(/or use email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('clarifies Microsoft is sign-in only and Outlook connects in Settings', () => {
    render(<AuthForm />);
    expect(
      screen.getByText(/connect your Outlook mailbox for email later in Settings/i),
    ).toBeInTheDocument();
  });

  it('shows the trust cues', () => {
    render(<AuthForm />);
    expect(screen.getByText('Secure')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Approval-first')).toBeInTheDocument();
  });

  it('shows a demo loading state on Microsoft click and makes no real call', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    const msButton = screen.getByRole('button', { name: /Continue with Microsoft/i });
    await user.click(msButton);

    // Button enters a busy/loading state immediately (no backend call).
    expect(msButton).toHaveAttribute('aria-busy', 'true');
    expect(msButton).toBeDisabled();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('switches to sign-up mode and reveals full-name + confirm-password fields', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Create one/i }));

    expect(screen.getByRole('heading', { name: /Create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('warns and disables submit when sign-up passwords do not match', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Create one/i }));
    await user.type(screen.getByLabelText('Password'), 'supersecret');
    await user.type(screen.getByLabelText('Confirm password'), 'different');

    expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });

  it('always shows the safety copy', () => {
    render(<AuthForm />);
    expect(screen.getByText(/never sends email automatically/i)).toBeInTheDocument();
  });
});
