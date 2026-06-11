'use client';

import { useEffect, useMemo, useState } from 'react';
import type { WorkItem } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { avatarHue, initialsOf } from '@/lib/avatar';
import { Icon } from '@/components/ui/Icon';

/**
 * Phase 11 — Focus Mode ("Clear My Day"). A full-screen, one-item-at-a-time
 * pass over the open queue: the manager sees ONE thing, acts (Done / Snooze /
 * Draft reply) or skips, and the progress bar fills until the day is cleared.
 *
 * The parent (DashboardClient) owns the data: actions reuse the exact same
 * optimistic handlers as the radar/rail, and this component simply walks the
 * queue as items disappear. Closing at any point loses nothing.
 */

const bandClass: Record<'red' | 'amber' | 'green', string> = {
  red: 'bg-red-soft text-red',
  amber: 'bg-amber-soft text-amber',
  green: 'bg-green-soft text-green',
};

export function FocusMode({
  open,
  onClose,
  items,
  initialItemId,
  onDone,
  onSnooze,
  onDraft,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Live open items — already optimistically updated by the parent. */
  items: WorkItem[];
  /** The brief's "start here" pick — goes first in the queue. */
  initialItemId?: string | null;
  onDone: (item: WorkItem) => void;
  /** Snooze until tomorrow 9 AM (same preset as the card quick-action). */
  onSnooze: (item: WorkItem) => void;
  /** Open the draft composer on this item. */
  onDraft: (item: WorkItem) => void;
  busy?: boolean;
}) {
  // The plan is frozen when the session opens (highest priority first, the
  // suggested focus item up front); resolved items simply leave the queue.
  const [queue, setQueue] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const ordered = [...items]
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((i) => i.id);
    if (initialItemId && ordered.includes(initialItemId)) {
      ordered.splice(ordered.indexOf(initialItemId), 1);
      ordered.unshift(initialItemId);
    }
    setQueue(ordered);
    setSkipped(new Set());
    // The plan is intentionally a snapshot of the moment Focus Mode opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const planned = queue.filter((id) => byId.has(id));
  const remaining = planned.filter((id) => !skipped.has(id));
  const current = remaining.length > 0 ? byId.get(remaining[0]) : undefined;
  const total = queue.length;
  const clearedOrSkipped = total - remaining.length;
  const progress = total > 0 ? Math.round((clearedOrSkipped / total) * 100) : 0;

  if (!open) return null;

  const band = current ? priorityBand(current.priorityScore) : 'green';
  const hue = current ? avatarHue(current.personEmail ?? current.person ?? current.title) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus Mode — Clear My Day"
      className="fixed inset-0 z-[95] flex flex-col bg-bg"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-br from-accent to-accent-2 text-white">
            <Icon name="sparkle" className="h-[17px] w-[17px]" />
          </span>
          <div>
            <h2 className="m-0 font-display text-[17px] font-semibold tracking-tight">
              Focus Mode
            </h2>
            <p className="m-0 text-[12px] text-muted">
              One thing at a time until your day is clear.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit Focus Mode"
          className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="close" className="h-[16px] w-[16px]" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[12px] font-semibold text-ink-soft">
            {clearedOrSkipped} of {total} handled
          </span>
          <span className="font-mono text-[12px] text-muted">{progress}%</span>
        </div>
        <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-panel-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="v-scroll flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-6 sm:px-8">
        {current ? (
          <div
            key={current.id}
            className="animate-rise w-full max-w-[640px] rounded-[var(--radius)] border border-line-strong bg-panel p-6 shadow-glow sm:p-8"
          >
            {/* Who + what */}
            <div className="flex items-center gap-3">
              {current.person && (
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 flex-none place-items-center rounded-full text-[12px] font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 65% 45%), hsl(${(hue + 40) % 360} 65% 35%))`,
                  }}
                >
                  {initialsOf(current.person, current.personEmail)}
                </span>
              )}
              <div className="min-w-0">
                {current.person && (
                  <p className="m-0 text-[12.5px] font-semibold text-ink-soft">{current.person}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-[8px] py-[2px] font-mono text-[11px] font-bold ${bandClass[band]}`}
                  >
                    {current.priorityScore}
                  </span>
                  {current.overdue && (
                    <span className="rounded-full bg-red-soft px-[8px] py-[2px] text-[10.5px] font-semibold text-red">
                      Overdue{current.dueDetail ? ` — ${current.dueDetail}` : ''}
                    </span>
                  )}
                  {!current.overdue && current.dueLabel && (
                    <span className="rounded-full bg-panel-2 px-[8px] py-[2px] text-[10.5px] font-semibold text-muted">
                      {current.dueLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <h3 className="m-0 mt-4 font-display text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
              {current.title}
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{current.summary}</p>

            {/* The one next step */}
            <div className="mt-4 flex items-start gap-[9px] rounded-[12px] border border-line bg-panel-2 p-3">
              <span className="mt-[1px] grid h-6 w-6 flex-none place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name="arrow" className="h-[13px] w-[13px]" />
              </span>
              <p className="m-0 text-[13px] leading-snug text-ink">{current.nextBestAction}</p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onDone(current)}
                className="inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110 disabled:opacity-60"
              >
                <Icon name="check" className="h-[15px] w-[15px]" />
                Mark done
              </button>
              {current.canDraft && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDraft(current)}
                  className="inline-flex items-center gap-[7px] rounded-[11px] border border-line-strong bg-panel-solid px-4 py-[10px] text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  <Icon name="drafts" className="h-[15px] w-[15px]" />
                  {current.categories.includes('waiting_on_them') ? 'Draft follow-up' : 'Draft reply'}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onSnooze(current)}
                className="inline-flex items-center gap-[7px] rounded-[11px] border border-line-strong bg-panel-solid px-4 py-[10px] text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-60"
              >
                <Icon name="snooze" className="h-[15px] w-[15px]" />
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setSkipped((s) => new Set(s).add(current.id))}
                className="ml-auto inline-flex items-center gap-[6px] rounded-[11px] px-3 py-[10px] text-[13px] font-semibold text-muted transition hover:text-ink"
              >
                Skip
                <Icon name="chevronRight" className="h-[14px] w-[14px]" />
              </button>
            </div>
          </div>
        ) : (
          /* Day cleared (or everything skipped). */
          <div className="animate-rise w-full max-w-[520px] rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-soft text-green">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <h3 className="mt-4 font-display text-[22px] font-semibold tracking-tight">
              {planned.length === 0 ? 'Day cleared.' : 'Nothing left but skips.'}
            </h3>
            <p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-relaxed text-muted">
              {planned.length === 0
                ? 'Everything in the plan is handled. New items will land on the radar as mail syncs.'
                : `You skipped ${planned.length} item${planned.length === 1 ? '' : 's'} — go around again, or come back later. Nothing is lost.`}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {planned.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSkipped(new Set())}
                  className="inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white transition hover:brightness-110"
                >
                  <Icon name="refresh" className="h-[14px] w-[14px]" />
                  Go through skips
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-[7px] rounded-[11px] border border-line-strong bg-panel-solid px-4 py-[10px] text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent"
              >
                Back to the dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safety line */}
      <p className="m-0 flex items-center justify-center gap-2 border-t border-line px-5 py-3 text-[11.5px] text-muted">
        <Icon name="shield" className="h-[13px] w-[13px] flex-none text-accent" />
        Nothing is sent or deleted without you — Done and Snooze are always reversible by a reply.
      </p>
    </div>
  );
}
