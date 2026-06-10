'use client';

import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';
import { fmtRel, fmtDateTime } from '@/lib/admin/format';
import type { AuditRow } from '@/lib/admin/data';

type Row = AuditRow & Record<string, unknown> & { detail: string };

/** Color audit actions by their nature so the eye can scan for risk. */
function actionTone(action: string): 'good' | 'warn' | 'bad' | 'accent' | 'default' {
  if (action === 'login') return 'good';
  if (action === 'email_sent') return 'accent';
  if (/fail|delete|wipe|purge|suspend/.test(action)) return 'bad';
  if (/grant|revoke|password|set_/.test(action)) return 'warn';
  return 'default';
}

export function AuditTable({ logs }: { logs: AuditRow[] }) {
  const rows: Row[] = logs.map((l) => ({
    ...l,
    detail:
      l.metadata && Object.keys(l.metadata as object).length > 0 ? JSON.stringify(l.metadata) : '',
  }));

  const t = useTableControls<Row>(rows, {
    searchKeys: ['actorEmail', 'targetEmail', 'detail', 'entityType'],
    facetKeys: ['action', 'actorType'],
    initialSort: { key: 'at', dir: 'desc' },
    pageSize: 50,
  });

  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Search actor, target, or detail…"
        total={t.total}
        facets={[
          { key: 'action', label: 'Action', options: t.facetOptions.action ?? [], value: t.facetValues.action ?? '', onChange: (v) => t.setFacet('action', v) },
          { key: 'actorType', label: 'Actor', options: t.facetOptions.actorType ?? [], value: t.facetValues.actorType ?? '', onChange: (v) => t.setFacet('actorType', v) },
        ]}
      />

      {t.total === 0 ? (
        <EmptyState>No audit entries match.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <SortTh label="When" sortKey="at" sort={t.sort} onToggle={t.toggleSort} />
              <SortTh label="Actor" sortKey="actorEmail" sort={t.sort} onToggle={t.toggleSort} />
              <SortTh label="Action" sortKey="action" sort={t.sort} onToggle={t.toggleSort} />
              <SortTh label="Target" sortKey="targetEmail" sort={t.sort} onToggle={t.toggleSort} />
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((l) => (
              <tr key={l.id}>
                <Td className="whitespace-nowrap text-muted">
                  <span title={fmtDateTime(l.at)}>{fmtRel(l.at)}</span>
                </Td>
                <Td className="whitespace-nowrap">
                  {l.actorEmail ?? l.actorType}
                  {l.actorType === 'admin' && (
                    <span className="ml-1.5 text-[10.5px] font-semibold uppercase text-accent">
                      admin
                    </span>
                  )}
                </Td>
                <Td><Badge tone={actionTone(l.action)}>{l.action}</Badge></Td>
                <Td className="whitespace-nowrap text-muted">{l.targetEmail ?? l.entityType ?? '—'}</Td>
                <Td className="max-w-[280px] text-muted">
                  <span className="break-words font-mono text-[11px]">{l.detail || '—'}</span>
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
