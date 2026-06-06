import type { WorkItem, WorkItemSource } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';

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

type WorkItemRowProps = {
  item: WorkItem;
  selected: boolean;
  onSelect: (item: WorkItem) => void;
};

export function WorkItemRow({ item, selected, onSelect }: WorkItemRowProps) {
  const band = priorityBand(item.priorityScore);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-pressed={selected}
      className={[
        // One clean surface, not a stack of boxes (Phase 0.5, Section A): softer
        // background, low-contrast border, a touch more compact. Hover/selected
        // changes are subtle so the row never feels "boxed in".
        'group/row relative grid w-full grid-cols-[40px_1fr] items-start gap-[12px] overflow-hidden rounded-[14px] border p-[10px_12px] text-left transition-[transform,background-color,border-color,box-shadow] duration-200 sm:grid-cols-[40px_1fr_116px] sm:items-center',
        selected
          ? 'border-line-strong bg-accent-soft shadow-[0_10px_26px_rgba(47,125,235,0.14)]'
          : // Borderless by default (transparent keeps width stable, no layout
            // shift) so rows read as one surface; a faint border appears on hover.
            'border-transparent bg-panel-soft hover:translate-x-[2px] hover:border-line hover:bg-accent-soft',
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

      {/* Priority badge — cleaner: smaller footprint, soft fill, thin border. */}
      <span
        className={`grid h-[38px] w-[40px] flex-none place-items-center rounded-[11px] font-mono text-[14px] font-bold ${bandClasses[band]}`}
      >
        {item.priorityScore}
      </span>

      {/* Body */}
      <span className="min-w-0">
        {/* Source + person — quiet, low-contrast, no heavy box. */}
        <span className="flex flex-wrap items-center gap-x-[7px] gap-y-1 text-[11px] text-muted">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {SOURCE_LABEL[item.source]}
          </span>
          {item.person && (
            <>
              <span aria-hidden="true" className="text-line-strong">
                ·
              </span>
              <span className="font-medium text-ink-soft">{item.person}</span>
            </>
          )}
        </span>

        <h3 className="m-0 mt-[3px] text-[14px] font-semibold leading-tight tracking-tight">
          {item.title}
        </h3>
        <p className="mt-[2px] line-clamp-1 text-[12px] leading-snug text-muted">{item.summary}</p>

        <span className="mt-[7px] flex flex-wrap items-center gap-[6px]">
          {item.chips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
          {item.suggestedAction && (
            // Inline action pill — lighter than a button so it never competes
            // with the right rail's primary action.
            <span className="inline-flex items-center gap-[4px] rounded-full bg-accent-soft px-[8px] py-[2px] text-[11px] font-semibold text-accent">
              <Icon name="sparkle" className="h-[11px] w-[11px]" />
              {item.suggestedAction}
            </span>
          )}
        </span>
      </span>

      {/* Status / due column — compact, right aligned, unboxed. */}
      <span className="col-start-2 mt-1 text-left font-mono text-[12px] font-semibold text-ink-soft sm:col-start-3 sm:mt-0 sm:text-right">
        {item.dueLabel}
        {item.dueDetail && (
          <small className="mt-[2px] block font-medium text-muted">{item.dueDetail}</small>
        )}
      </span>
    </button>
  );
}
