'use client';

import { useMemo, useState } from 'react';
import type { WorkItem, WorkItemCategory } from '@/lib/types';
import { filterWorkItems } from '@/lib/priority';
import { WorkItemRow, type QuickAction } from './WorkItemRow';
import { Icon } from '@/components/ui/Icon';
import { EmptyRadarState } from '@/components/ui/StateView';

export type RadarFilter = WorkItemCategory | 'overdue' | 'all';

/** Every slice the radar can show. Chips render ONLY when they have items
 *  (declutter pass: ten permanent chips for five items read as noise) — the
 *  counts that used to live in the KPI strip now sit inside the chips, so one
 *  row answers both "how many?" and "show me". One vocabulary: the `waiting`
 *  slice is "Waiting on you" here, in the sidebar, and in the rail. */
const FILTERS: { id: RadarFilter; label: string; tone?: 'red' }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue', tone: 'red' },
  { id: 'waiting', label: 'Waiting on you' },
  { id: 'task', label: 'Tasks' },
  { id: 'waiting_on_them', label: 'Waiting on them' },
  { id: 'decision', label: 'Decisions' },
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

  // Per-slice counts shown inside the chips (the old KPI strip's numbers,
  // now in the control that filters). Empty slices keep no chip — except the
  // active one, so a filter driven from outside (sidebar, brief) stays visible
  // and clearable even when its slice just emptied.
  const chips = useMemo(
    () =>
      FILTERS.map((f) => ({ ...f, count: filterWorkItems(items, f.id).length })).filter(
        (f) => f.id === 'all' || f.count > 0 || f.id === filter,
      ),
    [items, filter],
  );

  return (
    <section className="relative z-[1] rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow">
      <div className="mb-[16px] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-baseline gap-[10px]">
          <h2 className="m-0 font-display text-[19px] font-medium tracking-tight">
            Today&apos;s Radar
          </h2>
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
          {chips.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              onClick={() => setFilter(f.id)}
              aria-selected={filter === f.id}
              className={[
                'inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-semibold transition',
                filter === f.id
                  ? 'border-accent bg-accent text-white shadow-[0_6px_16px_rgba(47,125,235,0.3)]'
                  : 'border-line bg-panel-2 text-ink-soft hover:border-line-strong hover:text-ink',
              ].join(' ')}
            >
              {f.label}
              {/* The count lives in the chip (was the KPI strip). Overdue keeps
                  its red urgency when unselected. */}
              <span
                className={[
                  'rounded-full px-[6px] py-[1px] font-mono text-[10.5px] font-bold leading-[14px]',
                  filter === f.id
                    ? 'bg-white/20 text-white'
                    : f.tone === 'red'
                      ? 'bg-red-soft text-red'
                      : 'bg-panel text-muted',
                ].join(' ')}
              >
                {f.count}
              </span>
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
