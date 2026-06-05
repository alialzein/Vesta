import type { WorkItem } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { Chip } from '@/components/ui/Chip';

const bandClasses: Record<ReturnType<typeof priorityBand>, string> = {
  red: 'bg-red-soft text-red shadow-[inset_0_0_0_1px_rgba(255,122,110,.35)]',
  amber: 'bg-amber-soft text-amber shadow-[inset_0_0_0_1px_rgba(255,194,75,.35)]',
  green: 'bg-green-soft text-green shadow-[inset_0_0_0_1px_rgba(67,224,168,.35)]',
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
        'relative grid w-full grid-cols-[54px_1fr] items-center gap-[15px] rounded-[15px] border p-[15px] text-left transition sm:grid-cols-[54px_1fr_116px]',
        selected
          ? 'border-accent bg-accent-soft'
          : 'border-line bg-panel-2 hover:translate-x-[3px] hover:border-line-strong hover:bg-accent-soft',
      ].join(' ')}
    >
      {selected && (
        <span
          className="absolute left-0 top-[14px] bottom-[14px] w-[3px] rounded-[3px] bg-gradient-to-b from-accent to-accent-2"
          aria-hidden="true"
        />
      )}
      <span
        className={`grid h-[50px] w-[50px] flex-none place-items-center rounded-[14px] font-mono text-[16px] font-bold ${bandClasses[band]}`}
      >
        {item.priorityScore}
      </span>
      <span className="min-w-0">
        <h3 className="m-0 text-[15px] font-semibold tracking-tight">{item.title}</h3>
        <p className="mt-[5px] text-[12.5px] leading-snug text-muted">{item.summary}</p>
        <span className="mt-[9px] flex flex-wrap gap-[6px]">
          {item.chips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
        </span>
      </span>
      <span className="col-start-2 text-left font-mono text-[12.5px] font-semibold text-ink-soft sm:col-start-3 sm:text-right">
        {item.dueLabel}
        {item.dueDetail && (
          <small className="mt-[2px] block font-medium text-muted">{item.dueDetail}</small>
        )}
      </span>
    </button>
  );
}
