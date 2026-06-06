import { expect, test } from '@playwright/test';

test.describe('Dashboard shell', () => {
  test('renders core regions, selects a radar item, and toggles theme', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible();
    await expect(page.getByText(/Live morning brief/i)).toBeVisible();

    // Today's Radar shows the top item.
    await expect(page.getByText('Cedars Group contract approval').first()).toBeVisible();

    // Selecting a different radar item updates the AI Analysis panel.
    await page.getByText('Hiring decision follow-up').first().click();
    await expect(page.getByText('Hiring decision follow-up').nth(1)).toBeVisible();

    // Theme toggle flips data-theme on <html>.
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: /Switch to light mode/i }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('opens and closes the Vesta chat drawer via the floating button', async ({ page }) => {
    await page.goto('/');

    // Chat is closed initially — FAB visible, input not present.
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open Vesta assistant' }).click();
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toBeVisible();

    await page.getByRole('button', { name: 'Close assistant' }).click();
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toBeHidden();
  });

  test('switches to Memory & Rules view and collapses the right rail', async ({ page }) => {
    await page.goto('/');

    // Right rail (AI Analysis) is visible on Today; collapse it via the chevron toggle.
    await expect(page.getByRole('heading', { name: 'AI Analysis' })).toBeVisible();
    await page.getByRole('button', { name: /Hide AI Analysis panel/i }).click();
    await expect(page.getByRole('heading', { name: 'AI Analysis' })).toBeHidden();

    // Switch to Memory & Rules main view.
    await page.getByRole('button', { name: /Memory & Rules/i }).click();
    await expect(page.getByRole('heading', { name: 'Memory & Rules', exact: true })).toBeVisible();
    await expect(page.getByText("Today's Radar")).toHaveCount(0);
  });
});
