import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { requireUser } from '@/lib/supabase/auth';
import { getAccountView } from '@/lib/supabase/account';

/**
 * Protected dashboard route (Phase 2).
 *
 * Requires an authenticated session (middleware also guards this, and
 * requireUser is the data-layer backstop). The signed-in account is passed to
 * the dashboard for the greeting + profile; the rest of the dashboard still
 * renders demo data until later phases wire real Supabase queries.
 */
export default async function DashboardPage() {
  await requireUser();
  const account = await getAccountView();

  return <DashboardClient account={account ?? undefined} />;
}
