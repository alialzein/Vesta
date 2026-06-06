import type { WorkItem, WorkItemSource } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';

const bandClasses: Record<ReturnType<typeof priorityBand>, string> = {
  red: 'bg-red-soft text-red shadow-[inset_0_0_0_1px_var(--red-soft)]',
  amber: 'bg-amber-soft text-amber shadow-[inset_0_0_0_1px_var(--amber-soft)]',
  green: 'bg-green-soft text-green shadow-[inset_0_0_0_1px_var(--green-soft)]',
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
        'relative grid w-full grid-cols-[46px_1fr] items-start gap-[13px] rounded-[15px] border p-[13px] text-left transition sm:grid-cols-[46px_1fr_124px] sm:items-center',
        selected
          ? 'border-accent bg-accent-soft shadow-[0_8px_24px_rgba(47,125,235,0.14)]'
          : 'border-line bg-panel-2 hover:translate-x-[3px] hover:border-line-strong hover:bg-accent-soft',
      ].join(' ')}
    >
      {selected && (
        <span
          className="absolute left-0 top-[12px] bottom-[12px] w-[3px] rounded-[3px] bg-gradient-to-b from-accent to-accent-2"
          aria-hidden="true"
        />
      )}

      {/* Priority badge */}
      <span
        className={`grid h-[44px] w-[44px] flex-none place-items-center rounded-[13px] font-mono text-[15px] font-bold ${bandClasses[band]}`}
      >
        {item.priorityScore}
      </span>

      {/* Body */}
      <span className="min-w-0">
        {/* Source + person */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center rounded-md bg-panel-solid px-[7px] py-[2px] font-mono text-[10px] font-semibold uppercase tracking-wide shadow-[inset_0_0_0_1px_var(--line)]">
            {SOURCE_LABEL[item.source]}
          </span>
          {item.person && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-ink-soft">{item.person}</span>
            </>
          )}
        </span>

        <h3 className="m-0 mt-[5px] text-[14.5px] font-semibold leading-tight tracking-tight">
          {item.title}
        </h3>
        <p className="mt-[3px] line-clamp-1 text-[12px] leading-snug text-muted">{item.summary}</p>

        <span className="mt-[8px] flex flex-wrap items-center gap-[6px]">
          {item.chips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
          {item.suggestedAction && (
            <span className="inline-flex items-center gap-[5px] rounded-full border border-accent-soft bg-accent-soft px-[9px] py-[3px] text-[11px] font-semibold text-accent">
              <Icon name="sparkle" className="h-[12px] w-[12px]" />
              {item.suggestedAction}
            </span>
          )}
        </span>
      </span>

      {/* Status / due column */}
      <span className="col-start-2 mt-1 text-left font-mono text-[12px] font-semibold text-ink-soft sm:col-start-3 sm:mt-0 sm:text-right">
        {item.dueLabel}
        {item.dueDetail && (
          <small className="mt-[2px] block font-medium text-muted">{item.dueDetail}</small>
        )}
      </span>
    </button>
  );
}
