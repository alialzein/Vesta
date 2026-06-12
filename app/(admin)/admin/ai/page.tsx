import { requireAdmin } from '@/lib/admin/auth';
import { getAppSettings, getConfiguredAiRates } from '@/lib/admin/settings';
import { getAiUsageSummary, type AiUsageSummary } from '@/lib/admin/data';
import { Section, Table, Th, Td, KpiCard, EmptyState, Badge } from '@/components/admin/ui';
import { AiSettings } from '@/components/admin/tabs/AiSettings';
import { ReanalyzeControls } from '@/components/admin/tabs/ReanalyzeControls';
import { fmtUsd, fmtInt, fmtRel } from '@/lib/admin/format';

export default async function AdminAiPage() {
  await requireAdmin();
  const [settings, usage, rates] = await Promise.all([
    getAppSettings(),
    getAiUsageSummary(),
    getConfiguredAiRates(),
  ]);

  const envProvider = (process.env.AI_PROVIDER ?? '').trim();
  const envModel = (process.env.AI_MODEL ?? '').trim();
  const keyConfigured = Boolean((process.env.AI_API_KEY ?? '').trim());
  const envRates =
    Number.isFinite(Number(process.env.AI_PRICE_INPUT)) &&
    Number.isFinite(Number(process.env.AI_PRICE_OUTPUT));
  const pricesMissing = !rates && !envRates;

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          AI Control Center
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Spend, budgets, model selection, and re-analysis. Every AI call lands in the usage
          ledger as it happens.
        </p>
      </header>

      {pricesMissing && (
        <div className="mb-5 rounded-[12px] border border-amber/50 bg-amber-soft/50 px-4 py-3 text-[13px] text-ink-soft">
          <span className="font-semibold text-amber">Costs show $0.00</span> because token prices
          aren&apos;t set. Tokens are tracked either way — set{' '}
          <span className="font-semibold">Price per 1M tokens (input/output)</span> under{' '}
          <span className="font-semibold">Model &amp; budgets</span> below and future calls get
          real dollar estimates.
        </div>
      )}

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Spend · today"
          value={fmtUsd(usage.costToday)}
          hint="estimated, from the ledger"
          tooltip="Estimated USD cost of today's AI calls: tokens × your price per 1M tokens. A 'call' is one request to the model (reading one email or writing one draft)."
        />
        <KpiCard
          label="Spend · month"
          value={fmtUsd(usage.costMonth)}
          hint={`${fmtInt(usage.callsMonth)} calls this calendar month`}
          tooltip="Estimated USD cost this calendar month. $0.00 with calls > 0 means token prices aren't set under Model & budgets."
        />
        <KpiCard
          label="Tokens · month"
          value={fmtInt(usage.tokensMonth)}
          hint="input + output"
          tooltip="Tokens are how models measure text (~¾ of a word each). Input = what we send (email + instructions); output = what the model writes back. You pay per token."
        />
        <KpiCard
          label="Analysis coverage"
          value={`${fmtInt(usage.analysis.analyzed)}/${fmtInt(usage.analysis.total)}`}
          hint={`${fmtInt(usage.analysis.never)} never analyzed`}
          tone={usage.analysis.never > 0 ? 'warn' : 'good'}
          tooltip="Of all open work items, how many the AI has analyzed (summary/priority/next action). 'Never analyzed' items wait for the next sync or hit the daily cap."
        />
      </div>

      <Section
        title="Model & budgets"
        hint="Overrides env when set. Keys stay in env/Vercel."
        action={<ReanalyzeControls />}
      >
        <AiSettings settings={settings} envProvider={envProvider} envModel={envModel} keyConfigured={keyConfigured} />
      </Section>

      <Section
        title="Daily activity"
        hint="Last 14 days — tokens per day; hover a bar for calls and cost."
      >
        {usage.days.every((d) => d.calls === 0) ? (
          <EmptyState>No AI calls in the last 14 days.</EmptyState>
        ) : (
          <DailyBars days={usage.days} />
        )}
      </Section>

      <Section
        title="What's consuming"
        hint="This month, by call KIND — the same feature can hide very different costs (a briefing search is ~30× a briefing rank)."
      >
        {usage.byKind.length === 0 ? (
          <EmptyState>No AI usage recorded yet this month.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Kind</Th>
                <Th className="text-right">Calls</Th>
                <Th className="text-right">Tokens in / out</Th>
                <Th className="text-right">Avg / call</Th>
                <Th className="text-right">Max call</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Errors</Th>
              </tr>
            </thead>
            <tbody>
              {usage.byKind.map((k) => (
                <tr key={k.kind}>
                  <Td><Badge tone="accent">{k.kind}</Badge></Td>
                  <Td className="text-right">{fmtInt(k.calls)}</Td>
                  <Td className="text-right text-muted">
                    {fmtInt(k.tokensIn)} / {fmtInt(k.tokensOut)}
                  </Td>
                  <Td className="text-right">{fmtInt(k.avgTokens)}</Td>
                  <Td className="text-right">
                    <span className={k.maxTokens >= 10_000 ? 'font-semibold text-amber' : ''}>
                      {fmtInt(k.maxTokens)}
                    </span>
                  </Td>
                  <Td className="text-right">{fmtUsd(k.cost)}</Td>
                  <Td className="text-right">
                    {k.errors > 0 ? <span className="font-semibold text-red">{k.errors}</span> : <span className="text-muted">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Heaviest calls" hint="The biggest single calls this month — your optimization targets.">
        {usage.heaviest.length === 0 ? (
          <EmptyState>Nothing heavy yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Kind</Th>
                <Th>User</Th>
                <Th className="text-right">Tokens in / out</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </thead>
            <tbody>
              {usage.heaviest.map((h, i) => (
                <tr key={i}>
                  <Td className="whitespace-nowrap text-muted">{fmtRel(h.at)}</Td>
                  <Td><Badge tone="accent">{h.kind}</Badge></Td>
                  <Td className="text-muted">{h.who ?? '—'}</Td>
                  <Td className="text-right">
                    {fmtInt(h.tokensIn)} / {fmtInt(h.tokensOut)}
                  </Td>
                  <Td className="text-right">{fmtUsd(h.cost)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Spend by feature" hint="This calendar month.">
        {usage.byFeature.length === 0 ? (
          <EmptyState>No AI usage recorded yet this month.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Feature</Th>
                <Th className="text-right">Calls</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </thead>
            <tbody>
              {usage.byFeature.map((f) => (
                <tr key={f.feature}>
                  <Td><Badge tone="accent">{f.feature}</Badge></Td>
                  <Td className="text-right">{fmtInt(f.calls)}</Td>
                  <Td className="text-right text-muted">{fmtInt(f.tokens)}</Td>
                  <Td className="text-right">{fmtUsd(f.cost)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Spend by user" hint="This calendar month.">
        {usage.byUser.length === 0 ? (
          <EmptyState>No per-user usage yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th className="text-right">Calls</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </thead>
            <tbody>
              {usage.byUser.map((u) => (
                <tr key={u.userId}>
                  <Td className="whitespace-nowrap">{u.email ?? u.userId}</Td>
                  <Td className="text-right">{fmtInt(u.calls)}</Td>
                  <Td className="text-right text-muted">{fmtInt(u.tokens)}</Td>
                  <Td className="text-right">{fmtUsd(u.cost)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Recent AI calls" hint="Newest first.">
        {usage.recent.length === 0 ? (
          <EmptyState>The ledger is empty. It fills as analysis, drafts, and reply-intent run.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Kind</Th>
                <Th>User</Th>
                <Th>Model</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Cost</Th>
                <Th>Error</Th>
              </tr>
            </thead>
            <tbody>
              {usage.recent.map((r, i) => (
                <tr key={i}>
                  <Td className="whitespace-nowrap text-muted">{fmtRel(r.at)}</Td>
                  <Td>{r.kind}</Td>
                  <Td className="max-w-[180px] truncate text-muted">{r.who ?? '—'}</Td>
                  <Td className="font-mono text-[12px] text-muted">{r.model ?? '—'}</Td>
                  <Td className="text-right">{fmtInt(r.tokens)}</Td>
                  <Td className="text-right">{r.cost === null ? '—' : fmtUsd(r.cost)}</Td>
                  <Td className="max-w-[200px]">
                    {r.error ? <span className="break-words text-[12px] text-red">{r.error}</span> : <span className="text-muted">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </div>
  );
}

/** 14-day token bars — pure CSS, theme tokens; error days get a red dot. */
function DailyBars({ days }: { days: AiUsageSummary['days'] }) {
  const max = Math.max(1, ...days.map((d) => d.tokens));
  return (
    <div className="rounded-[12px] border border-line bg-panel p-4">
      <div className="flex h-[120px] items-end gap-[6px]">
        {days.map((d) => (
          <div
            key={d.date}
            className="group relative flex h-full flex-1 flex-col items-center justify-end"
            title={`${d.date} — ${fmtInt(d.calls)} calls, ${fmtInt(d.tokens)} tokens, ${fmtUsd(d.cost)}${d.errors > 0 ? `, ${d.errors} errors` : ''}`}
          >
            <div
              className={[
                'w-full max-w-[34px] rounded-t-[5px] transition group-hover:brightness-110',
                d.tokens > 0 ? 'bg-gradient-to-t from-accent to-accent-2' : 'h-[2px] bg-line',
              ].join(' ')}
              style={d.tokens > 0 ? { height: `${Math.max(4, (d.tokens / max) * 100)}%` } : undefined}
            />
            {d.errors > 0 && (
              <span className="absolute -top-[2px] h-[6px] w-[6px] rounded-full bg-red" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        <span>{days[0]?.date.slice(5)}</span>
        <span>{days[Math.floor(days.length / 2)]?.date.slice(5)}</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
