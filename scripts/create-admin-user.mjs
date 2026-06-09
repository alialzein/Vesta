/**
 * Create (or upgrade) a dedicated operator-console admin account.
 * Creates the auth user with a confirmed email + password, ensures a profile
 * row, and sets profiles.role = 'admin' so the account can reach /admin.
 *
 * Usage:
 *   node scripts/create-admin-user.mjs <email> [password]
 *   (password optional — a strong one is generated and printed if omitted)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Uses the Supabase REST/admin API (HTTPS), so it works without DB access.
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';

config({ path: '.env.local' });

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/create-admin-user.mjs <email> [password]');
  process.exit(1);
}
// Generate a strong password if none was given (URL-safe, ~22 chars).
const password = process.argv[3] || randomBytes(16).toString('base64url');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// 1) Create the auth user (email pre-confirmed so they can log in immediately).
let userId;
const created = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Vesta Admin' },
});

if (created.error) {
  // Likely already exists — find them in the user list and just (re)set admin.
  if (/already/i.test(created.error.message)) {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) {
      console.error(`User reported as existing but not found: ${created.error.message}`);
      process.exit(1);
    }
    userId = existing.id;
    console.log(`User already existed — leaving password unchanged, ensuring admin role.`);
  } else {
    console.error('Failed to create user:', created.error.message);
    process.exit(1);
  }
} else {
  userId = created.data.user.id;
  console.log(`Created auth user ${email}.`);
}

// 2) Ensure a profile row exists and is admin (the signup trigger usually makes
//    the row; upsert is idempotent either way).
const { error: upsertErr } = await db
  .from('profiles')
  .upsert({ id: userId, email, full_name: 'Vesta Admin', role: 'admin' }, { onConflict: 'id' });
if (upsertErr) {
  console.error('Created the user but failed to set admin role:', upsertErr.message);
  process.exit(1);
}

console.log('\n✓ Admin account ready.');
console.log('  Email:    ' + email);
if (!process.argv[3]) console.log('  Password: ' + password + '   (change it after first login)');
console.log('  Sign in at /login, then open /admin.');
