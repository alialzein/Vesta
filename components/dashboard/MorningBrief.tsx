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
    <section className="relative isolate z-[1] rounded-[var(--radius)] border border-line-strong bg-panel p-[18px] shadow-glow">
      {/* Live AI signal accents (Phase 0.5, Section B).
          IMPORTANT: the decorative layers live in their OWN clipped, content-free
          wrapper — NOT via `overflow-hidden` on the card itself. Putting
          `overflow-hidden` + layered background-image gradients on the
          content/flex element triggers a Chromium paint bug that collapses the
          card to a sliver (see docs/archive/design/visual-direction-v2.md). This wrapper
          clips every effect (incl. the left signal bar) to the rounded corner
          while the content box stays untouched. */}
      <span
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[var(--radius)]"
        aria-hidden="true"
      >
        {/* Soft top-left corner glow. */}
        <span className="absolute inset-0 bg-[radial-gradient(420px_180px_at_0%_0%,var(--accent-soft),transparent_70%)]" />
        {/* Very low-opacity drifting shimmer — the "AI signal" layer. */}
        <span className="animate-vesta-shimmer absolute inset-y-0 -left-1/4 w-1/2 bg-[linear-gradient(100deg,transparent,var(--accent-soft),transparent)] opacity-50" />
        {/* Left signal bar — clipped to the rounded corner by this wrapper. */}
        <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent to-accent-2" />
      </span>

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[10px]">
            <span className="inline-flex items-center gap-[7px] rounded-full bg-panel-2 px-[10px] py-[4px] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent">
              {/* Pulsing live dot with an expanding ripple ring. */}
              <span className="relative grid h-[7px] w-[7px] place-items-center">
                <span
                  className="animate-vesta-ripple absolute h-[7px] w-[7px] rounded-full bg-green"
                  aria-hidden="true"
                />
                <span className="animate-vesta-pulse relative h-[6px] w-[6px] rounded-full bg-green shadow-[0_0_0_2px_var(--green-soft)]" />
              </span>
              Live morning brief
              {/* Tiny signal waveform (opacity comes from the pulse keyframe, so
                  the bars use the solid accent token — no /opacity modifier,
                  which Tailwind cannot apply to the hex CSS var). */}
              <span className="ml-[1px] flex items-end gap-[2px]" aria-hidden="true">
                <span className="animate-vesta-pulse h-[6px] w-[2px] rounded-full bg-accent [animation-delay:-0.2s]" />
                <span className="animate-vesta-pulse h-[9px] w-[2px] rounded-full bg-accent [animation-delay:-0.9s]" />
                <span className="animate-vesta-pulse h-[5px] w-[2px] rounded-full bg-accent [animation-delay:-1.5s]" />
              </span>
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
