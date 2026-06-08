import { expect, test } from '@playwright/test';
import path from 'node:path';

// /priorities is auth-protected; run with the saved dev-user session.
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
const hasAuth = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

test.describe('Priorities', () => {
  test.skip(!hasAuth, 'Requires E2E test-user creds in .env.local.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('renders Priorities (empty state or waiting items)', async ({ page }) => {
    await page.goto('/priorities');
    await expect(page.getByRole('heading', { name: 'Priorities', exact: true })).toBeVisible();
    // Header always links to sync settings, regardless of data state.
    await expect(page.getByRole('link', { name: /Sync settings/i })).toBeVisible();
    // The shared dev account may or may not have waiting work_items (it doubles
    // as the real-data test account), so accept either the empty state or a
    // populated list rather than assuming nothing is waiting.
    const emptyState = page.getByRole('heading', { name: /Nothing waiting on you/i });
    const priorityRow = page.getByRole('listitem');
    await expect(emptyState.or(priorityRow).first()).toBeVisible();
  });
});
