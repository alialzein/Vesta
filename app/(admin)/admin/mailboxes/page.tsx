import { requireAdmin } from '@/lib/admin/auth';
import { listMailboxes } from '@/lib/admin/data';
import { EmptyState } from '@/components/admin/ui';
import { MailboxesTable } from '@/components/admin/tabs/MailboxesTable';

export default async function AdminMailboxesPage() {
  await requireAdmin();
  const rows = await listMailboxes();

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
        <MailboxesTable mailboxes={rows} />
      )}

      <p className="mt-4 text-[12px] text-muted">
        Webhook subscriptions renew on a ~3-day cycle via the cron; a sustained “stale” column
        across all users points at the cron or <span className="font-mono">MS_GRAPH_WEBHOOK_URL</span>.
        Subscription renew/health detail lands with the Wave 2 webhook view.
      </p>
    </div>
  );
}
