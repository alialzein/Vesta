'use client';

import Link from 'next/link';
import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';
import { UserRowActions } from '@/components/admin/tabs/UserRowActions';
import { fmtInt, fmtRel, fmtDate } from '@/lib/admin/format';
import type { AdminUserRow } from '@/lib/admin/data';

/** Flattened row with the derived facet fields the filters work on. */
type Row = AdminUserRow & Record<string, unknown> & { access: string; state: string; mailbox: string };

export function UsersTable({ users, adminId }: { users: AdminUserRow[]; adminId: string }) {
  const rows: Row[] = users.map((u) => ({
    ...u,
    access: u.isAdmin ? 'admin' : 'user',
    state: u.suspended ? 'suspended' : u.onboardedAt ? 'active' : 'onboarding',
    mailbox: u.connected ? 'connected' : 'none',
  }));

  const t = useTableControls<Row>(rows, {
    searchKeys: ['email', 'fullName', 'role'],
    facetKeys: ['access', 'state', 'mailbox'],
    initialSort: { key: 'createdAt', dir: 'desc' },
  });

  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Search email or name…"
        total={t.total}
        facets={[
          { key: 'access', label: 'Access', options: t.facetOptions.access ?? [], value: t.facetValues.access ?? '', onChange: (v) => t.setFacet('access', v) },
          { key: 'state', label: 'State', options: t.facetOptions.state ?? [], value: t.facetValues.state ?? '', onChange: (v) => t.setFacet('state', v) },
          { key: 'mailbox', label: 'Mailbox', options: t.facetOptions.mailbox ?? [], value: t.facetValues.mailbox ?? '', onChange: (v) => t.setFacet('mailbox', v) },
        ]}
      />

      {t.total === 0 ? (
        <EmptyState>No users match.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <SortTh label="User" sortKey="email" sort={t.sort} onToggle={t.toggleSort} />
              <Th>Access</Th>
              <Th>State</Th>
              <Th>Mailbox</Th>
              <SortTh label="Mail" sortKey="messageCount" sort={t.sort} onToggle={t.toggleSort} align="right" />
              <SortTh label="Last sign-in" sortKey="lastSignInAt" sort={t.sort} onToggle={t.toggleSort} />
              <SortTh label="Joined" sortKey="createdAt" sort={t.sort} onToggle={t.toggleSort} />
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((u) => (
              <tr key={u.id}>
                <Td className="whitespace-nowrap">
                  <Link
                    href={`/admin/users/${u.id}`}
                    prefetch
                    className="font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                  >
                    {u.email ?? u.id}
                  </Link>
                  {u.fullName && <div className="text-[11.5px] text-muted">{u.fullName}</div>}
                </Td>
                <Td>
                  {u.isAdmin ? (
                    <Badge tone="accent">admin</Badge>
                  ) : (
                    <span className="text-muted">{u.role || 'user'}</span>
                  )}
                </Td>
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
                    isAdmin={u.isAdmin}
                    suspended={u.suspended}
                    isSelf={u.id === adminId}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Pager page={t.page} pageCount={t.pageCount} onPage={t.setPage} />
    </div>
  );
}
