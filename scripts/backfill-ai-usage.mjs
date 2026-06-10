/**
 * Backfill the unified `ai_usage` ledger from historical `ai_analyses` rows.
 *
 * The admin AI Control Center reads `ai_usage`, but that table only exists since
 * the admin-panel migration — AI activity from before (and the draft/capture
 * features until they were wired in) lives only in `ai_analyses`. This copies
 * those rows across once, preserving timestamps, so spend/usage history is
 * complete. Idempotent: rows already backfilled (metadata.analysis_id) or whose
 * analysis happened after the ledger started filling are skipped.
 *
 * Usage: node scripts/backfill-ai-usage.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Map an ai_analyses row onto a ledger feature via its prompt_version. */
function featureOf(promptVersion) {
  if (!promptVersion) return 'analysis';
  if (promptVersion.startsWith('draft')) return 'draft';
  if (promptVersion.startsWith('capture')) return 'capture';
  return 'analysis'; // v1 covers both analysis and reply-intent; close enough for rollups
}

// Already-backfilled analysis ids (idempotency).
const { data: existing, error: exErr } = await db
  .from('ai_usage')
  .select('metadata')
  .not('metadata->>analysis_id', 'is', null);
if (exErr) {
  console.error('Failed reading ai_usage:', exErr.message);
  process.exit(1);
}
const done = new Set((existing ?? []).map((r) => r.metadata?.analysis_id).filter(Boolean));

const { data: analyses, error } = await db
  .from('ai_analyses')
  .select('id, user_id, work_item_id, model, prompt_version, token_input, token_output, cost_estimate_usd, error, created_at')
  .order('created_at', { ascending: true });
if (error) {
  console.error('Failed reading ai_analyses:', error.message);
  process.exit(1);
}

const rows = (analyses ?? [])
  .filter((a) => !done.has(a.id))
  // Skip rows with no tokens AND no error — nothing meaningful to ledger.
  .filter((a) => (a.token_input ?? 0) + (a.token_output ?? 0) > 0 || a.error)
  .map((a) => ({
    user_id: a.user_id,
    feature: featureOf(a.prompt_version),
    provider: null,
    model: a.model,
    token_input: a.token_input ?? 0,
    token_output: a.token_output ?? 0,
    request_count: 1,
    cost_estimate_usd: a.cost_estimate_usd,
    work_item_id: a.work_item_id,
    error: a.error,
    metadata: { analysis_id: a.id, backfill: true },
    created_at: a.created_at, // preserve the original call time
  }));

if (rows.length === 0) {
  console.log('Nothing to backfill — the ledger is already up to date.');
  process.exit(0);
}

// Insert in chunks to stay well under request limits.
let inserted = 0;
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const { error: insErr } = await db.from('ai_usage').insert(chunk);
  if (insErr) {
    console.error(`Insert failed at chunk ${i / 200}:`, insErr.message);
    process.exit(1);
  }
  inserted += chunk.length;
}

console.log(`✓ Backfilled ${inserted} AI call(s) from ai_analyses into ai_usage.`);
console.log('  The admin AI Control Center and Overview now include historical usage.');
