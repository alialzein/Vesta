'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import { adminRetriggerOnboarding } from '@/app/(admin)/admin/actions';

/** Send the user back through the first-run onboarding wizard on next visit. */
export function RetriggerOnboardingButton({ userId }: { userId: string }) {
  return (
    <ActionButton
      subtle
      confirm="Send this user back through the first-run onboarding wizard on their next visit? Their existing data and settings are untouched."
      run={() => adminRetriggerOnboarding(userId)}
    >
      Re-trigger onboarding
    </ActionButton>
  );
}
