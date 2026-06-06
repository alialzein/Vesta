/**
 * Dev-only utility: create (or confirm) a shared development test user in the
 * Supabase project, used for manual testing and the Playwright auth fixture.
 *
 * Reads credentials from .env.local (never hardcoded here):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 *
 * Usage: node scripts/create-dev-user.mjs
 *
 * This account is TEMPORARY for development. Remove it before launch
 * (and re-enable Supabase email confirmation). It is created with
 * email_confirm: true so it can sign in immediately while confirmations are off.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error(
    'Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_EMAIL, E2E_TEST_PASSWORD in .env.local',
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Try to create; if it already exists, update the password so it stays usable.
const { data: created, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Vesta Dev' },
});

if (error) {
  if (/already|registered|exists/i.test(error.message)) {
    // Find the existing user and reset its password.
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === email);
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      console.log(`Dev user already existed; password reset. id=${existing.id} email=${email}`);
      process.exit(0);
    }
  }
  console.error('Failed to create dev user:', error.message);
  process.exit(1);
}

console.log(`Dev user created. id=${created.user?.id} email=${email}`);
