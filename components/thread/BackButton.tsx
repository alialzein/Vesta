'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

/**
 * Thread-view back button. The thread can be opened from the dashboard, Inbox, or
 * Priorities, so a hard-coded target would send the manager to the wrong place.
 * This goes **back to wherever they came from** (browser history), falling back to
 * the dashboard when there's no in-app history (e.g. opened via a direct link).
 */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push('/');
      }}
      className="grid h-9 w-9 flex-none place-items-center rounded-[11px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent"
    >
      <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
    </button>
  );
}
