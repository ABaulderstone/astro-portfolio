import { expect, test } from '@playwright/test';

// The about page's panel lines are pseudo-elements, so read their computed style
const lineAnimations = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.panels > *')].flatMap((el) =>
      ['::before', '::after']
        .map((pseudo) => getComputedStyle(el, pseudo))
        .filter((style) => style.content !== 'none' && style.content !== 'normal')
        .map((style) => style.animationName),
    ),
  );

test('the panel lines draw in and end at full size', async ({ page }) => {
  await page.goto('/about/');
  const animations = await lineAnimations(page);
  expect(animations.length).toBeGreaterThan(0);
  for (const name of animations) expect(name).toMatch(/^draw-[xy]$/);

  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const transforms = await page.evaluate(() =>
    [...document.querySelectorAll('.panels > *')].flatMap((el) =>
      ['::before', '::after'].map((pseudo) => getComputedStyle(el, pseudo)).filter((s) => s.content !== 'none').map((s) => s.transform),
    ),
  );
  for (const transform of transforms) expect(transform).toBe('none');
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the panel lines appear without animating', async ({ page }) => {
    await page.goto('/about/');
    const animations = await lineAnimations(page);
    expect(animations.length).toBeGreaterThan(0);
    for (const name of animations) expect(name).toBe('none');
  });
});
