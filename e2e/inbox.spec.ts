import { expect, test } from '@playwright/test';
import path from 'node:path';

// /inbox is auth-protected; run with the saved dev-user session. Skip if creds
// are not configured (same pattern as dashboard.spec).
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
const hasAuth = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

test.describe('Inbox', () => {
  test.skip(!hasAuth, 'Requires E2E test-user creds in .env.local.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('renders the Inbox with an empty state when nothing is synced', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
    // The dev user has no synced messages, so the empty state shows.
    await expect(page.getByText(/No synced messages yet/i)).toBeVisible();
    // And a path to connect/sync.
    await expect(page.getByRole('link', { name: /Go to Settings/i })).toBeVisible();
  });
});
