/**
 * Pure aggregation over `ai_usage` ledger rows for the AI Control Center
 * (no I/O — unit tested). Answers the operator question "what is consuming
 * tokens and money?": per-feature AND per-call-kind rollups (the `brief`
 * feature alone hides very different animals — a 300-token rank vs a
 * 17k-token briefing_search), a daily trend, and the heaviest single calls.
 */

export type UsageRow = {
  created_at: string;
  user_id: string | null;
  feature: string;
  model: string | null;
  token_input: number | null;
  token_output: number | null;
  cost_estimate_usd: number | string | null;
  error: string | null;
  metadata: unknown;
};

export type Rates = { input: number; output: number } | null;

export function rowCost(r: UsageRow, rates: Rates): number {
  if (r.cost_estimate_usd !== null && r.cost_estimate_usd !== undefined) {
    return Number(r.cost_estimate_usd);
  }
  if (!rates) return 0;
  return (
    (Number(r.token_input ?? 0) * rates.input + Number(r.token_output ?? 0) * rates.output) /
    1_000_000
  );
}

const rowTokens = (r: UsageRow) => Number(r.token_input ?? 0) + Number(r.token_output ?? 0);

/** The call kind: metadata.kind when the feature recorded one, else the
 *  feature itself ("brief/briefing_search" vs plain "draft"). */
export function rowKind(r: UsageRow): string {
  const kind = (r.metadata as { kind?: unknown } | null)?.kind;
  return typeof kind === 'string' && kind ? `${r.feature}/${kind}` : r.feature;
}

export type KindRollup = {
  kind: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  avgTokens: number;
  maxTokens: number;
  cost: number;
  errors: number;
};

export function rollupByKind(rows: UsageRow[], rates: Rates): KindRollup[] {
  const map = new Map<string, KindRollup>();
  for (const r of rows) {
    const key = rowKind(r);
    const k =
      map.get(key) ??
      ({ kind: key, calls: 0, tokensIn: 0, tokensOut: 0, avgTokens: 0, maxTokens: 0, cost: 0, errors: 0 } as KindRollup);
    k.calls += 1;
    k.tokensIn += Number(r.token_input ?? 0);
    k.tokensOut += Number(r.token_output ?? 0);
    k.maxTokens = Math.max(k.maxTokens, rowTokens(r));
    k.cost += rowCost(r, rates);
    if (r.error) k.errors += 1;
    map.set(key, k);
  }
  return [...map.values()]
    .map((k) => ({ ...k, avgTokens: Math.round((k.tokensIn + k.tokensOut) / k.calls) }))
    .sort((a, b) => b.tokensIn + b.tokensOut - (a.tokensIn + a.tokensOut));
}

export type DayPoint = { date: string; calls: number; tokens: number; cost: number; errors: number };

/** One point per UTC day over the last `days`, oldest → newest (gaps filled
 *  with zeros so the chart never lies by omission). */
export function dailySeries(
  rows: UsageRow[],
  days: number,
  rates: Rates = null,
  now: Date = new Date(),
): DayPoint[] {
  const byDay = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    byDay.set(d, { date: d, calls: 0, tokens: 0, cost: 0, errors: 0 });
  }
  for (const r of rows) {
    const p = byDay.get(r.created_at.slice(0, 10));
    if (!p) continue;
    p.calls += 1;
    p.tokens += rowTokens(r);
    p.cost += rowCost(r, rates);
    if (r.error) p.errors += 1;
  }
  return [...byDay.values()];
}

export type HeavyCall = {
  at: string;
  kind: string;
  who: string | null;
  tokensIn: number;
  tokensOut: number;
  cost: number;
};

export function heaviestCalls(rows: UsageRow[], rates: Rates, limit = 8): HeavyCall[] {
  return [...rows]
    .sort((a, b) => rowTokens(b) - rowTokens(a))
    .slice(0, limit)
    .filter((r) => rowTokens(r) > 0)
    .map((r) => ({
      at: r.created_at,
      kind: rowKind(r),
      who: r.user_id,
      tokensIn: Number(r.token_input ?? 0),
      tokensOut: Number(r.token_output ?? 0),
      cost: rowCost(r, rates),
    }));
}
