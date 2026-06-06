import { expect, test } from '@playwright/test';

/**
 * Login screen smoke test (feature/login-ai-polish).
 *
 * The dashboard is auth-protected, so an unauthenticated visit to "/" is
 * redirected to "/login". We assert the polished login renders with its AI
 * brand core and trust cues, and that the sign-up toggle reveals the
 * confirm-password field. No real sign-in is performed (no test credentials).
 */
test.describe('Login screen', () => {
  // Always run logged-out, even though the auth fixture saved a session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to a polished login when signed out', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByTestId('vesta-auth-core')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByText('Approval-first')).toBeVisible();
  });

  test('sign-up mode reveals the confirm-password field and validates match', async ({ page }) => {
    await page.goto('/login');

    // Retry the toggle until the client component has hydrated (dev mode can
    // attach React handlers a beat after the button is clickable).
    await expect(async () => {
      await page.getByRole('button', { name: /Create one/i }).click({ timeout: 1000 });
      await expect(page.getByLabel('Full name')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });

    await expect(page.getByLabel('Confirm password')).toBeVisible();

    await page.getByLabel('Password', { exact: true }).fill('supersecret');
    await page.getByLabel('Confirm password').fill('different');
    await expect(page.getByText(/do not match/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });
});
