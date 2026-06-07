import { expect, test } from '@playwright/test';
import path from 'node:path';

// /priorities is auth-protected; run with the saved dev-user session.
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
const hasAuth = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

test.describe('Priorities', () => {
  test.skip(!hasAuth, 'Requires E2E test-user creds in .env.local.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('renders Priorities with an empty state when nothing is waiting', async ({ page }) => {
    await page.goto('/priorities');
    await expect(page.getByRole('heading', { name: 'Priorities', exact: true })).toBeVisible();
    // The dev user has no synced work_items, so the empty state shows.
    await expect(page.getByText(/Nothing waiting on you/i)).toBeVisible();
  });
});
