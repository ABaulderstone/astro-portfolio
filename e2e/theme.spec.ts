import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'light' });

test('the toggle overrides the OS theme, persists, and toggling back follows the OS again', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: 'Dark mode' });

  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  // Reapplied before paint by the inline script in Base
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Back to light, which is the OS theme, so the override is cleared
  await toggle.click();
  await expect(html).not.toHaveAttribute('data-theme');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
});

test('the toggle is hidden without JS', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#theme-toggle')).toBeHidden();
  await context.close();
});
