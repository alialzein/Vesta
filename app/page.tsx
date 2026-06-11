import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { requireUser, getProfile } from '@/lib/supabase/auth';
import { isAdminUser } from '@/lib/admin/auth';
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
  searchParams: { splash?: string };
}) {
  const user = await requireUser();

  // Admins are operators, not app users — they live only in /admin (the
  // middleware also enforces this on every app route; this is the data-layer
  // backstop). Gated on the `app_metadata.is_admin` auth claim (NOT
  // profiles.role — that's the job title, set by onboarding).
  if (isAdminUser(user)) {
    redirect('/admin');
  }

  // Validate the user once (requireUser/middleware are the security checkpoints),
  // then run the profile + account queries in parallel instead of sequentially.
  const [profile, account, dashboard, capabilities] = await Promise.all([
    getProfile(user),
    getAccountView(user),
    getDashboardData(),
    getDraftCapabilities(),
  ]);
  if (!profile?.onboarded_at) {
    redirect('/onboarding');
  }

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
      memories={dashboard.memories}
      capabilities={capabilities}
    />
  );
}
