'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';

/**
 * Choose a new password after a reset-email link.
 *
 * Recovery links deliver the session as tokens in the URL **#hash** (implicit
 * flow) — only the browser can read them, so this page instantiates the Supabase
 * browser client on mount (detectSessionInUrl consumes the hash and stores the
 * session) and waits for it before showing the form. States: verifying → form,
 * or an expired-link notice. Public path (under /auth) so the middleware never
 * bounces it; theme-aware (light + dark).
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  // One client for the page's lifetime — constructing it triggers hash detection.
  const supabase = useMemo(() => createClient(), []);

  const [ready, setReady] = useState<'checking' | 'ok' | 'no-session'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let done = false;

    // The hash is processed asynchronously — listen for the session landing.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (done) return;
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        done = true;
        setReady('ok');
      }
    });

    // Also check directly (covers an already-established session), and give the
    // hash parsing a moment before declaring the link dead.
    void supabase.auth.getSession().then(({ data }) => {
      if (!done && data.session) {
        done = true;
        setReady('ok');
      }
    });
    const timer = setTimeout(() => {
      if (!done) setReady('no-session');
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
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
            {ready === 'ok'
              ? 'Your reset link is verified — set a new password to finish.'
              : 'Finishing your password reset.'}
          </p>
        </div>

        {ready === 'checking' && (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-line bg-panel p-8 text-center shadow-glow">
            <Icon name="refresh" className="h-6 w-6 animate-spin text-accent" />
            <p className="m-0 text-[13px] text-muted">Verifying your reset link…</p>
          </div>
        )}

        {ready === 'no-session' && (
          <div className="rounded-[var(--radius)] border border-line bg-panel p-6 text-center shadow-glow">
            <p className="m-0 text-[14px] font-semibold text-ink">This link didn&apos;t verify</p>
            <p className="mt-2 text-[13px] leading-snug text-muted">
              It may have expired or already been used. Request a new password-reset email and try
              again — reset links work once and expire after a short time.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-[11px] border border-line px-4 py-[9px] text-[13px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {ready === 'ok' && (
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
        )}
      </div>
    </main>
  );
}
