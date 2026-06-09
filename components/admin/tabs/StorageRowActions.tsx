'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import { adminWipeUserMail } from '@/app/(admin)/admin/actions';

export function StorageRowActions({ userId, email }: { userId: string; email: string | null }) {
  return (
    <ActionButton
      danger
      subtle
      confirmWord={email ?? userId}
      confirm={`This permanently deletes ALL synced mail, threads, and email work items for ${
        email ?? 'this user'
      }. The Outlook connection stays, so a future sync re-imports from the scan-back window.`}
      run={() => adminWipeUserMail(userId)}
    >
      Wipe mail
    </ActionButton>
  );
}
