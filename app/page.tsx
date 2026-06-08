import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { requireUser, getProfile } from '@/lib/supabase/auth';
import { getAccountView } from '@/lib/supabase/account';

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
  await requireUser();

  const profile = await getProfile();
  if (!profile?.onboarded_at) {
    redirect('/onboarding');
  }

  const account = await getAccountView();

  // The branded splash plays once on login: the sign-in redirect lands here with
  // ?splash=1, which the dashboard consumes and strips from the URL on mount — so
  // it shows on login but never on internal navigation (`/`, used by the sidebar
  // links, is a different client-cache key with no splash).
  const showSplash = searchParams?.splash === '1';

  return <DashboardClient account={account ?? undefined} showSplashInitially={showSplash} />;
}
