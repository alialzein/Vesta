'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSyncStatus, syncOutlook } from '@/app/settings/actions';
import { shouldAutoSync, AUTO_SYNC_INTERVAL_MS } from '@/lib/sync/auto';

/**
 * Background auto-sync (Phase 5). Invisible: on mount (if the last sync is stale)
 * and on an interval while the app is open, it runs a sync and refreshes the
 * route so fresh, triaged mail shows without the manager clicking "Sync now".
 * No-ops when Outlook isn't connected. Webhooks (real-time push) replace the
 * interval once Vesta runs on a public URL — see app/api/outlook/webhook.
 */
export function AutoSync({ intervalMs = AUTO_SYNC_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (busy.current) return;
      busy.current = true;
      try {
        const status = await getSyncStatus();
        if (!status.connected || !shouldAutoSync(status.lastSyncAt, intervalMs)) return;
        const result = await syncOutlook();
        if (result.ok && !cancelled) router.refresh();
      } catch {
        /* background task — ignore transient errors */
      } finally {
        busy.current = false;
      }
    }

    void tick();
    const id = setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router, intervalMs]);

  return null;
}
