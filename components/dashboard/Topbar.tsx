'use client';

import { DEMO_USER } from '@/lib/demo-data';
import { useTheme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

type TopbarProps = {
  showRailToggle: boolean;
  railCollapsed: boolean;
  onToggleRail: () => void;
};

export function Topbar({ showRailToggle, railCollapsed, onToggleRail }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-wrap items-start justify-between gap-[18px]">
      <div>
        <h1 className="m-0 font-display text-[32px] font-semibold tracking-tight">
          Good morning, <span className="grad-text italic">{DEMO_USER.firstName}</span>
        </h1>
        <p className="mt-[6px] text-sm text-muted">
          {DEMO_USER.todayLabel} — here&apos;s what genuinely needs you today.
        </p>
      </div>

      <div className="flex items-center gap-[10px]">
        {/* Search (decorative in Phase 0) */}
        <div className="hidden w-[280px] items-center gap-[9px] rounded-[13px] border border-line bg-panel px-[13px] py-[10px] text-[13px] text-muted shadow-soft backdrop-blur-[14px] sm:flex">
          <Icon name="search" className="h-4 w-4 opacity-70" />
          Search people, threads, tasks…
          <kbd className="ml-auto rounded-md border border-line px-[6px] py-px font-mono text-[11px] text-muted">
            ⌘K
          </kbd>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Switch light / dark mode"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="relative flex h-11 cursor-pointer gap-[2px] rounded-[13px] border border-line bg-panel p-1 shadow-soft backdrop-blur-[14px]"
        >
          <span
            className="absolute left-1 top-1 z-[1] h-9 w-[38px] rounded-[10px] bg-gradient-to-br from-accent to-accent-2 shadow-[0_6px_16px_rgba(74,111,165,0.4)] transition-transform duration-300"
            style={{ transform: theme === 'light' ? 'translateX(40px)' : 'none' }}
            aria-hidden="true"
          />
          <span
            className={`relative z-[2] grid w-[38px] place-items-center rounded-[10px] ${theme === 'dark' ? 'text-white' : 'text-muted'}`}
          >
            <Icon name="moon" className="h-[18px] w-[18px]" />
          </span>
          <span
            className={`relative z-[2] grid w-[38px] place-items-center rounded-[10px] ${theme === 'light' ? 'text-white' : 'text-muted'}`}
          >
            <Icon name="sun" className="h-[18px] w-[18px]" />
          </span>
        </button>

        {/* Right-rail collapse/expand — clear chevron, only on Today view */}
        {showRailToggle && (
          <button
            type="button"
            onClick={onToggleRail}
            title={railCollapsed ? 'Show AI Analysis' : 'Hide AI Analysis'}
            aria-label={railCollapsed ? 'Show AI Analysis panel' : 'Hide AI Analysis panel'}
            className="hidden h-11 items-center gap-2 rounded-[13px] border border-line bg-panel px-3 text-ink-soft shadow-soft backdrop-blur-[14px] transition hover:border-accent hover:text-accent lg:flex"
          >
            <span className="text-[12px] font-semibold">AI</span>
            <Icon
              name="chevronRight"
              className={`h-[18px] w-[18px] transition-transform duration-300 ${railCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
