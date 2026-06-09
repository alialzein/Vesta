'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import {
  adminResetPassword,
  adminSuspendUser,
  adminSetRole,
  adminDeleteUser,
} from '@/app/(admin)/admin/actions';

export function UserRowActions({
  userId,
  email,
  role,
  suspended,
  isSelf,
}: {
  userId: string;
  email: string | null;
  role: string | null;
  suspended: boolean;
  isSelf: boolean;
}) {
  const isAdmin = role === 'admin';
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <ActionButton
        subtle
        confirm={`Send a password-reset email to ${email ?? 'this user'}?`}
        run={() => adminResetPassword(userId)}
      >
        Reset password
      </ActionButton>

      <ActionButton
        subtle
        confirm={
          isAdmin
            ? 'Revoke operator-console (admin) access from this user?'
            : 'Grant operator-console (admin) access to this user?'
        }
        run={() => adminSetRole(userId, isAdmin ? 'user' : 'admin')}
      >
        {isAdmin ? 'Revoke admin' : 'Make admin'}
      </ActionButton>

      {!isSelf && (
        <ActionButton
          danger
          subtle
          confirm={
            suspended
              ? 'Re-enable this account so the user can use Vesta again?'
              : 'Suspend this account? The user will be blocked from the app.'
          }
          run={() => adminSuspendUser(userId, !suspended)}
        >
          {suspended ? 'Re-enable' : 'Suspend'}
        </ActionButton>
      )}

      {!isSelf && (
        <ActionButton
          danger
          confirmWord={email ?? userId}
          confirm={`Permanently delete ${
            email ?? 'this user'
          } and ALL their data (profile, mail, work items, drafts). This cannot be undone.`}
          run={() => adminDeleteUser(userId)}
        >
          Delete
        </ActionButton>
      )}
    </div>
  );
}
