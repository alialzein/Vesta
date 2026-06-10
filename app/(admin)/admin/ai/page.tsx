import { requireAdmin } from '@/lib/admin/auth';
import { getAppSettings, getConfiguredAiRates } from '@/lib/admin/settings';
import { getAiUsageSummary } from '@/lib/admin/data';
import { Section, Table, Th, Td, KpiCard, EmptyState, Badge, Panel } from '@/components/admin/ui';
import { AiSettings } from '@/components/admin/tabs/AiSettings';
import { ReanalyzeControls } from '@/components/admin/tabs/ReanalyzeControls';
import { fmtUsd, fmtInt, fmtRel } from '@/lib/admin/format';

/** Plain-language definitions for every number on this page. */
const GLOSSARY: { term: string; meaning: string }[] = [
  {
    term: 'Call',
    meaning:
      'One request to the AI model. Reading one email = one call; writing one draft = one call.',
  },
  {
    term: 'Tokens',
    meaning:
      'How models measure text — roughly ¾ of a word each. Every call has input tokens (what we send: the email + instructions) and output tokens (what the model writes back). You pay per token, which is why long emails are trimmed before sending.',
  },
  {
    term: 'Spend · today / month',
    meaning:
      'Estimated USD cost of all calls (tokens × your configured price per 1M tokens). "Month" is the current calendar month. $0.00 with calls > 0 means token prices are not set below.',
  },
  {
    term: 'Analysis coverage',
    meaning:
      'Of all open work items, how many the AI has analyzed (summary/priority/next action). "Never analyzed" items are waiting for the next sync or exceeded the daily cap.',
  },
  {
    term: 'Feature',
    meaning:
      'Which part of Vesta made the call — analysis (reading waiting-on-you threads), draft (writing replies), reply_intent (checking if your reply expects an answer), capture (the ✨ quick-add task parser).',
  },
  {
    term: 'Caps & budgets',
    meaning:
      'Max per run / per day bound how many items are analyzed per sync and per user per day, so spend stays predictable even on a flooded mailbox.',
  },
];

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
        <KpiCard label="Spend · today" value={fmtUsd(usage.costToday)} hint="estimated, from the ledger" />
        <KpiCard label="Spend · month" value={fmtUsd(usage.costMonth)} hint={`${fmtInt(usage.callsMonth)} calls this calendar month`} />
        <KpiCard label="Tokens · month" value={fmtInt(usage.tokensMonth)} hint="input + output" />
        <KpiCard
          label="Analysis coverage"
          value={`${fmtInt(usage.analysis.analyzed)}/${fmtInt(usage.analysis.total)}`}
          hint={`${fmtInt(usage.analysis.never)} never analyzed`}
          tone={usage.analysis.never > 0 ? 'warn' : 'good'}
        />
      </div>

      <Section title="What these numbers mean" hint="Quick reference for every term on this page.">
        <Panel>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-2">
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt className="text-[12.5px] font-semibold text-ink">{g.term}</dt>
                <dd className="m-0 mt-0.5 text-[12.5px] leading-snug text-muted">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </Section>

      <Section
        title="Model & budgets"
        hint="Overrides env when set. Keys stay in env/Vercel."
        action={<ReanalyzeControls />}
      >
        <AiSettings settings={settings} envProvider={envProvider} envModel={envModel} keyConfigured={keyConfigured} />
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
                <Th>Feature</Th>
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
                  <Td>{r.feature}</Td>
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
