'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, type NavCounts, type NavView } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { DashboardAtmosphere } from '@/components/dashboard/DashboardAtmosphere';
import type { AccountView } from '@/lib/supabase/account';

/**
 * The persistent app frame for every routed page (Inbox, Waiting on Me, Drafts,
 * Hidden, Weekly Review, Settings) — the same sidebar + topbar as the dashboard,
 * so the whole app feels like one place and pages use the full screen width.
 *
 * Rendered by `app/(shell)/layout.tsx`, so it stays mounted across navigations:
 * a sidebar click swaps only the content column (each route's loading.tsx),
 * never the frame. The dashboard (`/`) keeps its own richer shell (AI rail,
 * in-page views) in DashboardClient.
 */

const PAGE_HEADERS: Record<string, { title: string; subtitle: string }> = {
  '/inbox': { title: 'Inbox', subtitle: 'Conversations Vesta synced from your mailbox.' },
  '/priorities': {
    title: 'Waiting on Me',
    subtitle: 'People waiting on your reply, ranked by urgency.',
  },
  '/drafts': {
    title: 'Draft replies',
    subtitle: 'Replies waiting for your review. Nothing is ever sent without your approval.',
  },
  '/hidden': {
    title: 'Hidden mail',
    subtitle: 'Mail Vesta filtered out as noise. Allow anything it got wrong.',
  },
  '/weekly-review': {
    title: 'Weekly Review',
    subtitle: 'What moved in the last 7 days — and what took your attention.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Your mailbox connection, managed senders, and preferences.',
  },
};

export function AppShell({
  account,
  counts,
  children,
}: {
  account?: AccountView;
  counts?: NavCounts;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = PAGE_HEADERS[pathname ?? ''];

  // The Today / Memory & Rules buttons land on the dashboard — keep it warm so
  // the jump back feels instant (nav rule: prefetch everything we navigate to).
  useEffect(() => {
    router.prefetch('/');
  }, [router]);

  function handleSelectView(view: NavView) {
    router.push(view === 'memory' ? '/?view=memory' : '/');
  }

  return (
    <>
      {/* Subtle Vesta atmosphere behind everything (same as the dashboard). */}
      <DashboardAtmosphere />

      <div
        className={[
          'relative grid h-screen w-screen grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 p-3 transition-[grid-template-columns] duration-300 sm:p-4',
          collapsed
            ? 'lg:grid-cols-[88px_minmax(0,1fr)]'
            : 'lg:grid-cols-[280px_minmax(0,1fr)]',
        ].join(' ')}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          activePath={pathname ?? undefined}
          onSelectView={handleSelectView}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          account={account}
          counts={counts}
        />

        <main className="v-scroll relative z-[1] flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-1">
          <Topbar
            onOpenSidebar={() => setMobileOpen(true)}
            account={account}
            title={header?.title}
            subtitle={header?.subtitle}
          />
          {children}
        </main>
      </div>
    </>
  );
}
