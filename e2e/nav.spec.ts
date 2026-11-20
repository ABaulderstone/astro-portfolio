import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { wcagTags } from './pages';

test('the skip link is the first tab stop and becomes visible', async ({ page }) => {
  await page.goto('/about/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});

test.describe('mobile menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'the menu button only shows on mobile');

  test('opens, passes axe, and closes with the close button or Escape', async ({ page }) => {
    await page.goto('/about/');
    const drawer = page.locator('#nav-drawer');

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
    const { violations } = await new AxeBuilder({ page }).include('#nav-drawer').withTags(wcagTags).analyze();
    expect(violations).toEqual([]);

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(drawer).toBeHidden();

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
});

test('desktop shows the inline nav instead of the menu button', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout only');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
});
