/**
 * Grant (or revoke) operator-console admin access by email.
 * Sets profiles.role = 'admin' so the user can reach /admin.
 *
 * Usage:
 *   node scripts/grant-admin.mjs <email>            # grant admin
 *   node scripts/grant-admin.mjs <email> --revoke   # revoke (role -> null)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const email = process.argv[2];
const revoke = process.argv.includes('--revoke');
if (!email) {
  console.error('Usage: node scripts/grant-admin.mjs <email> [--revoke]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await db
  .from('profiles')
  .update({ role: revoke ? null : 'admin' })
  .eq('email', email)
  .select('id, email, role');

if (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}
if (!data || data.length === 0) {
  console.error(`No profile found with email "${email}". Has the user signed up yet?`);
  process.exit(1);
}
console.log(`✓ ${revoke ? 'Revoked admin from' : 'Granted admin to'} ${email} (role=${data[0].role ?? 'null'}).`);
