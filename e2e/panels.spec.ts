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

test.describe('hover patterns', () => {
  // Reduced motion skips the fade, so the value can be read straight after hovering
  test.use({ reducedMotion: 'reduce' });

  const patternAlpha = (el: import('@playwright/test').Locator) =>
    el.evaluate((node) => getComputedStyle(node).getPropertyValue('--pattern-alpha').trim());

  test('a pattern stays hidden until its section is hovered', async ({ page, isMobile }) => {
    test.skip(isMobile, 'touch screens have no hover');
    await page.goto('/about/');
    const panel = page.locator('.pattern-on-hover').first();
    expect(await patternAlpha(panel)).toBe('0%');
    await panel.hover();
    expect(await patternAlpha(panel)).not.toBe('0%');
  });
});
