import { expect, test } from '@playwright/test';

test.describe('Dashboard shell', () => {
  test('renders the core regions, selects a radar item, and toggles theme', async ({ page }) => {
    await page.goto('/');

    // Greeting + morning brief render.
    await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible();
    await expect(page.getByText(/Live morning brief/i)).toBeVisible();

    // Today's Radar shows the top item.
    const cedars = page.getByText('Cedars Group contract approval').first();
    await expect(cedars).toBeVisible();

    // Selecting a different radar item updates the AI Analysis panel title.
    await page.getByText('Hiring decision follow-up').first().click();
    await expect(page.getByText('Hiring decision follow-up').nth(1)).toBeVisible();

    // Theme toggle flips the data-theme attribute on <html>.
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: /Switch to light mode/i }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('collapses and reopens the assistant chat', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByPlaceholder('Ask the assistant anything…')).toBeVisible();
    await page.getByRole('button', { name: 'Hide assistant' }).click();
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toHaveCount(0);

    await page.getByRole('button', { name: 'Open assistant' }).click();
    await expect(page.getByPlaceholder('Ask the assistant anything…')).toBeVisible();
  });
});
