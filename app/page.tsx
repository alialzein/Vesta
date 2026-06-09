import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { requireUser, getProfile } from '@/lib/supabase/auth';
import { getAccountView } from '@/lib/supabase/account';
import { getDashboardData } from '@/lib/dashboard/data';
import { getDraftCapabilities } from '@/lib/drafts/capabilities';

/**
 * Protected dashboard route (Phase 2).
 *
 * Requires an authenticated session (middleware also guards this, and
 * requireUser is the data-layer backstop). First-run users who have not
 * completed onboarding (`profiles.onboarded_at` is null) are sent to the
 * onboarding wizard (Phase 2c). The signed-in account is passed to the dashboard
 * for the greeting + profile; the rest of the dashboard still renders demo data
 * until later phases wire real Supabase queries.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { splash?: string; app?: string };
}) {
  const user = await requireUser();

  // Admins land on the operator console, not the manager dashboard. `?app=1` is the
  // escape hatch (the console's "Back to app" link) so an admin can still view the
  // manager app when they want. Checked before the dashboard queries run.
  const profile = await getProfile(user);
  if (profile?.role === 'admin' && searchParams?.app !== '1') {
    redirect('/admin');
  }
  if (!profile?.onboarded_at) {
    redirect('/onboarding');
  }

  // Run the remaining queries in parallel (the user is cache()-wrapped, so passing
  // it down avoids extra getUser round-trips).
  const [account, dashboard, capabilities] = await Promise.all([
    getAccountView(user),
    getDashboardData(),
    getDraftCapabilities(),
  ]);

  // The branded splash plays once on login: the sign-in redirect lands here with
  // ?splash=1, which the dashboard consumes and strips from the URL on mount — so
  // it shows on login but never on internal navigation (`/`, used by the sidebar
  // links, is a different client-cache key with no splash).
  const showSplash = searchParams?.splash === '1';

  return (
    <DashboardClient
      account={account ?? undefined}
      showSplashInitially={showSplash}
      workItems={dashboard.workItems}
      kpis={dashboard.kpis}
      brief={dashboard.brief}
      capabilities={capabilities}
    />
  );
}
