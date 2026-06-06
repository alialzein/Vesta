'use client';

import type { MorningBrief as MorningBriefData } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';

export type BriefAction = 'focus' | 'drafts' | 'meeting';

// Delegate intentionally lives only in Today's Radar rows and the AI rail, so
// it is not duplicated here (Phase 0.4).
const ACTIONS: { id: BriefAction; label: string; icon: IconName; primary?: boolean }[] = [
  { id: 'focus', label: 'Clear My Day', icon: 'sparkle', primary: true },
  { id: 'drafts', label: 'Draft Replies', icon: 'drafts' },
  { id: 'meeting', label: 'Meeting Prep', icon: 'calendar' },
];

/**
 * Compact Morning Brief (Phase 0.3). A short hero card: badge + headline + one
 * summary line + a compact "Top risk" chip + four quick actions. The large
 * urgency ring was intentionally removed — the priority score now lives only on
 * the Radar row and the AI rail to avoid repeating the same number everywhere.
 */
export function MorningBrief({
  brief,
  onAction,
}: {
  brief: MorningBriefData;
  onAction: (action: BriefAction) => void;
}) {
  return (
    <section className="relative isolate rounded-[var(--radius)] border border-line-strong bg-panel p-[18px] shadow-glow">
      {/* Decorative gradient wash on its own layer so it can never affect the
          content box height (avoids a backdrop-blur + layered-gradient paint bug
          that collapsed the card). */}
      <span
        className="pointer-events-none absolute inset-0 -z-10 rounded-[var(--radius)] bg-[linear-gradient(120deg,var(--accent-soft),transparent_60%)]"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute bottom-0 left-0 top-0 -z-10 w-[3px] rounded-l-[var(--radius)] bg-gradient-to-b from-accent to-accent-2 opacity-80"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-panel-2 px-[10px] py-[4px] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent">
              <span className="h-[6px] w-[6px] rounded-full bg-green shadow-[0_0_0_3px_var(--green-soft)]" />
              Live morning brief
            </span>
            <span className="inline-flex items-center gap-[5px] rounded-full bg-red-soft px-[9px] py-[3px] font-mono text-[11px] font-semibold text-red">
              <Icon name="trend" className="h-[12px] w-[12px]" />
              Top risk: {brief.topUrgencyScore}
            </span>
          </div>

          <h2 className="m-0 mt-[10px] font-display text-[19px] font-medium leading-tight tracking-tight sm:text-[21px]">
            {brief.headline}
          </h2>
          <p className="mt-[5px] text-[13px] leading-snug text-ink-soft">{brief.summaryLine}</p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-[8px] lg:flex-none lg:justify-end">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(action.id)}
              className={
                action.primary
                  ? 'inline-flex items-center gap-[6px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[13px] py-[8px] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.3)] transition hover:brightness-110'
                  : 'inline-flex items-center gap-[6px] rounded-[11px] border border-line-strong bg-panel-solid px-[13px] py-[8px] text-[12.5px] font-semibold text-ink transition hover:-translate-y-[2px] hover:border-accent hover:text-accent'
              }
            >
              <Icon name={action.icon} className="h-[14px] w-[14px]" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
