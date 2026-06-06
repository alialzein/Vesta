import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

/**
 * Playwright auth setup (runs once before the authenticated project).
 *
 * Signs the shared dev user in through the real login UI and saves the
 * resulting session cookies to `playwright/.auth/user.json`. Authenticated
 * specs (e.g. dashboard.spec.ts) reuse that storageState so they are not
 * redirected to /login by the Phase 2 route guard.
 *
 * Credentials come from .env.local (E2E_TEST_EMAIL / E2E_TEST_PASSWORD); create
 * the account with `node scripts/create-dev-user.mjs`. If creds are absent the
 * setup is skipped and the authenticated specs skip themselves too.
 */
export const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

setup('authenticate dev user', async ({ page }) => {
  setup.skip(!email || !password, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set in .env.local');

  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // A successful sign-in redirects to the dashboard (splash → greeting).
  await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible({
    timeout: 15000,
  });

  await page.context().storageState({ path: authFile });
});
