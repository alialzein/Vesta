/**
 * Diagnostic: show what AI analysis actually did.
 * Prints each open work item (category, priority, last_analyzed_at) and the most
 * recent ai_analyses rows (model, category, tokens, error). Tells you whether
 * re-analysis ran, what it produced, and any errors.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Usage: node scripts/ai-status.mjs
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

const { data: items } = await db
  .from('work_items')
  .select('id, title, category, priority_score, last_analyzed_at')
  .eq('status', 'open')
  .order('priority_score', { ascending: false });

console.log('=== open work_items ===');
for (const w of items ?? []) {
  console.log(
    `  [${String(w.priority_score).padStart(3)}] ${String(w.category ?? '-').padEnd(9)} analyzed:${w.last_analyzed_at ?? 'NEVER'}  ${w.title}`,
  );
}

const { data: rows } = await db
  .from('ai_analyses')
  .select('work_item_id, model, category, priority_score, error, token_input, token_output, created_at')
  .order('created_at', { ascending: false })
  .limit(15);

console.log('\n=== recent ai_analyses (newest first) ===');
if (!rows?.length) console.log('  (none — AI analysis has never written a row)');
for (const r of rows ?? []) {
  console.log(
    `  ${r.created_at}  model:${r.model ?? '-'}  cat:${String(r.category ?? '-').padEnd(9)} pri:${r.priority_score ?? '-'}  tok:${r.token_input ?? 0}/${r.token_output ?? 0}  err:${r.error ?? '-'}`,
  );
}
