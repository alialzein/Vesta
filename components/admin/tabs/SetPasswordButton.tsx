'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { adminSetPassword } from '@/app/(admin)/admin/actions';

/**
 * "Set password" — the operator types (or generates) a new password for a user
 * and applies it immediately. Complements the email reset for cases where the
 * user can't receive mail. The password is shown once here and never logged.
 */
export function SetPasswordButton({ userId, email }: { userId: string; email: string | null }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  function generate() {
    // URL-safe random password, ~16 chars (crypto-grade, browser-side only).
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    setPassword(btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 16));
  }

  function apply() {
    startTransition(async () => {
      const res = await adminSetPassword(userId, password);
      showToast(res.message, res.ok ? 'success' : 'info');
      if (res.ok) {
        setOpen(false);
        setPassword('');
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-line px-3 py-[7px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        Set password
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[16px] border border-line bg-panel p-5 shadow-panel">
            <p className="m-0 text-[14px] font-semibold text-ink">Set a new password</p>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              For <span className="font-semibold">{email ?? 'this user'}</span>. It takes effect
              immediately — share it with them securely (it is never stored or logged).
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="At least 8 characters"
                aria-label="New password"
                className="min-w-0 flex-1 rounded-[10px] border border-line bg-field px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={generate}
                className="flex-none rounded-[10px] border border-line px-3 py-2 text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
              >
                Generate
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPassword('');
                }}
                className="rounded-[10px] border border-line px-3 py-[7px] text-[12.5px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={pending || password.trim().length < 8}
                className="rounded-[10px] border border-accent/60 px-3 py-[7px] text-[12.5px] font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-40"
              >
                {pending ? 'Saving…' : 'Apply password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
