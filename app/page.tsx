import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
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
export default async function DashboardPage() {
  await requireUser();

  const profile = await getProfile();
  if (!profile?.onboarded_at) {
    redirect('/onboarding');
  }

  const account = await getAccountView();

  // The splash plays once per login: the auth flow sets `vesta_show_splash` on
  // sign-in and the dashboard clears it when the splash finishes. So it always
  // shows on login but never when navigating between pages afterwards.
  const showSplash = cookies().get('vesta_show_splash')?.value === '1';

  return <DashboardClient account={account ?? undefined} showSplashInitially={showSplash} />;
}
