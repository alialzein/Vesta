import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

// The dashboard route is auth-protected (Phase 2). These specs run with the
// session saved by the auth fixture (e2e/auth.setup.ts). If the dev test-user
// creds are not configured, the whole group is skipped (not failed).
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
const hasAuth = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

/**
 * The Vesta initialization screen (Phase 0.5) shows briefly on first mount and
 * covers the dashboard. Wait for it to finish before interacting.
 */
async function waitForDashboard(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('status', { name: /Loading Vesta/i })).toBeHidden({ timeout: 7000 });
  await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible();
}

test.describe('Dashboard shell', () => {
  test.skip(
    !hasAuth,
    'Requires E2E test-user creds in .env.local (see scripts/create-dev-user.mjs).',
  );
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('shows the Vesta initialization splash, then the dashboard', async ({ page }) => {
    // The splash plays once per session (cookie-gated). Clear that cookie so it
    // reliably shows here, even though the auth fixture session may have set it.
    await page.context().clearCookies({ name: 'vesta_splash_shown' });
    await page.goto('/');
    // The full-screen branded splash appears (its testid is unique; the tagline
    // also exists in the sidebar, so we target the splash explicitly).
    await expect(page.getByTestId('vesta-splash-screen')).toBeVisible();
    await expect(page.getByTestId('vesta-splash-message')).toBeVisible();
    // ...then disappears, revealing the dashboard.
    await expect(page.getByTestId('vesta-splash-screen')).toBeHidden({ timeout: 7000 });
    await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible();
  });

  test('renders core regions, selects a radar item, and toggles theme', async ({ page }) => {
    await waitForDashboard(page);

    await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible();
    await expect(page.getByText(/Live morning brief/i)).toBeVisible();
    // Today's Radar is the focal section; large command-center cards are gone.
    await expect(page.getByRole('heading', { name: /Today's Radar/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /AI Command Center/i })).toHaveCount(0);

    // Today's Radar shows the top item.
    await expect(page.getByText('Cedars Group contract approval').first()).toBeVisible();

    // Selecting a different radar item updates the AI assistant rail. The title
    // then appears twice among visible elements (the radar row + the desktop
    // rail header); the stacked mobile rail copy is display:none at this width.
    await page.getByText('Hiring decision follow-up').first().click();
    await expect(
      page.getByText('Hiring decision follow-up').filter({ visible: true }).nth(1),
    ).toBeVisible();

    // Theme defaults to dark; the toggle flips data-theme on <html>.
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: /Switch to light mode/i }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('switches AI rail tabs and shows the safety copy on Draft', async ({ page }) => {
    await waitForDashboard(page);

    // The expanded rail is visible on the Today view (target the visible desktop
    // rail; the stacked mobile copy is display:none at desktop widths).
    await expect(page.getByText('AI Assistant').filter({ visible: true }).first()).toBeVisible();

    // Switch to the rail's Draft tab. Use an exact name so it doesn't match the
    // radar "Drafts" filter tab, and filter to the visible desktop rail (the
    // stacked mobile rail copy is display:none at desktop widths).
    await page
      .getByRole('tab', { name: 'Draft', exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page.getByText(/will not send emails without your explicit approval/i).filter({
        visible: true,
      }),
    ).toBeVisible();
  });

  test('opens and closes the Vesta chat drawer via the floating button', async ({ page }) => {
    await waitForDashboard(page);

    // The drawer is always mounted (it slides in via transform), so we use the
    // floating "Ask Vesta" button — which is only shown while the drawer is
    // closed — as the reliable open/closed signal.
    const fab = page.getByRole('button', { name: 'Open Vesta assistant' });
    await expect(fab).toBeVisible();

    await fab.click();
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toBeVisible();

    await page.getByRole('button', { name: 'Close assistant' }).click();
    await expect(page.getByRole('button', { name: 'Open Vesta assistant' })).toBeVisible();
  });

  test('a quick action opens its demo preview drawer', async ({ page }) => {
    await waitForDashboard(page);

    await page.getByRole('button', { name: 'Clear My Day' }).click();
    await expect(page.getByRole('dialog', { name: /Focus Mode/i })).toBeVisible();
  });

  test('switches to the full-page Memory & Rules workspace from the sidebar', async ({ page }) => {
    await waitForDashboard(page);

    await page.getByRole('button', { name: /^Memory & Rules$/i }).click();
    await expect(page.getByRole('heading', { name: 'Memory & Rules', exact: true })).toBeVisible();
    await expect(page.getByText("Today's Radar")).toHaveCount(0);
    // Full-page layout: add form + category tabs are present.
    await expect(page.getByLabel('New memory text')).toBeVisible();
    await expect(page.getByRole('tab', { name: /VIPs & People/i })).toBeVisible();
  });

  test('topbar is cleaned up: no profile chip, no sync timestamp, no AI toggle', async ({
    page,
  }) => {
    await waitForDashboard(page);

    // The profile (avatar + name) is not duplicated in the topbar — it lives in
    // the sidebar footer only.
    await expect(page.getByRole('button', { name: /Ali Sabbagh — profile/i })).toHaveCount(0);
    // No sync timestamp anywhere, and no standalone AI toggle in the topbar.
    await expect(page.getByText(/Synced .* min ago/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'AI', exact: true })).toHaveCount(0);
    // The only AI-rail control is the collapse button inside the rail itself —
    // there is no separate AI toggle in the topbar.
    await expect(page.getByRole('button', { name: 'Collapse AI assistant rail' })).toHaveCount(1);
    // The signed-in account appears in the sidebar footer. With the auth
    // fixture this is the dev test user ("Vesta Dev"), not the demo identity.
    await expect(page.getByText('Vesta Dev')).toBeVisible();
  });

  test('collapses the AI rail from inside the AI Assistant panel header', async ({ page }) => {
    await waitForDashboard(page);

    await page.getByRole('button', { name: /Collapse AI assistant rail/i }).click();
    // The slim collapsed strip exposes the AI expand button.
    await expect(page.getByRole('button', { name: 'AI assistant' })).toBeVisible();
  });
});
