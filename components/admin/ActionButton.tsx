'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export type ActionResult = { ok: boolean; message: string };

/**
 * A button that runs a server action and surfaces the result as a toast, with an
 * optional confirmation gate. For destructive actions pass `confirmWord` (e.g.
 * the user's email) to require the operator to type it — the typed-confirm modal
 * is the standard guard on every irreversible admin action.
 */
export function ActionButton({
  run,
  children,
  confirm,
  confirmWord,
  danger = false,
  subtle = false,
  className = '',
}: {
  run: () => Promise<ActionResult>;
  children: ReactNode;
  confirm?: string;
  confirmWord?: string;
  danger?: boolean;
  subtle?: boolean;
  className?: string;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');

  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-[7px] text-[12.5px] font-semibold transition disabled:opacity-50';
  const variant = danger
    ? 'border border-red/50 text-red hover:bg-red-soft'
    : subtle
      ? 'border border-line text-ink-soft hover:border-accent hover:text-accent'
      : 'border border-accent/50 text-accent hover:bg-accent-soft';

  function execute() {
    startTransition(async () => {
      try {
        const res = await run();
        showToast(res.message, res.ok ? 'success' : 'info');
        if (res.ok) router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Action failed.', 'info');
      } finally {
        setOpen(false);
        setTyped('');
      }
    });
  }

  function onClick() {
    if (confirm || confirmWord) {
      setOpen(true);
      return;
    }
    execute();
  }

  return (
    <>
      <button type="button" onClick={onClick} disabled={pending} className={`${base} ${variant} ${className}`}>
        {pending ? '…' : children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[16px] border border-line bg-panel p-5 shadow-panel">
            <p className="m-0 text-[14px] font-semibold text-ink">Please confirm</p>
            <p className="mt-2 text-[13px] text-ink-soft">{confirm}</p>
            {confirmWord && (
              <div className="mt-3">
                <label className="text-[12px] text-muted">
                  Type <span className="font-mono font-semibold text-ink">{confirmWord}</span> to confirm
                </label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoFocus
                  className="mt-1.5 w-full rounded-[10px] border border-line bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
                />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTyped('');
                }}
                className="rounded-[10px] border border-line px-3 py-[7px] text-[12.5px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={execute}
                disabled={pending || (!!confirmWord && typed.trim() !== confirmWord)}
                className={`rounded-[10px] px-3 py-[7px] text-[12.5px] font-semibold transition disabled:opacity-40 ${
                  danger ? 'border border-red/60 text-red hover:bg-red-soft' : 'border border-accent/60 text-accent hover:bg-accent-soft'
                }`}
              >
                {pending ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
