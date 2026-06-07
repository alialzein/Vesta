/**
 * Dev utility: clear all SYNCED mail data so the next sync starts fresh.
 *
 * Deletes rows from: work_items, email_messages, email_threads, people,
 * sync_cursors. Leaves the mailbox/integration/tokens intact (you stay
 * connected). Use after changing triage logic so re-sync re-classifies cleanly.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Connects over HTTPS (the REST API), so it works even when the direct DB host
 * isn't reachable. Service role bypasses RLS.
 *
 * Usage: node scripts/clear-synced-mail.mjs
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

// Order: children first. (FKs are mostly ON DELETE SET NULL, but this is tidy.)
const tables = ['work_items', 'email_messages', 'email_threads', 'people', 'sync_cursors'];

for (const table of tables) {
  // Count, then delete every row (id is never null, so this matches all).
  const { count } = await db.from(table).select('id', { count: 'exact', head: true });
  const { error } = await db.from(table).delete().not('id', 'is', null);
  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ cleared ${table} (${count ?? '?'} rows)`);
}

console.log('\nDone. Connections/tokens kept — click "Sync now" for a fresh, triaged sync.');
