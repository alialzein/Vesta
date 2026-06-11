'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEMO_USER } from '@/lib/demo-data';
import { useTheme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { AccountView } from '@/lib/supabase/account';

type TopbarProps = {
  /** Opens the sidebar drawer on small screens (hamburger). */
  onOpenSidebar: () => void;
  /** Signed-in account; falls back to demo identity when absent. */
  account?: AccountView;
  /** Page title — shown instead of the greeting on app-shell pages. */
  title?: string;
  /** Page subtitle (only used with `title`). */
  subtitle?: string;
};

/**
 * Clean SaaS topbar: greeting on the left, a compact utility cluster on the
 * right (search, notifications, settings, theme, profile). The AI-rail toggle
 * lives inside the AI Assistant panel itself, and the Outlook sync status was
 * moved out of the topbar (it now sits subtly in the sidebar footer).
 *
 * Settings + theme work today; search and notifications show an honest
 * "coming soon" message until their phases land.
 */
export function Topbar({ onOpenSidebar, account, title, subtitle }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const firstName = account?.firstName ?? DEMO_USER.firstName;

  // Today's date — computed on the client to avoid an SSR/timezone hydration
  // mismatch (the server renders in UTC). Empty until mounted.
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
    );
  }, []);

  return (
    <div className="flex items-start justify-between gap-4">
      {/* Greeting */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile sidebar trigger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="grid h-10 w-10 flex-none place-items-center rounded-sm border border-line bg-panel text-ink-soft shadow-soft transition hover:border-accent hover:text-accent lg:hidden"
        >
          <Icon name="list" className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          {title ? (
            <>
              <h1 className="m-0 truncate pb-[2px] font-display text-[24px] font-semibold leading-[1.2] tracking-tight sm:text-[30px]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-[3px] truncate text-[13px] text-muted sm:text-sm">{subtitle}</p>
              )}
            </>
          ) : (
            <>
              <h1 className="m-0 truncate pb-[2px] font-display text-[24px] font-semibold leading-[1.2] tracking-tight sm:text-[30px]">
                Good morning,{' '}
                <span className="grad-text inline-block pr-[4px] italic">{firstName}</span>
              </h1>
              <p className="mt-[3px] truncate text-[13px] text-muted sm:text-sm">
                {today && `${today} — `}here&apos;s what genuinely needs you today.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Utility cluster — flex-none so it never wraps under the greeting. */}
      <div className="flex flex-none items-center gap-[8px]">
        {/* Search (decorative) — only on very wide screens. */}
        <label className="hidden h-11 w-[230px] items-center gap-[9px] rounded-sm border border-line bg-panel px-[13px] text-[13px] text-muted shadow-soft transition focus-within:border-accent 2xl:flex">
          <Icon name="search" className="h-4 w-4 flex-none opacity-70" />
          <input
            type="search"
            placeholder="Search…"
            aria-label="Search people, threads and tasks"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                showToast('Search across people, threads and tasks arrives in a later phase.');
              }
            }}
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-line px-[6px] py-px font-mono text-[11px] text-muted">
            ⌘K
          </kbd>
        </label>

        {/* Notification bell. Badge is inset inside the button bounds with a ring
            so it never clips, in light or dark mode or at any edge. */}
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          onClick={() =>
            showToast('Notifications (reminders, follow-up nudges) arrive in a later phase.')
          }
          className="relative grid h-11 w-11 flex-none place-items-center rounded-sm border border-line bg-panel text-ink-soft shadow-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="bell" className="h-[19px] w-[19px]" />
        </button>

        {/* Settings → connect mailbox, preferences */}
        <Link
          href="/settings"
          prefetch
          aria-label="Open settings"
          title="Settings"
          className="hidden h-11 w-11 flex-none place-items-center rounded-sm border border-line bg-panel text-ink-soft shadow-soft transition hover:border-accent hover:text-accent sm:grid"
        >
          <Icon name="settings" className="h-[19px] w-[19px]" />
        </Link>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Switch light / dark mode"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="relative flex h-11 flex-none cursor-pointer gap-[2px] rounded-sm border border-line bg-panel p-1 shadow-soft"
        >
          <span
            className="absolute left-1 top-1 z-[1] h-9 w-[38px] rounded-[10px] bg-gradient-to-br from-accent to-accent-2 shadow-[0_6px_16px_rgba(47,125,235,0.4)] transition-transform duration-300"
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

        {/* Profile lives in the sidebar footer, so it is not duplicated here. */}
      </div>
    </div>
  );
}
