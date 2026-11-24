import { expect, test } from '@playwright/test';
import { textMarquee } from '../src/lib/marquee';
import { nowPlaying, nowPlayingLine } from '../src/lib/now-playing';

const { scrolls } = textMarquee(nowPlayingLine(nowPlaying));

const track = (page: import('@playwright/test').Page) =>
  page.locator('[data-now-playing]').evaluate((el) => {
    const style = getComputedStyle(el);
    return { name: style.animationName, state: style.animationPlayState };
  });

test.describe('mobile now playing marquee', () => {
  test('a long line scrolls, and the button pauses it', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the marquee is mobile only');
    test.skip(!scrolls, 'now playing fits on one line');
    await page.goto('/about/');
    expect(await track(page)).toEqual({ name: 'marquee', state: 'running' });
    await page.getByLabel('Pause the now playing scrolling').check({ force: true });
    expect((await track(page)).state).toBe('paused');
  });

  test('it holds still on larger screens', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the marquee is mobile only');
    await page.goto('/about/');
    expect((await track(page)).name).toBe('none');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('it holds still, with no pause button', async ({ page }) => {
      await page.goto('/about/');
      expect((await track(page)).name).toBe('none');
      await expect(page.getByLabel('Pause the now playing scrolling')).toBeHidden();
    });
  });
});

test('the show and episode link to the podcast, once each for keyboard and screen readers', async ({ page }) => {
  await page.goto('/about/');
  for (const [name, href] of [
    [nowPlaying.show, nowPlaying.showUrl],
    [nowPlaying.episode, nowPlaying.episodeUrl],
  ]) {
    await expect(page.getByRole('link', { name })).toHaveCount(1);
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', href);
  }
});
