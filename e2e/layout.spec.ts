import { expect, test } from '@playwright/test';
import { pages } from './pages';

// Every page sits in one screen: the frame never grows the page. Includes short laptop sizes,
// where the about page switches to its compact (short:) layout.
const desktopSizes = [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

for (const path of pages) {
  test(`${path} never scrolls the page`, async ({ page, isMobile }) => {
    // The mobile project checks its own phone viewport; desktop checks each size
    const sizes = isMobile ? [page.viewportSize()!] : desktopSizes;
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(overflow, `${size.width}x${size.height}`).toBeLessThanOrEqual(0);
    }
  });
}
