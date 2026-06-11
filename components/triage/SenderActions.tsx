'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { alwaysAllowSender, muteSender, setSenderVip } from '@/app/(shell)/settings/actions';

/**
 * Per-sender triage controls (Phase 6.5). On the Hidden review: "Always allow"
 * (un-hide this sender) + VIP. In the Inbox: "Mute" (hide this sender) + VIP.
 * Each calls a server action that updates the manager's rules and re-runs triage,
 * then refreshes. Light/dark safe.
 */
export function SenderActions({
  email,
  name,
  context,
  isVip = false,
}: {
  email: string | null;
  name?: string | null;
  context: 'hidden' | 'inbox';
  isVip?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!email) return null;

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const btn =
    'rounded-[8px] border border-line-strong bg-panel-2 px-2.5 py-[5px] text-[11.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-60';

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {context === 'hidden' ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => alwaysAllowSender(email))}
          className={btn}
        >
          Always allow
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => muteSender(email))}
          className={btn}
        >
          Mute sender
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setSenderVip(email, !isVip, name ?? null))}
        className={btn}
      >
        {isVip ? 'Remove VIP' : 'Mark VIP'}
      </button>
    </div>
  );
}
