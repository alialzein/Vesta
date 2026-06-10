'use client';

import { Table, Th, Td, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';
import { StorageRowActions } from '@/components/admin/tabs/StorageRowActions';
import { fmtInt, fmtDate } from '@/lib/admin/format';
import type { StorageRow } from '@/lib/admin/data';

type Row = StorageRow & Record<string, unknown>;

export function StorageTable({ rows: input }: { rows: StorageRow[] }) {
  const t = useTableControls<Row>(input as Row[], {
    searchKeys: ['email'],
    initialSort: { key: 'total', dir: 'desc' },
  });

  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Search user email…"
        total={t.total}
      />

      {t.total === 0 ? (
        <EmptyState>No mail stored matches.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <SortTh label="User" sortKey="email" sort={t.sort} onToggle={t.toggleSort} />
              <SortTh label="Total" sortKey="total" sort={t.sort} onToggle={t.toggleSort} align="right" />
              <SortTh label="Hidden" sortKey="hidden" sort={t.sort} onToggle={t.toggleSort} align="right" />
              <SortTh label="Soft-deleted" sortKey="softDeleted" sort={t.sort} onToggle={t.toggleSort} align="right" />
              <SortTh label="Oldest" sortKey="oldest" sort={t.sort} onToggle={t.toggleSort} />
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.userId}>
                <Td className="whitespace-nowrap">{r.email ?? r.userId}</Td>
                <Td className="text-right">{fmtInt(r.total)}</Td>
                <Td className="text-right text-muted">{fmtInt(r.hidden)}</Td>
                <Td className="text-right text-muted">{fmtInt(r.softDeleted)}</Td>
                <Td className="whitespace-nowrap text-muted">{fmtDate(r.oldest)}</Td>
                <Td>
                  <div className="flex justify-end">
                    <StorageRowActions userId={r.userId} email={r.email} />
                  </div>
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
