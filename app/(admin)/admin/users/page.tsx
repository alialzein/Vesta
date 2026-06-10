import { requireAdmin } from '@/lib/admin/auth';
import { listUsers } from '@/lib/admin/data';
import { UsersTable } from '@/components/admin/tabs/UsersTable';

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await listUsers();

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Users &amp; Accounts
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Every account — click a user for their full history. Reset or set a password,
          grant/revoke admin, suspend, or hard-delete a user and all their data. Destructive
          actions require typed confirmation and are audit-logged.
        </p>
      </header>

      <UsersTable users={users} adminId={admin.id} />
    </div>
  );
}
