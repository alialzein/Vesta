import { requireUser } from '@/lib/supabase/auth';
import { getAccountView } from '@/lib/supabase/account';
import { getNavCounts } from '@/lib/dashboard/nav-counts';
import { AppShell } from '@/components/app/AppShell';
import { AutoSync } from '@/components/sync/AutoSync';

/**
 * Shared frame for all routed app pages — the persistent sidebar + topbar
 * (AppShell). Because it's a layout, it stays mounted across navigations:
 * clicking a sidebar link swaps only the content column (each page's
 * loading.tsx skeleton), so navigation never blanks the frame.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Validate once, then run the frame queries in parallel (perf rule).
  const [account, counts] = await Promise.all([getAccountView(user), getNavCounts()]);

  return (
    <AppShell account={account ?? undefined} counts={counts}>
      {/* Background auto-sync — keeps mail fresh on every shell page. */}
      <AutoSync />
      {children}
    </AppShell>
  );
}
