'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, signUp, type AuthState } from './actions';
import { VestaMark } from '@/components/ui/Icon';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-[12px] bg-gradient-to-br from-accent to-accent-2 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(74,111,165,0.35)] transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? 'Please wait…' : label}
    </button>
  );
}

export function AuthForm({ redirectedFrom }: { redirectedFrom?: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const action = mode === 'signin' ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(action, null);

  return (
    <div className="w-full max-w-[420px]">
      {/* Brand */}
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[radial-gradient(circle_at_50%_95%,#67e8d8,#5ba8f5_45%,var(--accent-2)_100%)] shadow-[0_8px_22px_rgba(74,111,165,0.4),inset_0_0_0_1px_rgba(255,255,255,.25)]">
          <VestaMark className="h-7 w-7 text-white drop-shadow" />
        </div>
        <div>
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {mode === 'signin'
              ? 'Sign in to your Vesta command center.'
              : 'Start putting your work in order.'}
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-[var(--radius)] border border-line bg-panel p-6 shadow-glow backdrop-blur-[16px]">
        <form action={formAction} className="flex flex-col gap-3">
          {redirectedFrom && <input type="hidden" name="redirectedFrom" value={redirectedFrom} />}

          {mode === 'signup' && (
            <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
              Full name
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Ali Sabbagh"
                className="rounded-[11px] border border-line bg-field px-3 py-[11px] text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent"
              />
            </label>
          )}

          <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="rounded-[11px] border border-line bg-field px-3 py-[11px] text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
              className="rounded-[11px] border border-line bg-field px-3 py-[11px] text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

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

          <SubmitButton label={mode === 'signin' ? 'Sign in' : 'Create account'} />
        </form>
      </div>

      {/* Mode switch */}
      <p className="mt-5 text-center text-[13px] text-muted">
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
          className="font-semibold text-accent hover:underline"
        >
          {mode === 'signin' ? 'Create one' : 'Sign in'}
        </button>
      </p>

      {/* Safety copy */}
      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-muted">
        Vesta keeps your data private to you. It never sends email automatically and asks before
        saving anything that teaches the assistant.
      </p>
    </div>
  );
}
