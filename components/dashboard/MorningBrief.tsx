'use client';

import { useState } from 'react';
import type { MorningBrief as MorningBriefData } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TypeIn } from './TypeIn';

export type BriefAction = 'focus' | 'drafts';

/** Live queue counts, computed by the dashboard from the CURRENT items at
 *  render time (declutter PR 2): numbers never come from cached AI text, so
 *  they stay correct through optimistic actions and mid-day changes. */
export type BriefStats = { open: number; overdue: number; waiting: number };

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
  stats,
  onStartFocusHover,
  startHereRef,
}: {
  brief: MorningBriefData;
  onAction: (action: BriefAction) => void;
  /** True while the AI is writing today's brief (first load of the morning). */
  generating?: boolean;
  /** Title of the AI's "start here" item (resolved by the dashboard). */
  focusTitle?: string;
  /** Jump into the suggested first item (selects it / starts Focus Mode). */
  onStartFocus?: () => void;
  /** Live counts from the current items — always true, never cached AI text. */
  stats?: BriefStats;
  /** Hovering "Start here" replays the glow thread to the focus card. */
  onStartFocusHover?: () => void;
  /** Exposes the "Start here" row element (the glow thread's anchor). */
  startHereRef?: (el: HTMLElement | null) => void;
}) {
  // Phone collapse (Vesta Mobile pass, 2026-06-12): on < sm the brief shows
  // headline + live numbers + Start here as a compact strip; the AI summary
  // and quick-action buttons reveal on tap. Desktop always shows everything.
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="relative isolate z-[1] rounded-[var(--radius)] border border-line-strong bg-panel p-[14px] shadow-glow sm:p-[18px]">
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
              {/* (The 3-bar waveform was trimmed in the 2026-06-12 animation
                  budget pass — the pulsing dot + headline sheen carry "live"
                  without three more pulsing elements in one card.) */}
            </span>
          </div>

          {/* TypeIn: the words write themselves in the moment the AI brief
              replaces the deterministic one (first render stays instant). */}
          <h2 className="vesta-headline-sheen m-0 mt-[10px] font-display text-[17px] font-medium leading-tight tracking-tight sm:text-[21px]">
            <TypeIn text={brief.headline} />
          </h2>
          {/* The AI summary is phone-collapsed (tap "Full brief" to reveal). */}
          <p
            className={[
              'mt-[5px] text-[13px] leading-snug text-ink-soft',
              expanded ? '' : 'hidden sm:block',
            ].join(' ')}
          >
            <TypeIn text={brief.summaryLine} />
          </p>

          {/* LIVE numbers — computed from the items on screen right now, never
              taken from the (cached) AI narrative, so they cannot lie. */}
          {stats && stats.open > 0 && (
            <p className="mt-[7px] flex flex-wrap items-center gap-x-[12px] gap-y-[2px] font-mono text-[11px] font-semibold">
              <span className="text-muted">{stats.open} open</span>
              {stats.overdue > 0 && (
                <span className="inline-flex items-center gap-[4px] text-red">
                  <Icon name="clock" className="h-[11px] w-[11px]" />
                  {stats.overdue} overdue
                </span>
              )}
              {stats.waiting > 0 && (
                <span className="text-muted">{stats.waiting} waiting on you</span>
              )}
            </p>
          )}

          {/* While the once-a-day AI brief is being written (first load of the
              morning) the deterministic brief stays visible — this is only a
              small honest status line, never a blank card. */}
          {generating && (
            <p className="mt-[6px] flex items-center gap-[6px] text-[12px] font-medium text-accent">
              <Icon name="sparkle" className="h-[13px] w-[13px] animate-vesta-pulse" />
              Vesta is writing today&rsquo;s brief…
            </p>
          )}

          {/* The AI's "start here" pick — one click jumps to that item; hover
              draws the glow thread pointing at its card on the radar. */}
          {!generating && brief.focusItemId && focusTitle && onStartFocus && (
            <button
              type="button"
              ref={startHereRef}
              onClick={onStartFocus}
              onMouseEnter={onStartFocusHover}
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

          {/* Phone-only expand toggle — reveals the AI summary + the quick
              actions (the brief is a compact strip by default on phones). */}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="mt-[8px] flex w-full items-center justify-center gap-[5px] rounded-[10px] border border-line bg-panel-2 py-[6px] text-[11.5px] font-semibold text-muted transition active:scale-[0.99] sm:hidden"
          >
            {expanded ? 'Less' : 'Full brief & actions'}
            <Icon
              name="chevronRight"
              className={`h-[12px] w-[12px] transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`}
            />
          </button>
        </div>

        {/* Quick actions — equal-width thumb targets on phones (taller tap
            area), compact pills from sm up. Phone-collapsed with the brief. */}
        <div
          className={[
            'flex-wrap gap-[8px] lg:flex-none lg:justify-end',
            expanded ? 'flex' : 'hidden sm:flex',
          ].join(' ')}
        >
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(action.id)}
              className={[
                'inline-flex flex-1 items-center justify-center gap-[6px] rounded-[11px] px-[13px] py-[10px] text-[12.5px] font-semibold transition sm:flex-none sm:py-[8px]',
                action.primary
                  ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_8px_20px_rgba(47,125,235,0.3)] hover:brightness-110'
                  : 'border border-line-strong bg-panel-solid text-ink hover:-translate-y-[2px] hover:border-accent hover:text-accent',
              ].join(' ')}
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
