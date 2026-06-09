import { requireAdmin } from '@/lib/admin/auth';
import { listUsers } from '@/lib/admin/data';
import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { UserRowActions } from '@/components/admin/tabs/UserRowActions';
import { fmtInt, fmtRel, fmtDate } from '@/lib/admin/format';

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
          Every account. Reset a password, grant/revoke admin, suspend, or hard-delete a user and
          all their data. Destructive actions require typed confirmation and are audit-logged.
        </p>
      </header>

      {users.length === 0 ? (
        <EmptyState>No users yet.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>State</Th>
              <Th>Mailbox</Th>
              <Th className="text-right">Mail</Th>
              <Th>Last sign-in</Th>
              <Th>Joined</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td className="whitespace-nowrap">
                  <div className="font-medium text-ink">{u.email ?? u.id}</div>
                  {u.fullName && <div className="text-[11.5px] text-muted">{u.fullName}</div>}
                </Td>
                <Td>{u.role === 'admin' ? <Badge tone="accent">admin</Badge> : <span className="text-muted">user</span>}</Td>
                <Td>
                  {u.suspended ? (
                    <Badge tone="bad">suspended</Badge>
                  ) : u.onboardedAt ? (
                    <Badge tone="good">active</Badge>
                  ) : (
                    <Badge tone="warn">onboarding</Badge>
                  )}
                </Td>
                <Td>
                  {u.connected ? (
                    <span className="text-[12px] text-ink">connected · {fmtRel(u.lastSyncAt)}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td className="text-right text-muted">{fmtInt(u.messageCount)}</Td>
                <Td className="whitespace-nowrap text-muted">{fmtRel(u.lastSignInAt)}</Td>
                <Td className="whitespace-nowrap text-muted">{fmtDate(u.createdAt)}</Td>
                <Td>
                  <UserRowActions
                    userId={u.id}
                    email={u.email}
                    role={u.role}
                    suspended={u.suspended}
                    isSelf={u.id === admin.id}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
