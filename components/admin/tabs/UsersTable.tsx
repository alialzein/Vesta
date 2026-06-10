'use client';

import Link from 'next/link';
import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';
import { UserRowActions } from '@/components/admin/tabs/UserRowActions';
import { Icon } from '@/components/ui/Icon';
import { fmtInt, fmtRel, fmtDate } from '@/lib/admin/format';
import { avatarHue, initialsOf } from '@/lib/avatar';
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
    searchKeys: ['email', 'fullName', 'role', 'lastLoginFrom'],
    facetKeys: ['access', 'state', 'mailbox'],
    initialSort: { key: 'createdAt', dir: 'desc' },
  });

  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Search email, name, or location…"
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
              <Th>Status</Th>
              <Th>Mailbox</Th>
              <SortTh label="Mail" sortKey="messageCount" sort={t.sort} onToggle={t.toggleSort} align="right" />
              <SortTh label="Last sign-in" sortKey="lastSignInAt" sort={t.sort} onToggle={t.toggleSort} />
              <SortTh label="Joined" sortKey="createdAt" sort={t.sort} onToggle={t.toggleSort} />
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((u) => (
              <tr key={u.id} className="group transition-colors hover:bg-panel-2/60">
                {/* Identity: avatar + email/name, linked to the full history page. */}
                <Td>
                  <Link
                    href={`/admin/users/${u.id}`}
                    prefetch
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 flex-none place-items-center rounded-full text-[12.5px] font-bold text-white shadow-soft"
                      style={{
                        background: `linear-gradient(135deg, hsl(${avatarHue(u.id)} 65% 45%), hsl(${(avatarHue(u.id) + 40) % 360} 65% 35%))`,
                      }}
                    >
                      {initialsOf(u.fullName, u.email)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink underline-offset-2 group-hover:text-accent group-hover:underline">
                        {u.email ?? u.id}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {u.fullName ?? '—'}
                        {u.role && !u.isAdmin ? ` · ${u.role}` : ''}
                      </span>
                    </span>
                  </Link>
                </Td>

                {/* Access + account state in one tidy cell. */}
                <Td>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {u.isAdmin && <Badge tone="accent">admin</Badge>}
                    {u.suspended ? (
                      <Badge tone="bad">suspended</Badge>
                    ) : u.onboardedAt ? (
                      <Badge tone="good">active</Badge>
                    ) : (
                      <Badge tone="warn">onboarding</Badge>
                    )}
                  </span>
                </Td>

                <Td>
                  {u.connected ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
                      synced {fmtRel(u.lastSyncAt)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>

                <Td className="text-right text-muted">{fmtInt(u.messageCount)}</Td>

                {/* When + where the latest sign-in happened. */}
                <Td className="whitespace-nowrap">
                  <span className="block text-[12.5px] text-ink-soft">{fmtRel(u.lastSignInAt)}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    {u.lastLoginFrom && (
                      <Icon name="home" className="h-[10px] w-[10px]" aria-hidden="true" />
                    )}
                    {u.lastLoginFrom ?? 'location unknown'}
                  </span>
                </Td>

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
