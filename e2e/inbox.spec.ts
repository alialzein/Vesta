import { expect, test } from '@playwright/test';
import path from 'node:path';

// /inbox is auth-protected; run with the saved dev-user session. Skip if creds
// are not configured (same pattern as dashboard.spec).
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
const hasAuth = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

test.describe('Inbox', () => {
  test.skip(!hasAuth, 'Requires E2E test-user creds in .env.local.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('renders the Inbox (empty state or synced messages)', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
    // Header always links to sync settings, regardless of data state.
    await expect(page.getByRole('link', { name: /Sync settings/i })).toBeVisible();
    // The shared dev account may or may not have synced Outlook mail (it doubles
    // as the real-data test account), so accept either the empty state or a
    // populated message list rather than assuming an empty mailbox.
    const emptyState = page.getByRole('heading', { name: /No synced messages yet/i });
    const messageRow = page.getByRole('listitem');
    await expect(emptyState.or(messageRow).first()).toBeVisible();
  });
});
