'use client';

import { useMemo, useState } from 'react';
import type { WorkItem, WorkItemCategory } from '@/lib/types';
import { filterWorkItems } from '@/lib/priority';
import { WorkItemRow, type QuickAction } from './WorkItemRow';
import { Icon } from '@/components/ui/Icon';
import { EmptyRadarState } from '@/components/ui/StateView';

export type RadarFilter = WorkItemCategory | 'overdue' | 'all';

const FILTERS: { id: RadarFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'task', label: 'Tasks' },
  { id: 'waiting_on_them', label: 'Waiting on them' },
  { id: 'decision', label: 'Decisions' },
  { id: 'waiting', label: 'Blockers' },
  { id: 'followup', label: 'Follow-ups' },
  { id: 'promise', label: 'Promises' },
  { id: 'delegate', label: 'Can delegate' },
  { id: 'drafts', label: 'Drafts' },
];

/** Stable identity key for "everything from this person" filtering. */
function senderKeyOf(item: WorkItem): string | null {
  return item.personEmail ?? item.person ?? null;
}

type TodaysRadarProps = {
  items: WorkItem[];
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
  /**
   * Optional controlled filter. When provided, the parent owns the active
   * filter (used so the "Delegate Work" command can jump to "Can delegate").
   * When omitted, the component manages its own filter state.
   */
  filter?: RadarFilter;
  onFilterChange?: (filter: RadarFilter) => void;
  /** Items mid-resolve: their rows play the exit transition before leaving. */
  leavingIds?: ReadonlySet<string>;
  /** Hover quick-actions on cards (done/dismiss/snooze) — optional. */
  onQuickAction?: (item: WorkItem, action: QuickAction) => void;
  /** Disables quick-action buttons while an action runs. */
  busy?: boolean;
};

export function TodaysRadar({
  items,
  selectedId,
  onSelect,
  filter: controlledFilter,
  onFilterChange,
  leavingIds,
  onQuickAction,
  busy,
}: TodaysRadarProps) {
  const [internalFilter, setInternalFilter] = useState<RadarFilter>('all');
  // "Everything from this person" — set by clicking a card's sender, cleared
  // via the chip. Stacks with the category filter.
  const [sender, setSender] = useState<{ key: string; label: string } | null>(null);
  const filter = controlledFilter ?? internalFilter;

  function setFilter(next: RadarFilter) {
    if (onFilterChange) onFilterChange(next);
    if (controlledFilter === undefined) setInternalFilter(next);
  }

  const visible = useMemo(() => {
    const byCategory = filterWorkItems(items, filter);
    return sender ? byCategory.filter((i) => senderKeyOf(i) === sender.key) : byCategory;
  }, [items, filter, sender]);

  return (
    <section className="relative z-[1] rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow">
      <div className="mb-[16px] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-baseline gap-[10px]">
          <h2 className="m-0 font-display text-[19px] font-medium tracking-tight">
            Today&apos;s Radar
          </h2>
          <span className="rounded-full bg-panel-2 px-[9px] py-[2px] font-mono text-[11px] font-semibold text-muted">
            {visible.length}
          </span>
          {sender && (
            <button
              type="button"
              onClick={() => setSender(null)}
              title="Clear the sender filter"
              className="inline-flex items-center gap-[5px] rounded-full bg-accent-soft px-[9px] py-[3px] text-[11.5px] font-semibold text-accent transition hover:brightness-110"
            >
              From: {sender.label}
              <Icon name="close" className="h-[11px] w-[11px]" />
            </button>
          )}
        </div>

        <div
          className="v-scroll -mx-1 flex gap-[7px] overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="Filter work items"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              onClick={() => setFilter(f.id)}
              aria-selected={filter === f.id}
              className={[
                'whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-semibold transition',
                filter === f.id
                  ? 'border-accent bg-accent text-white shadow-[0_6px_16px_rgba(47,125,235,0.3)]'
                  : 'border-line bg-panel-2 text-ink-soft hover:border-line-strong hover:text-ink',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keyed by filter so switching tabs remounts the list and replays the
          staggered rise — a soft beat of feedback instead of an instant jump. */}
      <div key={`${filter}:${sender?.key ?? ''}`} className="flex flex-col gap-[7px]">
        {visible.length > 0 ? (
          visible.map((item, i) => (
            <WorkItemRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
              index={i}
              leaving={leavingIds?.has(item.id)}
              onQuickAction={onQuickAction}
              busy={busy}
              onSelectSender={(it) => {
                const key = senderKeyOf(it);
                if (key) setSender({ key, label: it.person ?? key });
              }}
            />
          ))
        ) : (
          <EmptyRadarState />
        )}
      </div>
    </section>
  );
}
