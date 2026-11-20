import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { pages, wcagTags } from './pages';

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    // Reduced motion so the panel lines are already drawn when axe runs
    test.use({ colorScheme, reducedMotion: 'reduce' });

    for (const path of pages) {
      test(`${path} has no axe violations`, async ({ page }) => {
        await page.goto(path);
        const { violations } = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
        expect(violations).toEqual([]);
      });
    }
  });
}
