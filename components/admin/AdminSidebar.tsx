'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  soon?: boolean;
};

/** Wave 1 = active tabs; Wave 2 = disabled "soon" entries (full map visible). */
const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Operations',
    items: [
      { label: 'Overview', href: '/admin', icon: 'activity' },
      { label: 'Users & Accounts', href: '/admin/users', icon: 'people' },
      { label: 'Mailboxes & Sync', href: '/admin/mailboxes', icon: 'mail' },
      { label: 'Email & Retention', href: '/admin/email', icon: 'inbox' },
      { label: 'AI Control Center', href: '/admin/ai', icon: 'sparkle' },
    ],
  },
  {
    heading: 'Wave 2',
    items: [
      { label: 'Triage & Rules', href: '/admin/triage', icon: 'settings', soon: true },
      { label: 'Drafts & Sending', href: '/admin/drafts', icon: 'drafts', soon: true },
      { label: 'Audit & Security', href: '/admin/audit', icon: 'shield', soon: true },
    ],
  },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <nav className="flex flex-col gap-5" aria-label="Operator console navigation">
      {NAV.map((group) => (
        <div key={group.heading}>
          <div className="mb-2 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
            {group.heading}
          </div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              if (item.soon) {
                return (
                  <li key={item.label}>
                    <span
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] text-muted/70"
                      title="Coming in Wave 2"
                    >
                      <Icon name={item.icon} className="h-[16px] w-[16px] opacity-60" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-full border border-line px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide">
                        Soon
                      </span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    prefetch
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium transition',
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-ink-soft hover:bg-panel-2 hover:text-ink',
                    ].join(' ')}
                  >
                    <Icon name={item.icon} className="h-[16px] w-[16px]" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
