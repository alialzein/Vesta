'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  disconnectOutlook,
  testOutlook,
  syncOutlook,
  setTriageMode,
  type TestResult,
} from '@/app/(shell)/settings/actions';
import type { SyncResult } from '@/lib/sync/outlook';
import type { TriageMode } from '@/lib/engine/triage';
import { Icon, MicrosoftLogo } from '@/components/ui/Icon';

export type OutlookStatus = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  configured: boolean;
  triageMode: TriageMode;
  /** The connected mailbox granted Mail.Send (Phase 9) — sending works without reconnecting. */
  sendingEnabled: boolean;
};

/** The triage modes, in display order, with a short manager-facing description. */
const TRIAGE_MODES: { value: TriageMode; label: string; hint: string }[] = [
  { value: 'focused', label: 'Focused', hint: 'Real people. Hides automated, bulk & “Other”.' },
  { value: 'flagged', label: 'Flagged only', hint: 'Only emails you flag in Outlook.' },
  { value: 'everything', label: 'Everything', hint: 'Import all mail; mute noise yourself.' },
];

/**
 * Settings → Outlook connection card (Phase 3). Connect kicks off the OAuth flow
 * (`/api/outlook/connect`); Disconnect + Test are server actions. Demo-safe: if
 * Graph isn't configured yet, the card explains the pending setup. Light/dark safe.
 */
export function OutlookCard({ status, notice }: { status: OutlookStatus; notice?: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [test, setTest] = useState<TestResult | null>(null);
  const [sync, setSync] = useState<SyncResult | null>(null);
  const [modeNote, setModeNote] = useState<string | null>(null);

  function runTest() {
    setTest(null);
    setSync(null);
    startTransition(async () => {
      setTest(await testOutlook());
    });
  }

  function runSync() {
    setTest(null);
    setSync(null);
    startTransition(async () => {
      const result = await syncOutlook();
      setSync(result);
      if (result.ok) router.refresh();
    });
  }

  function disconnect() {
    startTransition(() => {
      void disconnectOutlook();
    });
  }

  function changeMode(mode: TriageMode) {
    if (mode === status.triageMode || isPending) return;
    setSync(null);
    setTest(null);
    setModeNote(null);
    startTransition(async () => {
      const result = await setTriageMode(mode);
      const label = TRIAGE_MODES.find((m) => m.value === mode)?.label ?? mode;
      setModeNote(
        result.ok
          ? `Now watching ${label} — ${result.workItems} waiting on you · ${result.hidden} hidden.`
          : `Could not switch: ${result.error ?? 'unknown error'}`,
      );
      router.refresh();
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

          {sync && (
            <p
              role="status"
              className={[
                'mt-3 rounded-[10px] border px-3 py-2 text-[12.5px]',
                sync.ok
                  ? 'border-[color:var(--green)] bg-green-soft text-green'
                  : 'border-[color:var(--red)] bg-red-soft text-red',
              ].join(' ')}
            >
              {sync.ok
                ? `Synced ${sync.inbox} new inbox + ${sync.sent} sent · ${sync.workItems} waiting on you · ${sync.hidden} hidden as noise. See Inbox & Priorities.`
                : `Sync failed: ${sync.error}`}
            </p>
          )}

          {status.connected && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold text-ink-soft">What Vesta watches</p>
              <p className="mt-0.5 text-[12px] text-muted">
                {TRIAGE_MODES.find((m) => m.value === status.triageMode)?.hint}
              </p>
              <div
                role="group"
                aria-label="What Vesta watches"
                className="mt-2 inline-flex rounded-[11px] border border-line-strong bg-panel-2 p-1"
              >
                {TRIAGE_MODES.map((m) => {
                  const active = m.value === status.triageMode;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => changeMode(m.value)}
                      disabled={isPending}
                      aria-pressed={active}
                      className={[
                        'rounded-[8px] px-3 py-[6px] text-[12.5px] font-semibold transition disabled:opacity-70',
                        active
                          ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow-soft'
                          : 'text-ink-soft hover:text-ink',
                      ].join(' ')}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {modeNote && <span className="text-[12px] text-ink-soft">{modeNote}</span>}
                <Link
                  href="/hidden"
                  className="text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Review hidden mail →
                </Link>
              </div>
            </div>
          )}

          {status.connected && (
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span className="inline-flex items-center gap-[6px] font-semibold text-ink-soft">
                <Icon name="send" className="h-[14px] w-[14px] text-muted" />
                Sending replies
              </span>
              {status.sendingEnabled ? (
                <span className="rounded-full bg-green-soft px-[9px] py-[2px] font-semibold text-green">
                  Enabled
                </span>
              ) : (
                <>
                  <span className="rounded-full bg-amber-soft px-[9px] py-[2px] font-semibold text-amber">
                    Reconnect to enable
                  </span>
                  <a
                    href="/api/outlook/connect"
                    className="font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Reconnect Outlook →
                  </a>
                </>
              )}
            </div>
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
                  onClick={runSync}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.3)] transition hover:brightness-110 disabled:opacity-70"
                >
                  {isPending && (
                    <Icon
                      name="refresh"
                      className="animate-spin-slow h-[15px] w-[15px]"
                      aria-hidden="true"
                    />
                  )}
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={runTest}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-[11px] border border-line-strong bg-panel-2 px-3 py-[10px] text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-70"
                >
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
