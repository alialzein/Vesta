'use client';

import { useTransition } from 'react';
import { createPortal } from 'react-dom';
import { signOut } from '@/app/(auth)/actions';
import { Icon, VestaMark } from '@/components/ui/Icon';

/**
 * Sign-out control with a branded "Signing you out…" overlay (Phase 3.1 polish).
 *
 * Uses a transition (not a form) so it works without the server-action form
 * hooks and can show a full-screen AI spinner while the session is cleared and
 * the app redirects to /login. The overlay is rendered through a portal to
 * document.body so it covers the whole viewport — the sidebar uses CSS transforms,
 * which would otherwise trap a `fixed` overlay inside the left panel. Light/dark
 * safe; reduced-motion safe (animate-spin-slow is disabled under reduced motion).
 */
export function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    if (pending) return;
    startTransition(() => {
      void signOut();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        aria-busy={pending}
        aria-label="Sign out"
        title="Sign out"
        className={
          collapsed
            ? 'grid h-9 w-9 place-items-center rounded-[11px] border border-[color:var(--side-card-border)] bg-[color:var(--side-card)] text-[color:var(--side-muted)] transition hover:text-red disabled:opacity-60'
            : 'grid h-8 w-8 flex-none place-items-center rounded-[9px] border border-transparent text-[color:var(--side-muted)] transition hover:border-[color:var(--side-card-border)] hover:text-red disabled:opacity-60'
        }
      >
        <Icon
          name={pending ? 'refresh' : 'signout'}
          className={`h-[17px] w-[17px] ${pending ? 'animate-spin-slow' : ''}`}
        />
      </button>

      {pending &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="status"
            aria-label="Signing you out"
            className="fixed inset-0 z-[200] grid place-items-center bg-[color:var(--bg)]/90 backdrop-blur-[2px]"
          >
            <div className="flex flex-col items-center gap-4">
              <span className="relative grid h-16 w-16 place-items-center">
                <span
                  className="animate-vesta-pulse absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)]"
                  aria-hidden="true"
                />
                <span className="animate-vesta-breathe grid h-12 w-12 place-items-center rounded-full bg-[radial-gradient(circle_at_32%_26%,#7cc0ff,#2f7deb_70%)] text-white shadow-[0_0_30px_6px_rgba(91,168,245,0.45)]">
                  <VestaMark className="h-6 w-6" />
                </span>
              </span>
              <span className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                <Icon
                  name="refresh"
                  className="animate-spin-slow h-[16px] w-[16px] text-accent"
                  aria-hidden="true"
                />
                Signing you out…
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
