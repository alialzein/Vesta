'use client';

import { useState, useTransition } from 'react';
import { disconnectOutlook, testOutlook, type TestResult } from '@/app/settings/actions';
import { Icon, MicrosoftLogo } from '@/components/ui/Icon';

export type OutlookStatus = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  configured: boolean;
};

/**
 * Settings → Outlook connection card (Phase 3). Connect kicks off the OAuth flow
 * (`/api/outlook/connect`); Disconnect + Test are server actions. Demo-safe: if
 * Graph isn't configured yet, the card explains the pending setup. Light/dark safe.
 */
export function OutlookCard({ status, notice }: { status: OutlookStatus; notice?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [test, setTest] = useState<TestResult | null>(null);

  function runTest() {
    setTest(null);
    startTransition(async () => {
      setTest(await testOutlook());
    });
  }

  function disconnect() {
    startTransition(() => {
      void disconnectOutlook();
    });
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] border border-line bg-white">
          <MicrosoftLogo className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="m-0 font-display text-[16px] font-semibold tracking-tight">
              Outlook (Microsoft 365)
            </h3>
            <span
              className={[
                'rounded-full px-[9px] py-[2px] text-[11px] font-semibold',
                status.connected ? 'bg-green-soft text-green' : 'bg-panel-2 text-muted',
              ].join(' ')}
            >
              {status.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            {status.connected
              ? `Vesta reads this mailbox to organise your work. ${status.email ?? ''}`
              : 'Connect your Outlook mailbox so Vesta can read and organise your email. Vesta never sends email without your approval.'}
          </p>

          {notice && (
            <p
              role="status"
              className="mt-3 rounded-[10px] border border-line bg-panel-2 px-3 py-2 text-[12.5px] text-ink-soft"
            >
              {notice}
            </p>
          )}

          {test && (
            <p
              role="status"
              className={[
                'mt-3 rounded-[10px] border px-3 py-2 text-[12.5px]',
                test.ok
                  ? 'border-[color:var(--green)] bg-green-soft text-green'
                  : 'border-[color:var(--red)] bg-red-soft text-red',
              ].join(' ')}
            >
              {test.ok ? `Connection OK — ${test.email}` : `Test failed: ${test.error}`}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!status.connected ? (
              status.configured ? (
                <a
                  href="/api/outlook/connect"
                  className="inline-flex items-center gap-[10px] rounded-[11px] border border-line-strong bg-white px-4 py-[10px] text-[13px] font-semibold text-[#1b1f24] shadow-soft transition hover:brightness-[1.03]"
                >
                  <MicrosoftLogo className="h-[16px] w-[16px]" />
                  Connect Outlook
                </a>
              ) : (
                <span className="rounded-[11px] border border-dashed border-line-strong bg-panel-2 px-3 py-[10px] text-[12.5px] text-muted">
                  Outlook sign-in isn’t configured yet (add the Microsoft app keys).
                </span>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={runTest}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-[11px] border border-line-strong bg-panel-2 px-3 py-[10px] text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-70"
                >
                  {isPending && (
                    <Icon
                      name="refresh"
                      className="animate-spin-slow h-[15px] w-[15px]"
                      aria-hidden="true"
                    />
                  )}
                  Test connection
                </button>
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={isPending}
                  className="inline-flex items-center rounded-[11px] border border-line-strong bg-panel-2 px-3 py-[10px] text-[13px] font-semibold text-ink-soft transition hover:border-[color:var(--red)] hover:text-red disabled:opacity-70"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
