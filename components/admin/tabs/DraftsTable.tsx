'use client';

import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';
import { DraftRowActions } from '@/components/admin/tabs/DraftRowActions';
import { fmtRel } from '@/lib/admin/format';
import type { DraftRow } from '@/lib/admin/data';

function statusTone(s: string): 'good' | 'warn' | 'bad' | 'accent' | 'default' {
  if (s === 'sent') return 'good';
  if (s === 'error' || s === 'failed') return 'bad';
  if (s === 'approved') return 'accent';
  return 'default';
}

type Row = DraftRow & Record<string, unknown> & { when: string };

export function DraftsTable({ drafts }: { drafts: DraftRow[] }) {
  const rows: Row[] = drafts.map((d) => ({ ...d, when: d.sentAt ?? d.createdAt }));

  const t = useTableControls<Row>(rows, {
    searchKeys: ['email', 'subject', 'error', 'model'],
    facetKeys: ['status', 'model'],
    initialSort: { key: 'when', dir: 'desc' },
  });

  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Search user, subject, or error…"
        total={t.total}
        facets={[
          { key: 'status', label: 'Status', options: t.facetOptions.status ?? [], value: t.facetValues.status ?? '', onChange: (v) => t.setFacet('status', v) },
          { key: 'model', label: 'Model', options: t.facetOptions.model ?? [], value: t.facetValues.model ?? '', onChange: (v) => t.setFacet('model', v) },
        ]}
      />

      {t.total === 0 ? (
        <EmptyState>No drafts match.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <SortTh label="When" sortKey="when" sort={t.sort} onToggle={t.toggleSort} />
              <SortTh label="User" sortKey="email" sort={t.sort} onToggle={t.toggleSort} />
              <Th>Subject</Th>
              <SortTh label="Status" sortKey="status" sort={t.sort} onToggle={t.toggleSort} />
              <Th>Model</Th>
              <Th>Error</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((d) => (
              <tr key={d.id}>
                <Td className="whitespace-nowrap text-muted">{fmtRel(d.when)}</Td>
                <Td className="whitespace-nowrap">{d.email ?? '—'}</Td>
                <Td className="max-w-[260px]"><span className="break-words">{d.subject ?? '—'}</span></Td>
                <Td><Badge tone={statusTone(d.status)}>{d.status}</Badge></Td>
                <Td className="font-mono text-[12px] text-muted">{d.model ?? '—'}</Td>
                <Td className="max-w-[200px]">
                  {d.error ? (
                    <span className="break-words text-[12px] text-red">{d.error}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <DraftRowActions draftId={d.id} />
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
