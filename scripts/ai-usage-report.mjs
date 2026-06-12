/**
 * One-shot READ-ONLY report over the live `ai_usage` ledger (dev tool, run
 * locally: `node scripts/ai-usage-report.mjs`). Answers the operator
 * question "what is consuming tokens/money?" — per-feature rollups, per-day
 * trend, the heaviest single calls, and error counts. Uses the service role
 * from .env.local; SELECTs only.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const { data, error } = await db
  .from('ai_usage')
  .select('feature, model, token_input, token_output, cost_estimate_usd, error, created_at, metadata')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(5000);
if (error) throw error;

const rows = data ?? [];
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const usd = (n) => `$${n.toFixed(4)}`;

console.log(`rows (30d): ${rows.length}\n`);

// Per feature.
const byFeature = new Map();
for (const r of rows) {
  const f = byFeature.get(r.feature) ?? { calls: 0, tin: 0, tout: 0, cost: 0, errors: 0, maxTotal: 0 };
  f.calls += 1;
  f.tin += r.token_input ?? 0;
  f.tout += r.token_output ?? 0;
  f.cost += r.cost_estimate_usd ?? 0;
  if (r.error) f.errors += 1;
  f.maxTotal = Math.max(f.maxTotal, (r.token_input ?? 0) + (r.token_output ?? 0));
  byFeature.set(r.feature, f);
}
console.log('PER FEATURE (30d) — calls | tokens in/out | avg tokens/call | max call | cost | errors');
for (const [k, f] of [...byFeature.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
  const total = f.tin + f.tout;
  console.log(
    `${k.padEnd(13)} ${String(f.calls).padStart(5)} | ${fmt(f.tin).padStart(10)} / ${fmt(f.tout).padStart(9)} | ${fmt(total / f.calls).padStart(7)} | ${fmt(f.maxTotal).padStart(8)} | ${usd(f.cost)} | ${f.errors}`,
  );
}

// Per day (last 14).
const byDay = new Map();
for (const r of rows) {
  const d = r.created_at.slice(0, 10);
  const v = byDay.get(d) ?? { calls: 0, tokens: 0, cost: 0 };
  v.calls += 1;
  v.tokens += (r.token_input ?? 0) + (r.token_output ?? 0);
  v.cost += r.cost_estimate_usd ?? 0;
  byDay.set(d, v);
}
console.log('\nPER DAY (last 14)');
for (const [d, v] of [...byDay.entries()].sort().slice(-14)) {
  console.log(`${d}  calls ${String(v.calls).padStart(4)}  tokens ${fmt(v.tokens).padStart(10)}  ${usd(v.cost)}`);
}

// Heaviest 10 calls.
console.log('\nHEAVIEST CALLS (30d)');
const heavy = [...rows]
  .sort((a, b) => (b.token_input + b.token_output) - (a.token_input + a.token_output))
  .slice(0, 10);
for (const r of heavy) {
  const meta = r.metadata && typeof r.metadata === 'object' ? JSON.stringify(r.metadata).slice(0, 80) : '';
  console.log(
    `${r.created_at.slice(0, 16)}  ${String(r.feature).padEnd(12)} in ${fmt(r.token_input).padStart(8)} out ${fmt(r.token_output).padStart(7)}  ${usd(r.cost_estimate_usd ?? 0)}  ${meta}`,
  );
}

// Errors.
const errs = rows.filter((r) => r.error);
console.log(`\nERRORS (30d): ${errs.length}`);
for (const r of errs.slice(0, 8)) {
  console.log(`${r.created_at.slice(0, 16)}  ${r.feature}: ${String(r.error).slice(0, 100)}`);
}
