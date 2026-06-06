'use client';

import { Icon, VestaMark } from '@/components/ui/Icon';

type SidebarHeaderProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/**
 * Reserves space for the brand and the collapse toggle so they never overlap.
 *
 * - Expanded: logo + name + tagline on the left, collapse button in its own
 *   top-right control slot (a flex row, not absolutely positioned over the logo).
 * - Collapsed: centered logo, with the expand button on a separate row below it.
 */
export function SidebarHeader({ collapsed, onToggleCollapsed }: SidebarHeaderProps) {
  const Brand = (
    <div className={`flex items-center gap-[13px] ${collapsed ? 'justify-center' : ''}`}>
      <div className="grid h-11 w-11 flex-none place-items-center rounded-[13px] bg-[radial-gradient(circle_at_50%_95%,#43c7ff,#2f7deb_50%,var(--accent-2)_100%)] shadow-[0_8px_22px_rgba(47,125,235,0.4),inset_0_0_0_1px_rgba(255,255,255,.25)]">
        <VestaMark className="relative z-10 h-[22px] w-[22px] text-white drop-shadow" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <b className="block font-display text-[18px] font-semibold leading-[1.05] tracking-tight text-[color:var(--side-ink)]">
            Vesta
          </b>
          <span className="block truncate text-[10px] uppercase tracking-[0.22em] text-[color:var(--side-muted)]">
            Your work, in order
          </span>
        </div>
      )}
    </div>
  );

  const ToggleButton = (
    <button
      type="button"
      onClick={onToggleCollapsed}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand' : 'Collapse'}
      className="grid h-8 w-8 flex-none place-items-center rounded-[10px] border border-[color:var(--side-card-border)] bg-[color:var(--side-card)] text-[color:var(--side-muted)] transition hover:border-accent hover:text-accent"
    >
      <Icon
        name="chevronLeft"
        className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
      />
    </button>
  );

  if (collapsed) {
    // Stacked: logo on top, expand button on its own safe row beneath it.
    return (
      <div className="flex flex-col items-center gap-3">
        {Brand}
        {ToggleButton}
      </div>
    );
  }

  // Expanded: brand + toggle share a row, toggle in its own right-side slot.
  return (
    <div className="flex items-start justify-between gap-3">
      {Brand}
      {ToggleButton}
    </div>
  );
}
