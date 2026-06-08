'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSyncStatus, syncOutlook } from '@/app/settings/actions';
import { shouldAutoSync, AUTO_SYNC_INTERVAL_MS } from '@/lib/sync/auto';

/** How often the open page re-fetches server data to reflect cron/webhook updates. */
export const VIEW_REFRESH_MS = 60_000;

/**
 * Keeps the open dashboard fresh (Phase 5). Two decoupled jobs on one interval:
 *
 *  1. **View refresh** — `router.refresh()` every ~60s so mail the SERVER cron (or a
 *     webhook) already synced into the DB shows on the open page without a manual
 *     reload. This is the part that matters on a deployment with a cron.
 *  2. **Sync fallback** — only when the mailbox looks stale (no cron keeping it
 *     fresh, e.g. local dev) does the browser itself run a sync. On a deployed cron
 *     `last_sync_at` stays fresh, so this rarely fires.
 *
 * No-ops when Outlook isn't connected.
 */
export function AutoSync({
  refreshMs = VIEW_REFRESH_MS,
  syncStaleMs = AUTO_SYNC_INTERVAL_MS,
}: { refreshMs?: number; syncStaleMs?: number } = {}) {
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (busy.current) return;
      busy.current = true;
      try {
        const status = await getSyncStatus();
        // Local-dev fallback: sync from the browser only when nothing else is
        // keeping the mailbox fresh.
        if (status.connected && shouldAutoSync(status.lastSyncAt, syncStaleMs)) {
          await syncOutlook();
        }
      } catch {
        /* background task — ignore transient errors */
      } finally {
        busy.current = false;
      }
      // Always reflect the latest server data (cron/webhook updates the DB; this
      // pulls it into the open page).
      if (!cancelled) router.refresh();
    }

    void tick();
    const id = setInterval(() => void tick(), refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router, refreshMs, syncStaleMs]);

  return null;
}
