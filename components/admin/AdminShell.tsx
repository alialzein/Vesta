'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { VestaSplashScreen } from '@/components/dashboard/VestaSplashScreen';

const SPLASH_KEY = 'vesta-admin-splash';

/**
 * Operator-console shell: a distinct "mission control" frame around the admin
 * tabs. Reuses the Vesta splash (once per browser session) and the shared theme,
 * so light/dark both work. Desktop = fixed left rail; mobile = a slide-in drawer.
 */
export function AdminShell({
  children,
  adminEmail,
  env,
}: {
  children: ReactNode;
  adminEmail: string | null;
  env: string;
}) {
  const [showSplash, setShowSplash] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Show the splash once per session when first entering the console.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SPLASH_KEY)) setShowSplash(true);
    } catch {
      /* sessionStorage unavailable — skip splash */
    }
  }, []);

  // Close the mobile drawer on route change.
  useEffect(() => setMobileOpen(false), [pathname]);

  const sidebar = (
    <div className="v-scroll h-full overflow-y-auto p-3">
      <AdminSidebar onNavigate={() => setMobileOpen(false)} />
    </div>
  );

  return (
    <>
      {showSplash && (
        <VestaSplashScreen
          onDone={() => {
            try {
              sessionStorage.setItem(SPLASH_KEY, '1');
            } catch {
              /* ignore */
            }
            setShowSplash(false);
          }}
        />
      )}

      <div className="flex h-screen flex-col bg-bg text-ink">
        <AdminTopbar adminEmail={adminEmail} env={env} onToggleMobile={() => setMobileOpen((o) => !o)} />

        <div className="flex min-h-0 flex-1">
          {/* Desktop rail */}
          <aside className="hidden w-[248px] flex-none border-r border-line bg-panel lg:block">
            {sidebar}
          </aside>

          {/* Mobile drawer + backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
            className={[
              'fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden',
              mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
            ].join(' ')}
          />
          <aside
            className={[
              'fixed left-0 top-0 z-[90] h-screen w-[260px] border-r border-line bg-panel transition-transform duration-200 lg:hidden',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            ].join(' ')}
            aria-label="Navigation drawer"
          >
            {sidebar}
          </aside>

          {/* Main content — full width: mission control uses the whole screen. */}
          <main className="v-scroll min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
