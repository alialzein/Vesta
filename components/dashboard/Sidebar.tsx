'use client';

import { useEffect } from 'react';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav, type NavGroup } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';
import type { AccountView } from '@/lib/supabase/account';

export type NavView = 'today' | 'memory';

/** Real counts shown as nav badges (omitted/zero → no badge, never a fake number). */
export type NavCounts = { today?: number; waiting?: number; followup?: number };

function buildNav(counts: NavCounts): NavGroup[] {
  // Only badge what we have real data for; 0 shows no badge (honest, not "empty").
  const badge = (n?: number) => (n && n > 0 ? n : undefined);
  return [
    {
      heading: 'Workspace',
      items: [
        { label: 'Today', icon: 'home', view: 'today', badge: badge(counts.today) },
        { label: 'Inbox', icon: 'mail', href: '/inbox' },
        { label: 'Waiting on Me', icon: 'clock', href: '/priorities', badge: badge(counts.waiting) },
        { label: 'Follow-ups', icon: 'reply', badge: badge(counts.followup) },
        { label: 'Draft Replies', icon: 'drafts' },
        { label: 'Hidden', icon: 'eyeOff', href: '/hidden' },
      ],
    },
    {
      heading: 'Intelligence',
      items: [
        { label: 'Delegation', icon: 'delegate' },
        { label: 'Memory & Rules', icon: 'brain', view: 'memory' },
        { label: 'Weekly Review', icon: 'trend' },
      ],
    },
  ];
}

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  /** Mobile drawer state (the sidebar is hidden on < lg and shown as an overlay). */
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** Signed-in account; falls back to demo identity when absent. */
  account?: AccountView;
  /** Real nav badge counts derived from the dashboard's work items. */
  counts?: NavCounts;
};

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  activeView,
  onSelectView,
  mobileOpen,
  onCloseMobile,
  account,
  counts = {},
}: SidebarProps) {
  const nav = buildNav(counts);
  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  // The mobile drawer is never collapsed; full nav is always shown there.
  const panel = (mobile: boolean) => (
    <aside
      className={[
        'v-scroll flex flex-col gap-2 overflow-y-auto overflow-x-hidden border-[color:var(--side-border)] bg-[image:var(--side-bg)] text-[color:var(--side-ink)] shadow-panel transition-all duration-300',
        mobile
          ? 'h-full w-[280px] border-r p-[22px_18px]'
          : [
              'relative z-[1] hidden rounded-lg border lg:flex',
              collapsed ? 'p-[16px_10px]' : 'p-[22px_18px]',
            ].join(' '),
      ].join(' ')}
      aria-label="Primary navigation"
    >
      <SidebarHeader
        collapsed={mobile ? false : collapsed}
        onToggleCollapsed={mobile ? onCloseMobile : onToggleCollapsed}
      />
      <SidebarNav
        groups={nav}
        collapsed={mobile ? false : collapsed}
        activeView={activeView}
        onSelectView={(v) => {
          onSelectView(v);
          if (mobile) onCloseMobile();
        }}
      />
      <SidebarFooter collapsed={mobile ? false : collapsed} account={account} />
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar (column in the dashboard grid) */}
      {panel(false)}

      {/* Mobile drawer + backdrop */}
      <div
        onClick={onCloseMobile}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />
      <div
        role="dialog"
        aria-label="Navigation menu"
        aria-hidden={!mobileOpen}
        className={[
          'fixed left-0 top-0 z-[90] h-screen transition-transform duration-300 ease-ease lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Only mount the drawer contents when open so the full nav is not
            duplicated in the accessibility tree while closed. */}
        {mobileOpen && panel(true)}
      </div>
    </>
  );
}
