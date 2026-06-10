'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';

/**
 * Choose a new password after a reset-email link. The link (sent by "Reset
 * password" — self-service or admin-triggered) signs the user in via
 * /auth/callback and lands here; saving calls auth.updateUser. Public path
 * (under /auth) so the middleware never bounces it; theme-aware (light + dark).
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(
        /session/i.test(err.message)
          ? 'This reset link has expired — request a new password-reset email.'
          : err.message,
      );
      return;
    }
    router.replace('/?splash=1');
  }

  const inputClass =
    'w-full rounded-[11px] border border-line bg-field py-[11px] pl-10 pr-3 text-[14px] text-ink outline-none transition placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]';

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="relative z-[1] w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
            Choose a new password
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            You&apos;re signed in — set a new password to finish the reset.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 rounded-[var(--radius)] border border-line bg-panel p-6 shadow-glow"
        >
          <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
            New password
            <span className="relative block">
              <Icon
                name="lock"
                className="pointer-events-none absolute left-3 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-muted"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
              />
            </span>
          </label>

          <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink-soft">
            Confirm password
            <span className="relative block">
              <Icon
                name="lock"
                className="pointer-events-none absolute left-3 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-muted"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
              />
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-[10px] bg-red-soft px-3 py-2 text-[12.5px] text-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-br from-accent to-accent-2 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110 disabled:opacity-60"
          >
            <Icon name="check" className="h-[16px] w-[16px]" />
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </main>
  );
}
