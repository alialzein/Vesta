import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/auth';
import { getProfile } from '@/lib/supabase/auth';
import { getAccountView } from '@/lib/supabase/account';
import { OnboardingWizard } from './OnboardingWizard';

/**
 * First-run onboarding route (protected). Shown once, when the user has not
 * completed onboarding (`profiles.onboarded_at` is null). If they already
 * onboarded, send them to the dashboard.
 */
export default async function OnboardingPage() {
  await requireUser();
  const profile = await getProfile();
  if (profile?.onboarded_at) {
    redirect('/');
  }

  const account = await getAccountView();
  return <OnboardingWizard firstName={account?.firstName ?? 'there'} />;
}
