'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import { adminForceSync, adminReprocess } from '@/app/(admin)/admin/actions';

export function MailboxRowActions({ userId }: { userId: string }) {
  return (
    <div className="flex justify-end gap-2">
      <ActionButton run={() => adminForceSync(userId)}>Force sync</ActionButton>
      <ActionButton subtle run={() => adminReprocess(userId)}>
        Re-process
      </ActionButton>
    </div>
  );
}
