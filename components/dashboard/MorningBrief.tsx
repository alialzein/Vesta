'use client';

import type { MorningBrief as MorningBriefData } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';

export type BriefAction = 'focus' | 'drafts';

// Delegate intentionally lives only in Today's Radar rows and the AI rail, so
// it is not duplicated here (Phase 0.4). Meeting Prep was removed in the
// 2026-06-12 declutter pass: it opened a demo drawer — a dead button in the
// hero card. It returns when real meeting prep ships on the Phase C calendar.
const ACTIONS: { id: BriefAction; label: string; icon: IconName; primary?: boolean }[] = [
  { id: 'focus', label: 'Clear My Day', icon: 'sparkle', primary: true },
  { id: 'drafts', label: 'Draft Replies', icon: 'drafts' },
];

/**
 * Compact Morning Brief (Phase 0.3). A short hero card: badge + headline + one
 * summary line + quick actions. Declutter pass (2026-06-12): no "Top priority"
 * score chip — the score lives on the radar card (and could disagree with the
 * AI's "start here" pick, which is not always the top score). The brief is the
 * single LIVE surface on the dashboard, so its headline carries a slow aurora
 * sheen — the one place that visibly breathes.
 */
export function MorningBrief({
  brief,
  onAction,
  generating = false,
  focusTitle,
  onStartFocus,
}: {
  brief: MorningBriefData;
  onAction: (action: BriefAction) => void;
  /** True while the AI is writing today's brief (first load of the morning). */
  generating?: boolean;
  /** Title of the AI's "start here" item (resolved by the dashboard). */
  focusTitle?: string;
  /** Jump into the suggested first item (selects it / starts Focus Mode). */
  onStartFocus?: () => void;
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
          </div>

          <h2 className="vesta-headline-sheen m-0 mt-[10px] font-display text-[19px] font-medium leading-tight tracking-tight sm:text-[21px]">
            {brief.headline}
          </h2>
          <p className="mt-[5px] text-[13px] leading-snug text-ink-soft">{brief.summaryLine}</p>

          {/* While the once-a-day AI brief is being written (first load of the
              morning) the deterministic brief stays visible — this is only a
              small honest status line, never a blank card. */}
          {generating && (
            <p className="mt-[6px] flex items-center gap-[6px] text-[12px] font-medium text-accent">
              <Icon name="sparkle" className="h-[13px] w-[13px] animate-vesta-pulse" />
              Vesta is writing today&rsquo;s brief…
            </p>
          )}

          {/* The AI's "start here" pick — one click jumps to that item. */}
          {!generating && brief.focusItemId && focusTitle && onStartFocus && (
            <button
              type="button"
              onClick={onStartFocus}
              className="group mt-[10px] flex w-full items-start gap-[9px] rounded-[12px] border border-line bg-panel-2 p-[10px] text-left transition hover:border-accent"
            >
              <span className="mt-[1px] grid h-6 w-6 flex-none place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name="arrow" className="h-[13px] w-[13px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-ink">
                  Start here: <span className="text-accent">{focusTitle}</span>
                </span>
                {brief.focusReason && (
                  <span className="mt-[2px] block text-[12px] leading-snug text-muted">
                    {brief.focusReason}
                  </span>
                )}
              </span>
            </button>
          )}
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
