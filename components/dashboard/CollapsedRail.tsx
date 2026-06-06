'use client';

import type { RailTab } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * Collapsed AI rail — a slim vertical strip of icons. Clicking an icon expands
 * the rail and opens the matching tab. A small badge appears when the selected
 * item is high priority.
 */

type RailIcon = {
  /** undefined = the top "AI" expand button (no specific tab). */
  tab?: RailTab;
  /** undefined = the chat button. */
  chat?: boolean;
  label: string;
  icon: IconName;
};

const ICONS: RailIcon[] = [
  { label: 'AI assistant', icon: 'sparkle' },
  { tab: 'action', label: 'Action', icon: 'check' },
  { tab: 'draft', label: 'Draft', icon: 'edit' },
  { tab: 'memory', label: 'Memory', icon: 'brain' },
  { chat: true, label: 'Chat', icon: 'chat' },
];

type CollapsedRailProps = {
  highPriority: boolean;
  onExpand: (tab?: RailTab) => void;
  onOpenChat: () => void;
};

export function CollapsedRail({ highPriority, onExpand, onOpenChat }: CollapsedRailProps) {
  return (
    <aside
      aria-label="AI assistant (collapsed)"
      className="hidden w-16 flex-col items-center gap-2 rounded-[var(--radius)] border border-[color:var(--rail-border)] bg-[image:var(--rail-bg)] p-[10px_8px] shadow-glow lg:flex"
    >
      {ICONS.map((entry, i) => {
        const isTop = i === 0;
        return (
          <button
            key={entry.label}
            type="button"
            aria-label={entry.label}
            title={entry.label}
            onClick={() => (entry.chat ? onOpenChat() : onExpand(entry.tab))}
            className={[
              'group/rail relative grid h-11 w-11 place-items-center rounded-[12px] transition',
              isTop
                ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_8px_20px_rgba(47,125,235,0.4)] hover:brightness-110'
                : 'border border-line bg-panel-solid text-ink-soft hover:border-accent hover:text-accent',
            ].join(' ')}
          >
            <Icon name={entry.icon} className="h-[19px] w-[19px]" />

            {/* High-priority badge on the top AI button */}
            {isTop && highPriority && (
              <span className="absolute -right-[3px] -top-[3px] h-[12px] w-[12px] rounded-full border-2 border-panel bg-red shadow-[0_2px_5px_rgba(239,91,91,0.5)]" />
            )}

            {/* Tooltip */}
            <span
              role="tooltip"
              className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-panel-solid px-[10px] py-[6px] text-[12px] font-semibold text-ink opacity-0 shadow-panel transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100"
            >
              {entry.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
