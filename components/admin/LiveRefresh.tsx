'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The console's heartbeat: re-fetches the current admin page's server data
 * every 30s (router.refresh — client state survives), so every tab shows
 * live numbers without manual reloads. Skips ticks while the tab is hidden
 * or the operator paused it; the indicator doubles as the pause toggle.
 */
const INTERVAL_MS = 30_000;

export function LiveRefresh() {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [lastAt, setLastAt] = useState<Date | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const t = setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      router.refresh();
      setLastAt(new Date());
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [router]);

  const label = paused
    ? 'Paused'
    : lastAt
      ? `Live · ${lastAt.toLocaleTimeString('en-US', { hour12: false })}`
      : 'Live · 30s';

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      aria-pressed={paused}
      title={
        paused
          ? 'Auto-refresh is paused — click to resume'
          : 'This console refreshes itself every 30 seconds — click to pause'
      }
      className={[
        'inline-flex items-center gap-[7px] rounded-full border px-[10px] py-[5px] font-mono text-[11px] font-semibold transition',
        paused
          ? 'border-line text-muted hover:text-ink'
          : 'border-green/40 text-green hover:brightness-110',
      ].join(' ')}
    >
      <span
        className={[
          'h-[7px] w-[7px] rounded-full',
          paused ? 'bg-line-strong' : 'animate-vesta-pulse bg-green',
        ].join(' ')}
      />
      {label}
    </button>
  );
}
