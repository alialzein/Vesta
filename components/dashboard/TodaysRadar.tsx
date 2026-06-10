'use client';

import { useMemo, useState } from 'react';
import type { WorkItem, WorkItemCategory } from '@/lib/types';
import { filterWorkItems } from '@/lib/priority';
import { WorkItemRow } from './WorkItemRow';
import { EmptyRadarState } from '@/components/ui/StateView';

export type RadarFilter = WorkItemCategory | 'all';

const FILTERS: { id: RadarFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'waiting_on_them', label: 'Waiting on them' },
  { id: 'decision', label: 'Decisions' },
  { id: 'waiting', label: 'Blockers' },
  { id: 'followup', label: 'Follow-ups' },
  { id: 'promise', label: 'Promises' },
  { id: 'delegate', label: 'Can delegate' },
  { id: 'drafts', label: 'Drafts' },
];

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
};

export function TodaysRadar({
  items,
  selectedId,
  onSelect,
  filter: controlledFilter,
  onFilterChange,
  leavingIds,
}: TodaysRadarProps) {
  const [internalFilter, setInternalFilter] = useState<RadarFilter>('all');
  const filter = controlledFilter ?? internalFilter;

  function setFilter(next: RadarFilter) {
    if (onFilterChange) onFilterChange(next);
    if (controlledFilter === undefined) setInternalFilter(next);
  }

  const visible = useMemo(() => filterWorkItems(items, filter), [items, filter]);

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
      <div key={filter} className="flex flex-col gap-[7px]">
        {visible.length > 0 ? (
          visible.map((item, i) => (
            <WorkItemRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
              index={i}
              leaving={leavingIds?.has(item.id)}
            />
          ))
        ) : (
          <EmptyRadarState />
        )}
      </div>
    </section>
  );
}
