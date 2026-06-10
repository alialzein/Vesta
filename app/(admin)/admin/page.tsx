import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { getHealthOverview } from '@/lib/admin/data';
import { KpiCard, Section, Panel, Badge, EmptyState } from '@/components/admin/ui';
import { fmtUsd, fmtInt, fmtRel } from '@/lib/admin/format';

/** The Overview AI date ranges. Default = this calendar month. */
const RANGES = {
  today: { label: 'Today' },
  '7d': { label: '7 days' },
  month: { label: 'This month' },
  '30d': { label: '30 days' },
} as const;
type RangeKey = keyof typeof RANGES;

function rangeStartIso(range: RangeKey): string {
  const d = new Date();
  if (range === 'today') {
    d.setUTCHours(0, 0, 0, 0);
  } else if (range === '7d') {
    d.setUTCDate(d.getUTCDate() - 7);
  } else if (range === '30d') {
    d.setUTCDate(d.getUTCDate() - 30);
  } else {
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  await requireAdmin();
  const range: RangeKey = (searchParams.range as RangeKey) in RANGES
    ? (searchParams.range as RangeKey)
    : 'month';
  const h = await getHealthOverview(rangeStartIso(range));

  const syncTone = h.sync.errored > 0 ? 'bad' : h.sync.stale > 0 ? 'warn' : 'good';
  const queueTone = h.webhooks.pending > 50 ? 'warn' : 'default';
  const rangeLabel = RANGES[range].label.toLowerCase();

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
            Overview
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            System pulse across all users — sync, queue, errors, and AI spend.
          </p>
        </div>

        {/* AI usage date-range filter (server-rendered pills). */}
        <nav
          aria-label="AI usage date range"
          className="ml-auto inline-flex rounded-[11px] border border-line bg-panel p-1"
        >
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <Link
              key={key}
              href={key === 'month' ? '/admin' : `/admin?range=${key}`}
              prefetch
              className={[
                'rounded-[8px] px-3 py-[6px] text-[12.5px] font-semibold transition',
                key === range
                  ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow-soft'
                  : 'text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {RANGES[key].label}
            </Link>
          ))}
        </nav>
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
        <KpiCard
          label={`AI spend · ${rangeLabel}`}
          value={fmtUsd(h.ai.cost)}
          hint="estimated from the usage ledger"
          tooltip="Estimated USD for the selected range: tokens × the prices set in AI Control Center → Model & budgets."
        />
        <KpiCard
          label={`AI usage · ${rangeLabel}`}
          value={fmtInt(h.ai.calls)}
          hint={`calls · ${fmtInt(h.ai.tokens)} tokens`}
          tooltip="Calls = requests to the AI model in the selected range. Tokens = input + output text the calls consumed."
        />
      </div>

      <Section title="Sync & queue health" hint="Cron/webhook pipeline status (live, not range-filtered).">
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
