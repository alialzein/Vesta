'use client';

import Link from 'next/link';
import { useTheme } from '@/lib/theme';
import { Icon, VestaMark } from '@/components/ui/Icon';
import { signOut } from '@/app/(auth)/actions';

export function AdminTopbar({
  adminEmail,
  env,
  onToggleMobile,
}: {
  adminEmail: string | null;
  env: string;
  onToggleMobile: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const isProd = env === 'production';

  return (
    <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
      <button
        type="button"
        onClick={onToggleMobile}
        aria-label="Toggle navigation"
        className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-ink-soft transition hover:border-accent hover:text-accent lg:hidden"
      >
        <Icon name="panelRight" className="h-[18px] w-[18px]" />
      </button>

      <Link href="/admin" prefetch className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-accent/15 text-accent">
          <VestaMark className="h-[18px] w-[18px]" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[14px] font-semibold tracking-tight text-ink">
            Vesta · Operator Console
          </span>
          <span className="text-[11px] text-muted">Internal admin — handle with care</span>
        </span>
      </Link>

      <span
        className={[
          'ml-1 rounded-full border px-2 py-[2px] text-[10.5px] font-semibold uppercase tracking-wide',
          isProd ? 'border-red/50 text-red' : 'border-line text-muted',
        ].join(' ')}
        title="Deployment environment"
      >
        {isProd ? 'Production' : env || 'dev'}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {adminEmail && (
          <span className="hidden text-[12px] text-muted sm:inline" title="Signed in as">
            {adminEmail}
          </span>
        )}
        <Link
          href="/"
          prefetch
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-2.5 py-[7px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="arrow" className="h-[14px] w-[14px] rotate-180" />
          Back to app
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[16px] w-[16px]" />
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign out"
          className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-ink-soft transition hover:border-red/60 hover:text-red"
        >
          <Icon name="signout" className="h-[16px] w-[16px]" />
        </button>
      </div>
    </header>
  );
}
