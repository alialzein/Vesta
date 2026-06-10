import { requireAdmin } from '@/lib/admin/auth';
import { getDraftsOverview } from '@/lib/admin/data';
import { getAppSettings } from '@/lib/admin/settings';
import { Section, KpiCard, EmptyState } from '@/components/admin/ui';
import { DraftsTable } from '@/components/admin/tabs/DraftsTable';
import { fmtInt } from '@/lib/admin/format';

export default async function AdminDraftsPage() {
  await requireAdmin();
  const [overview, settings] = await Promise.all([getDraftsOverview(), getAppSettings()]);
  const sendMode = settings.draft_send_mode ?? process.env.DRAFT_SEND_MODE ?? 'graph';

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Drafts &amp; Sending
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Oversight of AI-generated reply drafts. Nothing is ever auto-sent — users approve every
          send. Watch failed sends here.
        </p>
      </header>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Sent" value={fmtInt(overview.sent)} tone="good" />
        <KpiCard label="Pending / drafts" value={fmtInt(overview.pending)} />
        <KpiCard label="Errored" value={fmtInt(overview.errored)} tone={overview.errored > 0 ? 'bad' : 'good'} />
        <KpiCard label="Send mode" value={<span className="text-[18px]">{sendMode}</span>} hint="graph = send via Outlook; draft_only = build a draft" />
      </div>

      <Section title="Drafts" hint="Last 500 — search by user/subject, filter by status, sort any column.">
        {overview.recent.length === 0 ? (
          <EmptyState>No drafts yet.</EmptyState>
        ) : (
          <DraftsTable drafts={overview.recent} />
        )}
      </Section>

      <p className="mt-2 text-[12px] text-muted">
        Change the send mode (global or per-user) from the <span className="font-semibold">AI Control Center</span> and
        Users tabs. Approve/Send itself stays in the manager app — the operator console never sends
        on a user&apos;s behalf.
      </p>
    </div>
  );
}
