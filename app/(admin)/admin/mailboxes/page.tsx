import { requireAdmin } from '@/lib/admin/auth';
import { listMailboxes } from '@/lib/admin/data';
import { Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { MailboxRowActions } from '@/components/admin/tabs/MailboxRowActions';
import { fmtRel } from '@/lib/admin/format';

const STALE_MS = 30 * 60_000;

export default async function AdminMailboxesPage() {
  await requireAdmin();
  const rows = await listMailboxes();
  const now = Date.now();

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Mailboxes &amp; Sync
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Every connected mailbox, its delta-sync health, and per-user sync controls. A failed or
          stale row usually means tokens expired or the cron stopped.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState>No mailboxes connected yet.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Mailbox</Th>
              <Th>Status</Th>
              <Th>Last sync</Th>
              <Th>Error</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const stale = !m.lastSyncAt || now - new Date(m.lastSyncAt).getTime() > STALE_MS;
              const active = m.status === 'active' && m.integrationStatus !== 'error';
              return (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap">{m.email ?? '—'}</Td>
                  <Td className="whitespace-nowrap text-muted">{m.mailboxEmail ?? '—'}</Td>
                  <Td>
                    <Badge tone={active ? 'good' : 'bad'}>{m.status}</Badge>
                    {m.triageMode && <span className="ml-2 text-[11px] text-muted">{m.triageMode}</span>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className={stale ? 'text-amber' : 'text-ink'}>{fmtRel(m.lastSyncAt)}</span>
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
              );
            })}
          </tbody>
        </Table>
      )}

      <p className="mt-4 text-[12px] text-muted">
        Webhook subscriptions renew on a ~3-day cycle via the cron; a sustained “stale” column
        across all users points at the cron or <span className="font-mono">MS_GRAPH_WEBHOOK_URL</span>.
        Subscription renew/health detail lands with the Wave 2 webhook view.
      </p>
    </div>
  );
}
