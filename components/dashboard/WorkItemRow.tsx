'use client';

import { useEffect, useRef, useState } from 'react';
import type { WorkItem, WorkItemSource } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { avatarHue, initialsOf } from '@/lib/avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';

/** Animate the score badge between values when an item's priority CHANGES
 *  (re-analysis / a refresh re-ranked it) — a short count-up beat that says
 *  "the AI just re-scored this" (declutter PR 3). First render is instant;
 *  reduced motion snaps to the new value. */
function useCountUp(value: number): number {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    const t0 = performance.now();
    const dur = 500;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

// Soft, borderless priority tint — reads as an integrated anchor, not a box.
const bandClasses: Record<ReturnType<typeof priorityBand>, string> = {
  red: 'bg-red-soft text-red',
  amber: 'bg-amber-soft text-amber',
  green: 'bg-green-soft text-green',
};

const SOURCE_LABEL: Record<WorkItemSource, string> = {
  outlook: 'Outlook',
  teams: 'Teams',
  manual: 'Manual',
  ai_commitment: 'AI commitment',
  calendar: 'Calendar',
};

export type QuickAction = 'done' | 'dismiss' | 'snooze';

type WorkItemRowProps = {
  item: WorkItem;
  selected: boolean;
  onSelect: (item: WorkItem) => void;
  /** Position in the visible list — drives the staggered entry animation. */
  index?: number;
  /** Resolve in flight (done/dismiss/snooze/sent): play the exit transition
   *  before the row leaves the list, instead of vanishing with zero feedback. */
  leaving?: boolean;
  /** Hover quick-actions (done/dismiss/snooze) — one click, no rail round-trip. */
  onQuickAction?: (item: WorkItem, action: QuickAction) => void;
  /** Filter the radar to this card's sender (click the avatar/name). */
  onSelectSender?: (item: WorkItem) => void;
  /** Disables the quick-action buttons while an action is in flight. */
  busy?: boolean;
};

const QUICK_ACTIONS: { id: QuickAction; icon: IconName; label: string }[] = [
  { id: 'done', icon: 'check', label: 'Mark done' },
  { id: 'dismiss', icon: 'close', label: 'Dismiss' },
  { id: 'snooze', icon: 'snooze', label: 'Snooze until tomorrow 9 AM' },
];

export function WorkItemRow({
  item,
  selected,
  onSelect,
  index = 0,
  leaving = false,
  onQuickAction,
  onSelectSender,
  busy = false,
}: WorkItemRowProps) {
  const band = priorityBand(item.priorityScore);
  const displayScore = useCountUp(item.priorityScore);

  return (
    // Wrapper (not the row <button>) hosts the hover group + exit transition so
    // the quick-action buttons are siblings of the row button, never nested
    // inside it (nested interactive elements are invalid HTML).
    // data-work-item-id anchors the FLIP re-sort + the brief's glow thread.
    <div
      data-work-item-id={item.id}
      className={[
        'group/row relative transition-[transform,opacity] duration-200',
        leaving ? 'pointer-events-none translate-x-[16px] opacity-0' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-pressed={selected}
        // Staggered rise on mount (capped so long lists don't crawl); disabled
        // under prefers-reduced-motion via the global .animate-rise rule.
        style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
        className={[
          // Phone (< sm): app-style dense list row — smaller badge, tighter
          // padding, no summary/chips (they live in the tap-to-open sheet), so
          // 5-6 items fit one phone screen (Vesta Mobile pass, 2026-06-12).
          'animate-rise relative grid w-full grid-cols-[34px_1fr] items-start gap-[10px] overflow-hidden rounded-[14px] border p-[8px_10px] text-left transition-[transform,background-color,border-color,box-shadow] duration-200 sm:grid-cols-[40px_1fr_116px] sm:items-center sm:gap-[12px] sm:p-[10px_12px]',
          selected
            ? // Dedicated selected fill — one step deeper than hover's
              // accent-soft, so active vs hovering is unmistakable (they were
              // the same color in light mode; 2026-06-12 color pass).
              'border-line-strong bg-card-selected shadow-[0_10px_26px_rgba(47,125,235,0.14)]'
            : // Quiet-but-visible card (2026-06-10 radar diagnostic): a permanent
              // border + a fill stronger than the panel in BOTH themes, so an
              // unselected ticket still reads as a ticket. Hover/selected stay
              // the stronger states.
              'border-line bg-card hover:translate-x-[2px] hover:border-line-strong hover:bg-accent-soft',
        ].join(' ')}
      >
        {/* Selected signal: a soft left glow that respects the rounded corner
            (clipped by the row's overflow-hidden) instead of a hard bar. */}
        {selected && (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent to-accent-2"
            aria-hidden="true"
          />
        )}

        {/* Priority badge — cleaner: smaller footprint, soft fill, thin border.
            The number counts up/down when the AI re-scores the item. */}
        <span
          className={`grid h-[30px] w-[34px] flex-none place-items-center rounded-[10px] font-mono text-[12.5px] font-bold sm:h-[38px] sm:w-[40px] sm:rounded-[11px] sm:text-[14px] ${bandClasses[band]}`}
        >
          {displayScore}
        </span>

        {/* Body */}
        <span className="min-w-0">
          {/* Sender identity + source + last-email time — quiet, low-contrast. */}
          <span className="flex flex-wrap items-center gap-x-[7px] gap-y-1 text-[11px] text-muted">
            {item.unread && (
              <span className="inline-flex items-center gap-[4px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent">
                <span
                  className="h-[7px] w-[7px] flex-none rounded-full bg-accent"
                  aria-hidden="true"
                />
                Unread
              </span>
            )}
            {item.person && (
              <span
                className={[
                  'inline-flex min-w-0 items-center gap-[6px]',
                  // Clicking the sender filters the radar to them (handled via
                  // stopPropagation — a real <button> can't nest in the row button).
                  onSelectSender ? 'cursor-pointer hover:underline' : '',
                ].join(' ')}
                title={onSelectSender ? `Show everything from ${item.person}` : undefined}
                onClick={
                  onSelectSender
                    ? (e) => {
                        e.stopPropagation();
                        onSelectSender(item);
                      }
                    : undefined
                }
              >
                {/* Identity anchor: stable-hue initials avatar (same language as
                    the admin Users table). */}
                <span
                  aria-hidden="true"
                  className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[8.5px] font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${avatarHue(item.personEmail ?? item.person)} 65% 45%), hsl(${(avatarHue(item.personEmail ?? item.person) + 40) % 360} 65% 35%))`,
                  }}
                >
                  {initialsOf(item.person, item.personEmail)}
                </span>
                <span className="truncate font-medium text-ink-soft">{item.person}</span>
              </span>
            )}
            {item.person && (
              <span aria-hidden="true" className="hidden text-line-strong sm:inline">
                ·
              </span>
            )}
            {/* Micro-text floor (2026-06-12 color pass): nothing below 10.5px;
                the timestamp steps up to 11px — tired-eye readability. The
                source label is desktop-only (phones show sender + time). */}
            <span className="hidden font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted sm:inline">
              {SOURCE_LABEL[item.source]}
            </span>
            {item.lastActivityAt && (
              <LocalTime
                iso={item.lastActivityAt}
                className="ml-auto flex-none font-mono text-[11px] text-muted"
              />
            )}
          </span>

          <h3 className="m-0 mt-[3px] text-[14px] font-semibold leading-tight tracking-tight">
            {item.title}
          </h3>
          {/* One scannable line per card (declutter pass, 2026-06-12): the full
              summary + suggested action live in the rail when the row is
              selected — the radar is for scanning, the rail is for reading.
              On phones the summary is hidden entirely (it lives in the tap
              sheet) — the row is sender + title + due, like a mail app. */}
          <p
            className={[
              'mt-[2px] hidden text-[12px] leading-snug text-muted',
              selected ? 'sm:line-clamp-2' : 'sm:line-clamp-1',
            ].join(' ')}
          >
            {item.summary}
          </p>

          <span className="mt-[7px] hidden flex-wrap items-center gap-[6px] sm:flex">
            {item.chips.map((chip) => (
              <Chip key={chip.label} {...chip} />
            ))}
          </span>
        </span>

        {/* Status / due column — compact, right aligned, unboxed. Overdue is a
            real state: red label instead of a neutral "Due Jun 9". */}
        <span
          className={[
            'col-start-2 mt-1 text-left font-mono text-[12px] font-semibold sm:col-start-3 sm:mt-0 sm:text-right',
            item.overdue ? 'text-red' : 'text-ink-soft',
          ].join(' ')}
        >
          {item.overdue ? (
            <span className="inline-flex items-center gap-[4px]">
              <Icon name="clock" className="h-[12px] w-[12px]" />
              {item.dueLabel}
            </span>
          ) : (
            item.dueLabel
          )}
          {item.dueDetail && (
            <small
              className={[
                'mt-[2px] block font-medium',
                // No /opacity modifier — the color tokens are raw CSS vars
                // Tailwind can't alpha-blend (see MorningBrief waveform note).
                item.overdue ? 'text-red opacity-80' : 'text-muted',
              ].join(' ')}
            >
              {item.dueDetail}
            </small>
          )}
        </span>
      </button>

      {/* Hover quick-actions — routine triage in one click, no select-then-rail
          two-step. Desktop only (hover); the rail stays the full-control path.
          Sits over the due column, on its own surface so it reads as a control. */}
      {onQuickAction && (
        <span className="pointer-events-none absolute right-[10px] top-1/2 z-[2] hidden -translate-y-1/2 gap-[4px] rounded-[11px] border border-line bg-panel-solid p-[3px] opacity-0 shadow-soft transition-opacity duration-150 focus-within:pointer-events-auto focus-within:opacity-100 group-hover/row:pointer-events-auto group-hover/row:opacity-100 sm:flex">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              aria-label={`${a.label}: ${item.title}`}
              title={a.label}
              onClick={() => onQuickAction(item, a.id)}
              className="grid h-7 w-7 place-items-center rounded-[8px] text-muted transition hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name={a.icon} className="h-[14px] w-[14px]" />
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
