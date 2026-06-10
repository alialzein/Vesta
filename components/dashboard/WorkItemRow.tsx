import type { WorkItem, WorkItemSource } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { avatarHue, initialsOf } from '@/lib/avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';

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
  /** Position in the visible list — drives the staggered entry animation. */
  index?: number;
  /** Resolve in flight (done/dismiss/snooze/sent): play the exit transition
   *  before the row leaves the list, instead of vanishing with zero feedback. */
  leaving?: boolean;
};

export function WorkItemRow({ item, selected, onSelect, index = 0, leaving = false }: WorkItemRowProps) {
  const band = priorityBand(item.priorityScore);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-pressed={selected}
      // Staggered rise on mount (capped so long lists don't crawl); disabled
      // under prefers-reduced-motion via the global .animate-rise rule.
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
      className={[
        'animate-rise group/row relative grid w-full grid-cols-[40px_1fr] items-start gap-[12px] overflow-hidden rounded-[14px] border p-[10px_12px] text-left transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 sm:grid-cols-[40px_1fr_116px] sm:items-center',
        selected
          ? 'border-line-strong bg-accent-soft shadow-[0_10px_26px_rgba(47,125,235,0.14)]'
          : // Quiet-but-visible card (2026-06-10 radar diagnostic): a permanent
            // border + a fill stronger than the panel in BOTH themes, so an
            // unselected ticket still reads as a ticket. Hover/selected stay
            // the stronger states.
            'border-line bg-card hover:translate-x-[2px] hover:border-line-strong hover:bg-accent-soft',
        leaving ? 'pointer-events-none translate-x-[16px] opacity-0' : '',
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
        {/* Sender identity + source + last-email time — quiet, low-contrast. */}
        <span className="flex flex-wrap items-center gap-x-[7px] gap-y-1 text-[11px] text-muted">
          {item.unread && (
            <span className="inline-flex items-center gap-[4px] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
              <span
                className="h-[7px] w-[7px] flex-none rounded-full bg-accent"
                aria-hidden="true"
              />
              Unread
            </span>
          )}
          {item.person && (
            <span className="inline-flex min-w-0 items-center gap-[6px]">
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
            <span aria-hidden="true" className="text-line-strong">
              ·
            </span>
          )}
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {SOURCE_LABEL[item.source]}
          </span>
          {item.lastActivityAt && (
            <LocalTime
              iso={item.lastActivityAt}
              className="ml-auto flex-none font-mono text-[10.5px] text-muted"
            />
          )}
        </span>

        <h3 className="m-0 mt-[3px] text-[14px] font-semibold leading-tight tracking-tight">
          {item.title}
        </h3>
        <p className="mt-[2px] line-clamp-2 text-[12px] leading-snug text-muted">{item.summary}</p>

        <span className="mt-[7px] flex flex-wrap items-center gap-[6px]">
          {item.chips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
          {item.suggestedAction && (
            // Suggested-action pill: ghost on unselected rows so it doesn't
            // repeat a bright accent on every card; lit only on the selected
            // row (and on hover, as a preview).
            <span
              className={[
                'inline-flex items-center gap-[4px] rounded-full px-[8px] py-[2px] text-[11px] font-semibold transition-colors duration-200',
                selected
                  ? 'bg-accent-soft text-accent'
                  : 'border border-line bg-transparent text-muted group-hover/row:border-transparent group-hover/row:bg-accent-soft group-hover/row:text-accent',
              ].join(' ')}
            >
              <Icon name="sparkle" className="h-[11px] w-[11px]" />
              {item.suggestedAction}
            </span>
          )}
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
  );
}
