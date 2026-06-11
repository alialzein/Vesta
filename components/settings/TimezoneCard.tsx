'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setTimezonePreference } from '@/app/(shell)/settings/actions';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * Settings → Timezone. Default is automatic: Vesta follows the device's
 * timezone (reported on every app load). Picking one manually PINS it —
 * auto-detection then leaves it alone until "Automatic" is chosen again.
 * Due times, the Weekly Review days, and the daily brief all use this zone.
 */
export function TimezoneCard({
  timezone,
  manual,
}: {
  /** The stored profiles.timezone. */
  timezone: string;
  /** True when the manager pinned a timezone manually. */
  manual: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<'auto' | 'manual'>(manual ? 'manual' : 'auto');
  const [selected, setSelected] = useState(timezone);

  const deviceTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const zones = useMemo(() => {
    const intl = Intl as { supportedValuesOf?: (key: string) => string[] };
    const all =
      typeof intl.supportedValuesOf === 'function'
        ? intl.supportedValuesOf('timeZone')
        : ['UTC', deviceTz, timezone];
    return [...new Set([...all, deviceTz, timezone])].sort();
  }, [deviceTz, timezone]);

  function save(nextMode: 'auto' | 'manual', tz: string) {
    startTransition(async () => {
      const res = await setTimezonePreference(nextMode, tz);
      if (res.ok) {
        showToast(
          nextMode === 'auto'
            ? `Following your device timezone (${tz}).`
            : `Timezone pinned to ${tz}.`,
        );
        router.refresh();
      } else {
        showToast(res.error ?? 'Could not save the timezone.');
      }
    });
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-accent-soft text-accent">
          <Icon name="clock" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[15px] font-semibold tracking-tight">Timezone</h3>
          <p className="m-0 mt-[2px] text-[12.5px] text-muted">
            Due times, the Weekly Review days, and your daily brief follow this clock. Currently:{' '}
            <b className="text-ink-soft">{timezone}</b>
            {manual ? ' (pinned)' : ' (automatic)'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-[10px] rounded-[12px] border border-line bg-panel-2 p-3 transition hover:border-line-strong">
          <input
            type="radio"
            name="tz-mode"
            checked={mode === 'auto'}
            onChange={() => {
              setMode('auto');
              save('auto', deviceTz);
            }}
            disabled={pending}
            className="mt-[2px] accent-[var(--accent)]"
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink">
              Automatic — follow my device
            </span>
            <span className="mt-[1px] block text-[12px] text-muted">
              This device reports <b>{deviceTz}</b>. Travel and Vesta follows along.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-[10px] rounded-[12px] border border-line bg-panel-2 p-3 transition hover:border-line-strong">
          <input
            type="radio"
            name="tz-mode"
            checked={mode === 'manual'}
            onChange={() => setMode('manual')}
            disabled={pending}
            className="mt-[2px] accent-[var(--accent)]"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">Pin a timezone</span>
            <span className="mt-[1px] block text-[12px] text-muted">
              Stays fixed no matter which device you sign in from.
            </span>
            {mode === 'manual' && (
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={pending}
                  aria-label="Pinned timezone"
                  className="min-w-0 rounded-[10px] border border-line bg-panel px-3 py-[8px] text-[13px] text-ink outline-none focus:border-accent"
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save('manual', selected)}
                  className="inline-flex items-center gap-[6px] rounded-[10px] bg-gradient-to-br from-accent to-accent-2 px-3 py-[8px] text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  <Icon name="check" className="h-[13px] w-[13px]" />
                  {pending ? 'Saving…' : 'Pin timezone'}
                </button>
              </span>
            )}
          </span>
        </label>
      </div>
    </div>
  );
}
