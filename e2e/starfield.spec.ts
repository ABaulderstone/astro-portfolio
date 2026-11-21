import { expect, test } from '@playwright/test';

const layerAnimations = (page: import('@playwright/test').Page) =>
  page.locator('.starfield .layer').evaluateAll((layers) => layers.map((layer) => getComputedStyle(layer).animationName));

test('the starfield drifts, and two layers twinkle', async ({ page }) => {
  await page.goto('/');
  const animations = await layerAnimations(page);
  expect(animations).toHaveLength(4);
  expect(animations.filter((name) => name.startsWith('drift'))).toHaveLength(4);
  expect(animations.filter((name) => name.includes('twinkle'))).toHaveLength(2);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the stars hold still', async ({ page }) => {
    await page.goto('/');
    for (const name of await layerAnimations(page)) expect(name).toBe('none');
  });
});

test('the heading sits above the starfield', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1 });
  const box = (await heading.boundingBox())!;
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.tagName,
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(hit).toBe('H1');
});
