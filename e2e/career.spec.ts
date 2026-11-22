import { expect, test } from '@playwright/test';
import { stackMarquee } from '../src/lib/marquee';

// The URL hash picks the job: CSS shows the details, stack and (mobile) bar of the job whose
// article is the :target, or the newest job with no hash, so only one job should ever show
const visibleJobs = (page: import('@playwright/test').Page) =>
  page.evaluate(() => [
    ...new Set([...document.querySelectorAll<HTMLElement>('[data-job]')].filter((el) => el.checkVisibility()).map((el) => el.dataset.job)),
  ]);

const jobIds = (page: import('@playwright/test').Page) =>
  page.locator('nav[aria-label="Career timeline"] ol a').evaluateAll((links) => links.map((a) => a.getAttribute('href')!.slice(1)));

test('the newest job is shown with no hash, or an unknown one', async ({ page }) => {
  await page.goto('/career/');
  const [newest] = await jobIds(page);
  expect(await visibleJobs(page)).toEqual([newest]);
  await page.goto('/career/#not-a-job');
  expect(await visibleJobs(page)).toEqual([newest]);
});

test('a hash in the URL selects that job', async ({ page }) => {
  await page.goto('/career/');
  const [, second] = await jobIds(page);
  await page.goto(`/career/#${second}`);
  expect(await visibleJobs(page)).toEqual([second]);
});

test('clicking a job on the timeline puts it in the URL and shows it', async ({ page }) => {
  await page.goto('/career/');
  const [newest, second] = await jobIds(page);
  await page.locator(`nav[aria-label="Career timeline"] ol a[href="#${second}"]`).click();
  await expect(page).toHaveURL(new RegExp(`#${second}$`));
  expect(await visibleJobs(page)).toEqual([second]);
  await expect(page.locator(`article#${second}`)).toBeFocused();

  await page.goBack();
  expect(await visibleJobs(page)).toEqual([newest]);
});

test('on mobile the arrows step to earlier and later jobs', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the arrows are mobile only');
  await page.goto('/career/');
  const [newest, second] = await jobIds(page);
  await expect(page.getByRole('link', { name: /^Later:/ })).toHaveCount(0);
  await page.getByRole('link', { name: /^Earlier:/ }).click();
  expect(await visibleJobs(page)).toEqual([second]);
  await page.getByRole('link', { name: /^Later:/ }).click();
  expect(await visibleJobs(page)).toEqual([newest]);
});

test.describe('mobile stack marquee', () => {
  const track = (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
      const el = [...document.querySelectorAll('[data-job]:not(article) > div')].find((e) => e.checkVisibility())!;
      const style = getComputedStyle(el);
      return { name: style.animationName, state: style.animationPlayState };
    });

  // Jobs whose stack does or doesn't scroll, by the page's own estimate, so the tests don't
  // depend on which job has the longest stack
  const jobsWhereStack = async (page: import('@playwright/test').Page, scrolls: boolean) => {
    await page.goto('/career/');
    const stacks = await page.locator('ul[aria-label^="Stack at"]').evaluateAll((lists) =>
      lists.map((list) => ({
        id: list.closest<HTMLElement>('[data-job]')!.dataset.job!,
        stack: [...list.children].map((li) => li.textContent!.trim()),
      })),
    );
    return stacks.filter(({ stack }) => stackMarquee(stack).scrolls === scrolls).map(({ id }) => id);
  };

  test('a long stack scrolls, and the button pauses it', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the marquee is mobile only');
    const [id] = await jobsWhereStack(page, true);
    test.skip(!id, 'no job has a stack long enough to scroll');
    await page.goto(`/career/#${id}`);
    expect(await track(page)).toEqual({ name: 'marquee', state: 'running' });
    await page.getByLabel('Pause the stack scrolling').check({ force: true });
    expect((await track(page)).state).toBe('paused');
  });

  test('a short stack stays still, with no pause button', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the marquee is mobile only');
    const [id] = await jobsWhereStack(page, false);
    test.skip(!id, 'every job has a stack long enough to scroll');
    await page.goto(`/career/#${id}`);
    expect((await track(page)).name).toBe('none');
    await expect(page.locator('[data-marquee-pause]')).toBeHidden();
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the stack holds still and wraps', async ({ page }) => {
      await page.goto('/career/');
      expect((await track(page)).name).toBe('none');
      await expect(page.locator('[data-marquee-pause]')).toBeHidden();
    });
  });
});
