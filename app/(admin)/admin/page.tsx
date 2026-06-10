import { requireAdmin } from '@/lib/admin/auth';
import { getHealthOverview } from '@/lib/admin/data';
import { KpiCard, Section, Panel, Badge, EmptyState } from '@/components/admin/ui';
import { fmtUsd, fmtInt, fmtRel } from '@/lib/admin/format';

export default async function AdminOverviewPage() {
  await requireAdmin();
  const h = await getHealthOverview();

  const syncTone = h.sync.errored > 0 ? 'bad' : h.sync.stale > 0 ? 'warn' : 'good';
  const queueTone = h.webhooks.pending > 50 ? 'warn' : 'default';

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Overview
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          System pulse across all users — sync, queue, errors, and AI spend.
        </p>
      </header>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Users"
          value={fmtInt(h.users.total)}
          hint={`${h.users.connected} connected · ${h.users.admins} admin · ${h.users.suspended} suspended`}
        />
        <KpiCard
          label="Active mailboxes"
          value={fmtInt(h.sync.mailboxes)}
          hint={`last sync ${fmtRel(h.sync.lastSuccessAt)}`}
          tone={syncTone}
        />
        <KpiCard label="AI spend · today" value={fmtUsd(h.ai.costToday)} hint={`${fmtInt(h.ai.callsToday)} calls · ${fmtInt(h.ai.tokensToday)} tokens`} />
        <KpiCard label="AI spend · month" value={fmtUsd(h.ai.costMonth)} hint="this calendar month — terms explained in AI Control Center" />
      </div>

      <Section title="Sync & queue health" hint="Cron/webhook pipeline status.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Stale mailboxes" value={fmtInt(h.sync.stale)} hint=">30m since last sync" tone={h.sync.stale > 0 ? 'warn' : 'good'} />
          <KpiCard label="Sync errors" value={fmtInt(h.sync.errored)} tone={h.sync.errored > 0 ? 'bad' : 'good'} />
          <KpiCard label="Webhook queue" value={fmtInt(h.webhooks.pending)} hint="pending events" tone={queueTone} />
          <KpiCard label="Webhook errors" value={fmtInt(h.webhooks.errored)} tone={h.webhooks.errored > 0 ? 'bad' : 'good'} />
        </div>
      </Section>

      <Section title="Recent errors" hint="Most recent sync, webhook, and AI failures.">
        {h.errors.length === 0 ? (
          <EmptyState>No recent errors. 🎉</EmptyState>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-line/60">
              {h.errors.map((e, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <Badge tone={e.source === 'ai' ? 'accent' : 'bad'}>{e.source}</Badge>
                  <span className="min-w-0 flex-1 break-words text-[12.5px] text-ink-soft">
                    {e.message}
                  </span>
                  <span className="flex-none text-[11.5px] text-muted">{fmtRel(e.at)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Section>
    </div>
  );
}
