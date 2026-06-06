'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, signUp, type AuthState } from './actions';
import { VestaAuthCore } from './VestaAuthCore';
import { createClient } from '@/lib/supabase/client';
import { Icon, MicrosoftLogo, GoogleLogo } from '@/components/ui/Icon';

type OAuthProvider = 'azure' | 'google';
const PROVIDER_LABEL: Record<OAuthProvider, string> = { azure: 'Microsoft', google: 'Google' };

/** Rotating phrases shown while the email sign-in action is pending. */
const SIGNIN_PHRASES = ['Signing you in', 'Preparing your workspace', 'Loading Vesta'] as const;
const SIGNUP_PHRASES = [
  'Creating your account',
  'Preparing your workspace',
  'Loading Vesta',
] as const;

/** Cycle through phrases on an interval while `active`; reset to 0 when idle. */
function usePhraseCycle(active: boolean, phrases: readonly string[]) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) {
      setI(0);
      return;
    }
    const id = window.setInterval(() => setI((p) => (p + 1 < phrases.length ? p + 1 : p)), 900);
    return () => window.clearInterval(id);
  }, [active, phrases.length]);
  return phrases[i];
}

/**
 * Secondary email submit button with a loading morph (spinner + rotating copy)
 * that hands off to the Vesta initialization splash once the server action
 * redirects into the app.
 */
function SubmitButton({ mode, disabled }: { mode: 'signin' | 'signup'; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const phrase = usePhraseCycle(pending, mode === 'signin' ? SIGNIN_PHRASES : SIGNUP_PHRASES);
  const label = mode === 'signin' ? 'Sign in' : 'Create account';

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-[12px] border border-line-strong bg-panel-2 px-4 py-[11px] text-[14px] font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && (
        <Icon name="refresh" className="animate-spin-slow h-[16px] w-[16px]" aria-hidden="true" />
      )}
      <span aria-live="polite">{pending ? phrase : label}</span>
    </button>
  );
}

export function AuthForm({ redirectedFrom }: { redirectedFrom?: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const action = mode === 'signin' ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(action, null);

  // Confirm-password match check (sign-up only, client-side UX guard).
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = mode === 'signup' && confirm.length > 0 && password !== confirm;

  // OAuth SSO (Phase 2b). signInWithOAuth redirects the browser to the provider;
  // if the provider is not yet configured in Supabase, it returns an error and
  // we surface it gracefully (the screen keeps working).
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  async function handleOAuth(provider: OAuthProvider) {
    if (oauthLoading) return;
    setOauthError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser navigates to the provider; on error we recover.
    if (error) {
      setOauthLoading(null);
      setOauthError(`${PROVIDER_LABEL[provider]} sign-in isn’t available yet. ${error.message}`);
    }
  }

  const inputClass =
    'w-full rounded-[11px] border border-line bg-field py-[11px] pl-10 pr-3 text-[14px] text-ink outline-none transition placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]';

  const ssoBusy = oauthLoading !== null;

  return (
    <div className="relative z-[1] w-full max-w-[420px]">
      {/* Brand: AI signal core + status chip + welcome copy */}
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <VestaAuthCore />
        <span className="inline-flex items-center gap-[7px] rounded-full border border-line bg-panel-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-soft">
          <span
            className="animate-vesta-pulse h-[7px] w-[7px] rounded-full bg-green shadow-[0_0_0_3px_var(--green-soft)]"
            aria-hidden="true"
          />
          AI workspace ready
        </span>
        <div>
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {mode === 'signin'
              ? 'Sign in to your Vesta command center.'
              : 'Your AI workspace for organized executive work.'}
          </p>
        </div>
      </div>

      {/* Card — premium AI console panel: top edge highlight + soft glow. */}
      <div className="relative overflow-hidden rounded-[var(--radius)] border border-line bg-panel p-6 shadow-glow backdrop-blur-[16px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent)] to-transparent opacity-40"
        />

        {/* Primary CTAs — single sign-on (identity only). */}
        <div className="flex flex-col gap-[10px]">
          <button
            type="button"
            onClick={() => handleOAuth('azure')}
            disabled={ssoBusy}
            aria-busy={oauthLoading === 'azure'}
            className="flex w-full items-center justify-center gap-[10px] rounded-[12px] border border-line-strong bg-white px-4 py-3 text-[14px] font-semibold text-[#1b1f24] shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition hover:brightness-[1.03] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {oauthLoading === 'azure' ? (
              <Icon
                name="refresh"
                className="animate-spin-slow h-[16px] w-[16px] text-[#1b1f24]"
                aria-hidden="true"
              />
            ) : (
              <MicrosoftLogo className="h-[18px] w-[18px]" />
            )}
            <span aria-live="polite">
              {oauthLoading === 'azure' ? 'Connecting to Microsoft…' : 'Continue with Microsoft'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={ssoBusy}
            aria-busy={oauthLoading === 'google'}
            className="flex w-full items-center justify-center gap-[10px] rounded-[12px] border border-line-strong bg-white px-4 py-3 text-[14px] font-semibold text-[#1b1f24] shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition hover:brightness-[1.03] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {oauthLoading === 'google' ? (
              <Icon
                name="refresh"
                className="animate-spin-slow h-[16px] w-[16px] text-[#1b1f24]"
                aria-hidden="true"
              />
            ) : (
              <GoogleLogo className="h-[18px] w-[18px]" />
            )}
            <span aria-live="polite">
              {oauthLoading === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
            </span>
          </button>
        </div>

        {/* Clarify intent: SSO is identity only; mailbox connection is separate. */}
        <p className="mt-2 text-center text-[11px] leading-snug text-muted">
          Single sign-on confirms who you are. You&apos;ll connect your email mailbox (Outlook,
          Gmail, or IMAP) for Vesta to read later in Settings.
        </p>

        {oauthError && (
          <p
            role="alert"
            className="mt-3 rounded-[10px] border border-[color:var(--red)] bg-red-soft px-3 py-2 text-[12px] text-red"
          >
            {oauthError}
          </p>
        )}

        {/* Divider */}
        <div className="my-4 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            or use email
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        {/* Secondary — email / password */}
        <form action={formAction} className="flex flex-col gap-3">
          {redirectedFrom && <input type="hidden" name="redirectedFrom" value={redirectedFrom} />}

          {mode === 'signup' && (
            <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
              Full name
              <span className="relative block">
                <Icon
                  name="people"
                  className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ali Sabbagh"
                  className={inputClass}
                />
              </span>
            </label>
          )}

          <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
            Email
            <span className="relative block">
              <Icon
                name="mail"
                className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className={inputClass}
              />
            </span>
          </label>

          <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
            Password
            <span className="relative block">
              <Icon
                name="lock"
                className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                className={inputClass}
              />
            </span>
          </label>

          {mode === 'signup' && (
            <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
              Confirm password
              <span className="relative block">
                <Icon
                  name="lock"
                  className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  aria-invalid={mismatch}
                  className={`${inputClass} ${mismatch ? 'border-[color:var(--red)] focus:shadow-[0_0_0_3px_var(--red-soft)]' : ''}`}
                />
              </span>
              {mismatch && (
                <span role="alert" className="text-[12px] text-red">
                  Passwords do not match.
                </span>
              )}
            </label>
          )}

          {state?.error && (
            <p
              role="alert"
              className="rounded-[10px] border border-[color:var(--red)] bg-red-soft px-3 py-2 text-[12.5px] text-red"
            >
              {state.error}
            </p>
          )}
          {state?.message && (
            <p
              role="status"
              className="rounded-[10px] border border-[color:var(--green)] bg-green-soft px-3 py-2 text-[12.5px] text-green"
            >
              {state.message}
            </p>
          )}

          <SubmitButton mode={mode} disabled={mismatch || ssoBusy} />
        </form>
      </div>

      {/* Mode switch */}
      <p className="mt-5 text-center text-[13px] text-muted">
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setConfirm('');
            setOauthError(null);
          }}
          className="font-semibold text-accent hover:underline"
        >
          {mode === 'signin' ? 'Create one' : 'Sign in'}
        </button>
      </p>

      {/* Trust / intelligence cues */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {[
          { icon: 'shield' as const, label: 'Secure' },
          { icon: 'lock' as const, label: 'Private' },
          { icon: 'sparkle' as const, label: 'Approval-first' },
        ].map((chip) => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-[6px] rounded-full border border-line bg-panel-2 px-[10px] py-[5px] text-[11.5px] font-semibold text-ink-soft"
          >
            <Icon name={chip.icon} className="h-[13px] w-[13px] text-accent" aria-hidden="true" />
            {chip.label}
          </span>
        ))}
      </div>

      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-muted">
        Vesta keeps your data private to you. It never sends email automatically and asks before
        saving anything that teaches the assistant.
      </p>
    </div>
  );
}
