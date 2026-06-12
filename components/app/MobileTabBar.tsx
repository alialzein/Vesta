'use client';

import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * Phone bottom tab bar (Vesta Mobile pass, 2026-06-12) — the app-style
 * navigation for screens where the sidebar is hidden (< lg). Five stations:
 * Today · Inbox · Ask Vesta (raised center action) · Briefing · Menu.
 * Menu opens the existing sidebar drawer, so every destination stays one tap
 * away without crowding the bar. lg:hidden end to end — desktop never sees it.
 *
 * The bar is fixed and pads for the home indicator (safe-area-inset). Content
 * columns add bottom padding below lg so nothing hides behind it.
 */
const TABS: { id: string; label: string; icon: IconName; href: string }[] = [
  { id: 'today', label: 'Today', icon: 'home', href: '/' },
  { id: 'inbox', label: 'Inbox', icon: 'mail', href: '/inbox' },
  // Ask Vesta renders as the raised center bubble (special-cased below).
  { id: 'chat', label: 'Ask Vesta', icon: 'chat', href: '/chat' },
  { id: 'briefing', label: 'Briefing', icon: 'sun', href: '/briefing' },
];

export function MobileTabBar({
  activePath,
  onMenu,
}: {
  /** Current route ('/' on the dashboard) — highlights the matching tab. */
  activePath: string;
  /** Opens the full navigation drawer (the existing mobile sidebar). */
  onMenu: () => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-line bg-panel-solid/95 pb-[max(6px,env(safe-area-inset-bottom))] pt-[6px] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-5 items-end px-2">
        {TABS.slice(0, 2).map((t) => (
          <TabLink key={t.id} {...t} active={activePath === t.href} />
        ))}

        {/* Ask Vesta — the raised center action, the app's signature gesture. */}
        <Link
          href="/chat"
          prefetch
          aria-label="Ask Vesta"
          aria-current={activePath === '/chat' ? 'page' : undefined}
          className="group relative -mt-5 flex flex-col items-center gap-[3px]"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_20%,var(--accent),var(--accent-2))] text-white shadow-[0_10px_24px_rgba(47,125,235,.45),inset_0_0_0_1px_rgba(255,255,255,.25)] transition group-active:scale-95">
            <Icon name="chat" className="h-[21px] w-[21px]" />
          </span>
          <span
            className={[
              'text-[10.5px] font-semibold leading-none',
              activePath === '/chat' ? 'text-accent' : 'text-muted',
            ].join(' ')}
          >
            Vesta
          </span>
        </Link>

        <TabLink {...TABS[3]} active={activePath === TABS[3].href} />

        {/* Menu — opens the full drawer (Waiting on you, Drafts, Hidden,
            Memory & Rules, Weekly Review, Settings…). */}
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="flex flex-col items-center gap-[4px] rounded-[12px] px-1 py-[6px] text-muted transition active:scale-95"
        >
          <Icon name="list" className="h-[20px] w-[20px]" />
          <span className="text-[10.5px] font-semibold leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
}

function TabLink({
  label,
  icon,
  href,
  active,
}: {
  label: string;
  icon: IconName;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      className={[
        'flex flex-col items-center gap-[4px] rounded-[12px] px-1 py-[6px] transition active:scale-95',
        active ? 'text-accent' : 'text-muted',
      ].join(' ')}
    >
      <span className="relative">
        <Icon name={icon} className="h-[20px] w-[20px]" />
        {active && (
          <span
            className="absolute -top-[8px] left-1/2 h-[3px] w-[14px] -translate-x-1/2 rounded-full bg-gradient-to-r from-accent to-accent-2"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="text-[10.5px] font-semibold leading-none">{label}</span>
    </Link>
  );
}
