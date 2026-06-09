import { requireAdmin } from '@/lib/admin/auth';
import { getAppSettings } from '@/lib/admin/settings';
import { getAiUsageSummary } from '@/lib/admin/data';
import { Section, Table, Th, Td, KpiCard, EmptyState, Badge } from '@/components/admin/ui';
import { AiSettings } from '@/components/admin/tabs/AiSettings';
import { ReanalyzeControls } from '@/components/admin/tabs/ReanalyzeControls';
import { fmtUsd, fmtInt, fmtRel } from '@/lib/admin/format';

export default async function AdminAiPage() {
  await requireAdmin();
  const [settings, usage] = await Promise.all([getAppSettings(), getAiUsageSummary()]);

  const envProvider = (process.env.AI_PROVIDER ?? '').trim();
  const envModel = (process.env.AI_MODEL ?? '').trim();
  const keyConfigured = Boolean((process.env.AI_API_KEY ?? '').trim());

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          AI Control Center
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Spend, budgets, model selection, and re-analysis. Usage is recorded per call in the
          ledger as features run.
        </p>
      </header>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Spend · today" value={fmtUsd(usage.costToday)} />
        <KpiCard label="Spend · month" value={fmtUsd(usage.costMonth)} hint={`${fmtInt(usage.callsMonth)} calls`} />
        <KpiCard label="Tokens · month" value={fmtInt(usage.tokensMonth)} />
        <KpiCard
          label="Analysis coverage"
          value={`${fmtInt(usage.analysis.analyzed)}/${fmtInt(usage.analysis.total)}`}
          hint={`${fmtInt(usage.analysis.never)} never analyzed`}
          tone={usage.analysis.never > 0 ? 'warn' : 'good'}
        />
      </div>

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
