'use client';

import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';
import { MailboxRowActions } from '@/components/admin/tabs/MailboxRowActions';
import { fmtRel } from '@/lib/admin/format';
import type { MailboxRow } from '@/lib/admin/data';

const STALE_MS = 30 * 60_000;

type Row = MailboxRow & Record<string, unknown> & { health: string };

export function MailboxesTable({ mailboxes }: { mailboxes: MailboxRow[] }) {
  const now = Date.now();
  const rows: Row[] = mailboxes.map((m) => ({
    ...m,
    health: m.lastError
      ? 'error'
      : !m.lastSyncAt || now - new Date(m.lastSyncAt).getTime() > STALE_MS
        ? 'stale'
        : 'healthy',
  }));

  const t = useTableControls<Row>(rows, {
    searchKeys: ['email', 'mailboxEmail', 'lastError'],
    facetKeys: ['health', 'status', 'triageMode'],
    initialSort: { key: 'lastSyncAt', dir: 'desc' },
  });

  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Search user or mailbox…"
        total={t.total}
        facets={[
          { key: 'health', label: 'Health', options: t.facetOptions.health ?? [], value: t.facetValues.health ?? '', onChange: (v) => t.setFacet('health', v) },
          { key: 'status', label: 'Status', options: t.facetOptions.status ?? [], value: t.facetValues.status ?? '', onChange: (v) => t.setFacet('status', v) },
          { key: 'triageMode', label: 'Watch mode', options: t.facetOptions.triageMode ?? [], value: t.facetValues.triageMode ?? '', onChange: (v) => t.setFacet('triageMode', v) },
        ]}
      />

      {t.total === 0 ? (
        <EmptyState>No mailboxes match.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <SortTh label="User" sortKey="email" sort={t.sort} onToggle={t.toggleSort} />
              <Th>Mailbox</Th>
              <Th>Status</Th>
              <SortTh label="Last sync" sortKey="lastSyncAt" sort={t.sort} onToggle={t.toggleSort} />
              <Th>Error</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((m) => (
              <tr key={m.id}>
                <Td className="whitespace-nowrap">{m.email ?? '—'}</Td>
                <Td className="whitespace-nowrap text-muted">{m.mailboxEmail ?? '—'}</Td>
                <Td>
                  <Badge tone={m.health === 'healthy' ? 'good' : m.health === 'stale' ? 'warn' : 'bad'}>
                    {m.health}
                  </Badge>
                  {m.triageMode && <span className="ml-2 text-[11px] text-muted">{m.triageMode}</span>}
                </Td>
                <Td className="whitespace-nowrap">
                  <span className={m.health === 'stale' ? 'text-amber' : 'text-ink'}>
                    {fmtRel(m.lastSyncAt)}
                  </span>
                </Td>
                <Td className="max-w-[260px]">
                  {m.lastError ? (
                    <span className="break-words text-[12px] text-red">{m.lastError}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td>
                  <MailboxRowActions userId={m.userId} />
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
