import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// useFormState / useFormStatus are server-action hooks provided by the Next.js
// runtime; they are not callable in plain jsdom. Stub them so the test can
// exercise the AuthForm's own UI logic. The server actions and the Supabase
// browser client are mocked so no real network/auth happens.
const { signIn, signUp } = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }));
const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(
    async (): Promise<{ data: Record<string, unknown>; error: { message: string } | null }> => ({
      data: {},
      error: null,
    }),
  ),
}));
vi.mock('react-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-dom')>();
  return {
    ...actual,
    useFormState: <S,>(_action: unknown, initial: S) => [initial, () => {}] as const,
    useFormStatus: () => ({ pending: false }),
  };
});
vi.mock('@/app/(auth)/actions', () => ({ signIn, signUp }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}));

import { AuthForm } from '@/app/(auth)/AuthForm';

describe('AuthForm', () => {
  beforeEach(() => {
    signInWithOAuth.mockClear();
  });

  it('renders the sign-in form with the AI core and status chip', () => {
    render(<AuthForm />);
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByTestId('vesta-auth-core')).toBeInTheDocument();
    expect(screen.getByText('AI workspace ready')).toBeInTheDocument();
  });

  it('shows Microsoft + Google SSO, an email divider, and email fields', () => {
    render(<AuthForm />);
    expect(screen.getByRole('button', { name: /Continue with Microsoft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByText(/or use email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('clarifies SSO is identity-only and the mailbox connects later in Settings', () => {
    render(<AuthForm />);
    expect(
      screen.getByText(/connect your email mailbox .* for Vesta to read later in Settings/i),
    ).toBeInTheDocument();
  });

  it('calls Supabase signInWithOAuth with azure when Microsoft is clicked', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Continue with Microsoft/i }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'azure' }));
  });

  it('calls Supabase signInWithOAuth with google when Google is clicked', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }));
  });

  it('surfaces an error if a provider is not configured', async () => {
    signInWithOAuth.mockResolvedValueOnce({ data: {}, error: { message: 'Provider not enabled' } });
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Continue with Microsoft/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/isn.t available yet/i);
  });

  it('shows the trust cues', () => {
    render(<AuthForm />);
    expect(screen.getByText('Secure')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Approval-first')).toBeInTheDocument();
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
