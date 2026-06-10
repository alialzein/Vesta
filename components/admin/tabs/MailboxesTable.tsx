'use client';

import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';
import { MailboxRowActions } from '@/components/admin/tabs/MailboxRowActions';
import { ActionButton } from '@/components/admin/ActionButton';
import { adminRenewSubscription } from '@/app/(admin)/admin/actions';
import { fmtRel, fmtIn } from '@/lib/admin/format';
import type { MailboxRow } from '@/lib/admin/data';

const STALE_MS = 30 * 60_000;
const SUB_EXPIRING_MS = 12 * 60 * 60_000; // matches the renew cron's window

/** Graph webhook subscription state for the row's badge. */
function webhookState(expiresAt: string | null, now: number): 'none' | 'expired' | 'expiring' | 'active' {
  if (!expiresAt) return 'none';
  const t = new Date(expiresAt).getTime();
  if (!Number.isFinite(t) || t <= now) return 'expired';
  return t - now < SUB_EXPIRING_MS ? 'expiring' : 'active';
}

type Row = MailboxRow & Record<string, unknown> & { health: string; webhook: string };

export function MailboxesTable({ mailboxes }: { mailboxes: MailboxRow[] }) {
  const now = Date.now();
  const rows: Row[] = mailboxes.map((m) => ({
    ...m,
    health: m.lastError
      ? 'error'
      : !m.lastSyncAt || now - new Date(m.lastSyncAt).getTime() > STALE_MS
        ? 'stale'
        : 'healthy',
    webhook: webhookState(m.subscriptionExpiresAt, now),
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
          { key: 'webhook', label: 'Webhook', options: t.facetOptions.webhook ?? [], value: t.facetValues.webhook ?? '', onChange: (v) => t.setFacet('webhook', v) },
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
              <Th>Webhook</Th>
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
                <Td className="whitespace-nowrap">
                  <Badge
                    tone={
                      m.webhook === 'active'
                        ? 'good'
                        : m.webhook === 'expiring'
                          ? 'warn'
                          : m.webhook === 'expired'
                            ? 'bad'
                            : 'default'
                    }
                  >
                    {m.webhook}
                  </Badge>
                  {m.subscriptionExpiresAt && (
                    <span className="ml-2 text-[11px] text-muted">
                      expires {fmtIn(m.subscriptionExpiresAt)}
                    </span>
                  )}
                </Td>
                <Td className="max-w-[220px]">
                  {m.lastError ? (
                    <span className="break-words text-[12px] text-red">{m.lastError}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <ActionButton subtle run={() => adminRenewSubscription(m.id)}>
                      Renew webhook
                    </ActionButton>
                    <MailboxRowActions userId={m.userId} />
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
