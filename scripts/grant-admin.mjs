/**
 * Grant (or revoke) operator-console admin access by email.
 * Sets the Supabase auth claim app_metadata.is_admin (NOT profiles.role — that
 * column is the user's job title, set by onboarding). Takes effect on the user's
 * next request; a re-login is not required.
 *
 * Usage:
 *   node scripts/grant-admin.mjs <email>            # grant admin
 *   node scripts/grant-admin.mjs <email> --revoke   # revoke
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Uses the Supabase admin API (HTTPS), so it works without direct DB access.
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

const { data: list, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error('Failed to list users:', listErr.message);
  process.exit(1);
}
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user found with email "${email}". Has the user signed up yet?`);
  process.exit(1);
}

const { error } = await db.auth.admin.updateUserById(user.id, {
  app_metadata: { is_admin: !revoke },
});
if (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}
console.log(`✓ ${revoke ? 'Revoked admin from' : 'Granted admin to'} ${email} (app_metadata.is_admin=${!revoke}).`);
