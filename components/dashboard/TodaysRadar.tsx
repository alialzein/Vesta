'use client';

import { useMemo, useState } from 'react';
import type { WorkItem, WorkItemCategory } from '@/lib/types';
import { filterWorkItems } from '@/lib/priority';
import { WorkItemRow } from './WorkItemRow';

type RadarFilter = WorkItemCategory | 'all';

const FILTERS: { id: RadarFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'waiting', label: 'Waiting on me' },
  { id: 'followup', label: 'Follow-ups' },
  { id: 'delegate', label: 'Can delegate' },
];

type TodaysRadarProps = {
  items: WorkItem[];
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
};

export function TodaysRadar({ items, selectedId, onSelect }: TodaysRadarProps) {
  const [filter, setFilter] = useState<RadarFilter>('all');

  const visible = useMemo(() => filterWorkItems(items, filter), [items, filter]);

  return (
    <section className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow backdrop-blur-[16px]">
      <div className="mb-[14px] flex items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[19px] font-medium tracking-tight">
          Today&apos;s Radar
        </h2>
        <div className="flex flex-wrap gap-[7px]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={[
                'rounded-[10px] border px-[13px] py-[7px] text-[12.5px] font-semibold transition',
                filter === f.id
                  ? 'border-ink bg-ink text-bg'
                  : 'border-line bg-transparent text-ink-soft hover:border-line-strong',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[11px]">
        {visible.length > 0 ? (
          visible.map((item) => (
            <WorkItemRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
            />
          ))
        ) : (
          <p className="rounded-[15px] border border-line bg-panel-2 p-5 text-center text-sm text-muted">
            No items in this view. Your critical queue is clear.
          </p>
        )}
      </div>
    </section>
  );
}
