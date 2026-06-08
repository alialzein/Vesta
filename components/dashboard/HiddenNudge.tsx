import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

/**
 * Dashboard "review hidden mail" nudge. Triage hides noise (newsletters, alerts,
 * automated senders) into the Hidden list, which otherwise lives only in Settings.
 * Surfacing a quiet count here lets the manager self-correct without digging —
 * the safety net for the rule-based filter (see docs/guides/email-filtering.md and
 * docs/plans/triage-ai-safety-net.md). Renders nothing when nothing was hidden, so it
 * never adds noise of its own. Light/dark via theme tokens.
 */
export function HiddenNudge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href="/hidden"
      className="group flex items-center gap-3 rounded-[12px] border border-line bg-panel px-3.5 py-2.5 text-left shadow-soft transition hover:border-accent"
    >
      <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-accent-soft text-accent">
        <Icon name="inbox" className="h-[17px] w-[17px]" />
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="font-semibold text-ink">
          {count} {count === 1 ? 'message' : 'messages'} filtered this week
        </span>
        <span className="ml-1 text-muted">
          — Vesta hid these as noise. Review in case it got one wrong.
        </span>
      </span>
      <span className="flex-none items-center gap-1 text-[12px] font-semibold text-accent transition group-hover:translate-x-[1px]">
        Review
        <Icon name="chevronRight" className="ml-0.5 inline h-[14px] w-[14px] align-[-2px]" />
      </span>
    </Link>
  );
}
