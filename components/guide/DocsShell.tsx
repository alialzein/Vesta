'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';
import { Icon, VestaMark } from '@/components/ui/Icon';
import { guidesByGroup } from '@/lib/guides/registry';
import type { TocItem } from '@/lib/guides/markdown';
import { GuideToc } from './GuideToc';

/**
 * The chrome for the public user-guide site: a fixed top bar, a grouped left
 * sidebar (a slide-in drawer on phones), the reading column, and an optional
 * right-hand table of contents. The article itself is passed in as `children`
 * (server-rendered Markdown), so none of the markdown machinery ships here.
 *
 * Both themes via tokens; the theme toggle persists the user's choice exactly
 * like the rest of Vesta. Owns its own scroll (the app body is overflow:hidden):
 * the shell is a full-height column and only the sidebar + reading pane scroll.
 */
export function DocsShell({
  activeSlug,
  toc,
  children,
}: {
  activeSlug: string | null;
  toc: TocItem[];
  children: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const groups = guidesByGroup();

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const SidebarNav = (
    <nav aria-label="Guides" className="flex flex-col gap-6 px-4 py-6">
      <Link
        href="/user-guide"
        prefetch
        onClick={() => setDrawerOpen(false)}
        className={[
          'flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-colors',
          activeSlug === null
            ? 'bg-accent-soft text-accent'
            : 'text-ink-soft hover:bg-panel-2 hover:text-ink',
        ].join(' ')}
      >
        <Icon name="home" className="h-[15px] w-[15px]" />
        Overview
      </Link>

      {groups.map(({ group, guides }) => (
        <div key={group.id}>
          <p className="px-3 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            {group.title}
          </p>
          <ul className="m-0 list-none space-y-0.5 p-0">
            {guides.map((g) => {
              const isActive = g.slug === activeSlug;
              return (
                <li key={g.slug}>
                  <Link
                    href={`/user-guide/${g.slug}`}
                    prefetch
                    onClick={() => setDrawerOpen(false)}
                    className={[
                      'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors',
                      isActive
                        ? 'bg-accent-soft font-medium text-accent'
                        : 'text-ink-soft hover:bg-panel-2 hover:text-ink',
                    ].join(' ')}
                  >
                    <Icon
                      name={g.icon}
                      className={[
                        'h-[15px] w-[15px] flex-none',
                        isActive ? 'text-accent' : 'text-muted',
                      ].join(' ')}
                    />
                    <span className="min-w-0 truncate">{g.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-bg text-ink">
      {/* Ambient AI glow — subtle, theme-aware, never over readable text. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(700px_280px_at_50%_-12%,var(--accent-soft),transparent_72%)]"
      />

      {/* ------------------------------ top bar ------------------------------ */}
      <header className="relative z-30 flex h-[60px] flex-none items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="Open guide menu"
          aria-expanded={drawerOpen}
          className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent lg:hidden"
        >
          <Icon name={drawerOpen ? 'close' : 'list'} className="h-[16px] w-[16px]" />
        </button>

        <Link href="/welcome" prefetch className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-accent to-accent-2 text-white shadow-soft">
            <VestaMark className="h-[17px] w-[17px]" />
          </span>
          <span className="font-display text-[18px] font-semibold tracking-tight">Vesta</span>
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted sm:inline">
            User guide
          </span>
        </Link>

        <span className="ml-auto" />

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel text-ink-soft shadow-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[16px] w-[16px]" />
        </button>
        <Link
          href="/"
          prefetch
          className="rounded-full bg-gradient-to-br from-accent to-accent-2 px-4 py-[8px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110"
        >
          Open Vesta
        </Link>
      </header>

      {/* ------------------------------- body -------------------------------- */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-[288px] flex-none overflow-y-auto border-r border-line lg:block">
          {SidebarNav}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 left-0 w-[280px] max-w-[82vw] overflow-y-auto border-r border-line bg-bg shadow-panel">
              {SidebarNav}
            </div>
          </div>
        )}

        {/* Reading pane (owns the scroll) */}
        <main className="v-scroll min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1180px] gap-10 px-5 py-9 sm:px-8 sm:py-12">
            <article className="min-w-0 flex-1">{children}</article>
            {toc.length > 0 && (
              <aside className="hidden w-[224px] flex-none xl:block">
                <div className="sticky top-2">
                  <GuideToc items={toc} />
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
