'use client';

import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { NavView } from './Sidebar';

export type NavItem = {
  label: string;
  icon: IconName;
  badge?: number;
  /** Switches the in-page dashboard view. */
  view?: NavView;
  /** Navigates to a route (e.g. /inbox). Mutually exclusive with `view`. */
  href?: string;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

type SidebarNavProps = {
  groups: NavGroup[];
  collapsed: boolean;
  activeView: NavView;
  onSelectView: (view: NavView) => void;
};

export function SidebarNav({ groups, collapsed, activeView, onSelectView }: SidebarNavProps) {
  return (
    <nav className="flex w-full flex-col gap-[3px]">
      {groups.map((group) => (
        <div key={group.heading} className="flex flex-col gap-[3px]">
          {!collapsed ? (
            <div className="mx-[6px] mb-1 mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--side-lbl)]">
              {group.heading}
            </div>
          ) : (
            <div className="my-2 h-px w-8 self-center bg-[color:var(--side-border)]" />
          )}

          {group.items.map((item) => {
            const isActive = item.view !== undefined && item.view === activeView;
            const hasBadge = item.badge !== undefined;

            const className = [
              'group/nav relative flex cursor-pointer items-center rounded-xl text-sm font-medium transition',
              collapsed ? 'h-11 w-11 justify-center self-center' : 'gap-[11px] px-3 py-[10px]',
              isActive
                ? 'bg-[image:var(--side-active-bg)] text-[color:var(--side-ink)] shadow-[inset_0_0_0_1px_var(--side-card-border)]'
                : 'text-[color:var(--side-link)] hover:bg-[color:var(--side-hover)] hover:text-[color:var(--side-ink)]',
            ].join(' ');

            const inner = (
              <>
                {/* Active accent bar (expanded only) */}
                {isActive && !collapsed && (
                  <span
                    className="absolute left-0 top-[9px] bottom-[9px] w-[3px] rounded-r bg-gradient-to-b from-accent to-accent-2"
                    aria-hidden="true"
                  />
                )}

                <span className="relative flex-none">
                  <Icon
                    name={item.icon}
                    className={`h-[19px] w-[19px] ${isActive ? 'text-accent' : 'opacity-85'}`}
                  />
                  {collapsed && hasBadge && (
                    <span className="absolute -right-[7px] -top-[7px] grid h-[15px] min-w-[15px] place-items-center rounded-full bg-accent px-[3px] font-mono text-[9px] font-bold leading-none text-white shadow-[0_2px_5px_rgba(47,125,235,0.5)]">
                      {item.badge}
                    </span>
                  )}
                </span>

                {!collapsed && <span className="truncate">{item.label}</span>}

                {!collapsed && hasBadge && (
                  <span
                    className={[
                      'ml-auto rounded-full px-[9px] py-[2px] font-mono text-[11px] font-semibold',
                      isActive
                        ? 'bg-accent text-white'
                        : 'bg-[color:var(--side-badge-bg)] text-[color:var(--side-badge-ink)]',
                    ].join(' ')}
                  >
                    {item.badge}
                  </span>
                )}

                {collapsed && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-panel-solid px-[10px] py-[6px] text-[12px] font-semibold text-ink opacity-0 shadow-panel transition-opacity duration-150 group-hover/nav:opacity-100 group-focus-visible/nav:opacity-100"
                  >
                    {item.label}
                    {hasBadge ? ` · ${item.badge}` : ''}
                  </span>
                )}
              </>
            );

            // Route link (e.g. Inbox) vs in-page view switch.
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch
                  aria-label={collapsed && hasBadge ? `${item.label} (${item.badge})` : item.label}
                  className={className}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => item.view && onSelectView(item.view)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed && hasBadge ? `${item.label} (${item.badge})` : item.label}
                className={className}
              >
                {inner}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
