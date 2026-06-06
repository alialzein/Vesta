import { expect, test } from '@playwright/test';

test.describe('Dashboard shell', () => {
  test('renders core regions, selects a radar item, and toggles theme', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible();
    await expect(page.getByText(/Live morning brief/i)).toBeVisible();
    // Today's Radar is the focal section; large command-center cards are gone.
    await expect(page.getByRole('heading', { name: /Today's Radar/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /AI Command Center/i })).toHaveCount(0);

    // Today's Radar shows the top item.
    await expect(page.getByText('Cedars Group contract approval').first()).toBeVisible();

    // Selecting a different radar item updates the AI assistant rail.
    await page.getByText('Hiring decision follow-up').first().click();
    await expect(page.getByText('Hiring decision follow-up').nth(1)).toBeVisible();

    // Theme defaults to light; the toggle flips data-theme on <html>.
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: /Switch to dark mode/i }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('switches AI rail tabs and shows the safety copy on Draft', async ({ page }) => {
    await page.goto('/');

    // The expanded rail is visible on the Today view.
    await expect(page.getByText('AI Assistant').first()).toBeVisible();

    // Switch to the Draft tab (target the visible desktop rail tab; the stacked
    // mobile copy is display:none at desktop widths).
    await page.getByRole('tab', { name: /Draft/i }).filter({ visible: true }).first().click();
    await expect(
      page.getByText(/will not send emails without your explicit approval/i).filter({
        visible: true,
      }),
    ).toBeVisible();
  });

  test('opens and closes the Vesta chat drawer via the floating button', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByPlaceholder('Ask the assistant anything…')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open Vesta assistant' }).click();
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toBeVisible();

    await page.getByRole('button', { name: 'Close assistant' }).click();
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toBeHidden();
  });

  test('a quick action opens its demo preview drawer', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Clear My Day' }).click();
    await expect(page.getByRole('dialog', { name: /Focus Mode/i })).toBeVisible();
  });

  test('switches to the full-page Memory & Rules workspace from the sidebar', async ({ page }) => {
    await page.goto('/');

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
    await page.goto('/');

    // The profile (avatar + name) is not duplicated in the topbar — it lives in
    // the sidebar footer only.
    await expect(page.getByRole('button', { name: /Ali Sabbagh — profile/i })).toHaveCount(0);
    // No sync timestamp anywhere, and no standalone AI toggle in the topbar.
    await expect(page.getByText(/Synced .* min ago/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'AI', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /AI assistant rail/i })).toHaveCount(0);
    // The user name still appears once (sidebar footer).
    await expect(page.getByText('Ali Sabbagh')).toBeVisible();
  });

  test('collapses the AI rail from inside the AI Assistant panel header', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Collapse AI assistant rail/i }).click();
    // The slim collapsed strip exposes the AI expand button.
    await expect(page.getByRole('button', { name: 'AI assistant' })).toBeVisible();
  });
});
