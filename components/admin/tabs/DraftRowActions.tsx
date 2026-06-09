'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import { adminDeleteDraft } from '@/app/(admin)/admin/actions';

export function DraftRowActions({ draftId }: { draftId: string }) {
  return (
    <ActionButton
      danger
      subtle
      confirm="Delete this draft? Nothing is ever sent — this just removes the stored draft."
      run={() => adminDeleteDraft(draftId)}
    >
      Delete
    </ActionButton>
  );
}
