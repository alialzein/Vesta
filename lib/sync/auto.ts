/**
 * Auto-sync helpers (Phase 5). Pure + unit-tested so the client component
 * (components/sync/AutoSync.tsx) stays a thin shell.
 */

/** Default background-sync cadence: every 5 minutes. */
export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Should we auto-sync now? True when there's no prior sync, the timestamp is
 * unparseable, or the last sync is older than the interval.
 */
export function shouldAutoSync(
  lastSyncAt: string | null,
  intervalMs: number = AUTO_SYNC_INTERVAL_MS,
  now: number = Date.now(),
): boolean {
  if (!lastSyncAt) return true;
  const t = Date.parse(lastSyncAt);
  if (Number.isNaN(t)) return true;
  return now - t >= intervalMs;
}
