/**
 * Force AI re-analysis of open work items on the next sync.
 *
 * AI analysis is deduped by work_items.last_analyzed_at (analyzed once per change),
 * so after a PROMPT change existing items keep their old analysis until new mail
 * arrives. This clears last_analyzed_at so the next sync re-analyzes them with the
 * current prompt. (The new code must already be running for the new prompt to apply.)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Usage: node scripts/reanalyze-work-items.mjs   then open the dashboard (auto-syncs)
 *        or click Settings → Sync now.
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

const { data, error } = await db
  .from('work_items')
  .update({ last_analyzed_at: null })
  .eq('status', 'open')
  .select('id');

if (error) {
  console.error('✗', error.message);
  process.exit(1);
}
console.log(`✓ cleared last_analyzed_at on ${data?.length ?? 0} open work item(s).`);
console.log('Open the dashboard (it auto-syncs) or click "Sync now" to re-analyze them.');
