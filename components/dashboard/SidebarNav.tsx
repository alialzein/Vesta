'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
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
  /** Roadmap item — rendered honestly as a non-clickable "Soon" row. */
  soon?: boolean;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

type SidebarNavProps = {
  groups: NavGroup[];
  collapsed: boolean;
  /** The in-page dashboard view (only meaningful on the dashboard itself). */
  activeView?: NavView;
  /** Current route (e.g. /inbox) so href items highlight on their own page. */
  activePath?: string;
  onSelectView: (view: NavView) => void;
};

export function SidebarNav({
  groups,
  collapsed,
  activeView,
  activePath,
  onSelectView,
}: SidebarNavProps) {
  // Collapsed-rail tooltip. Rendered as a fixed element (positioned from the hovered
  // icon's rect) so it escapes the sidebar's overflow clipping and the content's
  // stacking context — otherwise it hides behind the dashboard.
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);

  function showTip(e: React.SyntheticEvent<HTMLElement>, item: NavItem) {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    const text = item.soon
      ? `${item.label} · Soon`
      : item.badge !== undefined
        ? `${item.label} · ${item.badge}`
        : item.label;
    setTip({ text, top: r.top + r.height / 2, left: r.right + 10 });
  }
  const hideTip = () => setTip(null);

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
            // View items highlight on the dashboard; route items on their page.
            const isActive = item.href
              ? item.href === activePath
              : item.view !== undefined && item.view === activeView;
            const hasBadge = item.badge !== undefined;

            const className = [
              'group/nav relative flex items-center rounded-xl text-sm font-medium transition',
              collapsed ? 'h-11 w-11 justify-center self-center' : 'gap-[11px] px-3 py-[10px]',
              item.soon
                ? 'cursor-default text-[color:var(--side-link)] opacity-60'
                : isActive
                  ? 'cursor-pointer bg-[image:var(--side-active-bg)] text-[color:var(--side-ink)] shadow-[inset_0_0_0_1px_var(--side-card-border)]'
                  : 'cursor-pointer text-[color:var(--side-link)] hover:bg-[color:var(--side-hover)] hover:text-[color:var(--side-ink)]',
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
                    <span className="absolute -right-[7px] -top-[7px] grid h-[16px] min-w-[16px] place-items-center rounded-full bg-accent px-[3px] font-mono text-[10px] font-bold leading-none text-white shadow-[0_2px_5px_rgba(47,125,235,0.5)]">
                      {item.badge}
                    </span>
                  )}
                </span>

                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Roadmap rows wear the violet "Soon" pill — the same honesty
                    promise as the landing. Violet is now a THEME TOKEN
                    (--violet/--violet-soft) so both themes speak one roadmap
                    color (was hardcoded #8b7cf6, invisible-ish in light). */}
                {!collapsed && item.soon && (
                  <span className="ml-auto rounded-full bg-violet-soft px-[8px] py-[2px] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-violet">
                    Soon
                  </span>
                )}

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
              </>
            );

            const hoverProps = {
              onMouseEnter: (e: React.SyntheticEvent<HTMLElement>) => showTip(e, item),
              onMouseLeave: hideTip,
              onFocus: (e: React.SyntheticEvent<HTMLElement>) => showTip(e, item),
              onBlur: hideTip,
            };

            // Roadmap item — visible but honestly inert (no dead click).
            if (item.soon) {
              return (
                <div
                  key={item.label}
                  aria-disabled="true"
                  aria-label={collapsed ? `${item.label} (coming soon)` : undefined}
                  className={className}
                  {...hoverProps}
                >
                  {inner}
                </div>
              );
            }

            // Route link (e.g. Inbox) vs in-page view switch.
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch
                  aria-label={collapsed && hasBadge ? `${item.label} (${item.badge})` : item.label}
                  className={className}
                  {...hoverProps}
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
                {...hoverProps}
              >
                {inner}
              </button>
            );
          })}
        </div>
      ))}

      {/* Collapsed-rail tooltip — portaled to <body> so it escapes the sidebar's
          stacking context (z-[1]); otherwise the dashboard column paints over it. */}
      {tip &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-panel-solid px-[10px] py-[6px] text-[12px] font-semibold text-ink shadow-panel"
            style={{ top: tip.top, left: tip.left }}
          >
            {tip.text}
          </span>,
          document.body,
        )}
    </nav>
  );
}
