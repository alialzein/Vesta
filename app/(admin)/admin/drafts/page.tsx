import { requireAdmin } from '@/lib/admin/auth';
import { getDraftsOverview } from '@/lib/admin/data';
import { getAppSettings } from '@/lib/admin/settings';
import { Section, Table, Th, Td, KpiCard, Badge, EmptyState } from '@/components/admin/ui';
import { DraftRowActions } from '@/components/admin/tabs/DraftRowActions';
import { fmtInt, fmtRel } from '@/lib/admin/format';

function statusTone(s: string): 'good' | 'warn' | 'bad' | 'accent' | 'default' {
  if (s === 'sent') return 'good';
  if (s === 'error') return 'bad';
  if (s === 'approved') return 'accent';
  return 'default';
}

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

      <Section title="Recent drafts" hint="Newest first (last 40).">
        {overview.recent.length === 0 ? (
          <EmptyState>No drafts yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>User</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Model</Th>
                <Th>Error</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {overview.recent.map((d) => (
                <tr key={d.id}>
                  <Td className="whitespace-nowrap text-muted">{fmtRel(d.sentAt ?? d.createdAt)}</Td>
                  <Td className="whitespace-nowrap">{d.email ?? '—'}</Td>
                  <Td className="max-w-[260px]"><span className="break-words">{d.subject ?? '—'}</span></Td>
                  <Td><Badge tone={statusTone(d.status)}>{d.status}</Badge></Td>
                  <Td className="font-mono text-[12px] text-muted">{d.model ?? '—'}</Td>
                  <Td className="max-w-[200px]">
                    {d.error ? <span className="break-words text-[12px] text-red">{d.error}</span> : <span className="text-muted">—</span>}
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
      </Section>

      <p className="mt-2 text-[12px] text-muted">
        Change the send mode (global or per-user) from the <span className="font-semibold">AI Control Center</span> and
        Users tabs. Approve/Send itself stays in the manager app — the operator console never sends
        on a user&apos;s behalf.
      </p>
    </div>
  );
}
