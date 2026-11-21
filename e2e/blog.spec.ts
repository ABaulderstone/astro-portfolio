import { expect, test } from '@playwright/test';
import { posts } from './pages';

// Posts as /blog/ lists them, newest first
const newestFirst = async (page: import('@playwright/test').Page) => {
  await page.goto('/blog/');
  return page.getByRole('region', { name: 'Posts' }).locator('h2 a').evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
};

test('the blog lists every post, and a whole entry opens its post', async ({ page }) => {
  await page.goto('/blog/');
  const links = page.getByRole('region', { name: 'Posts' }).getByRole('heading', { level: 2 }).getByRole('link');
  await expect(links).toHaveCount(posts.length);
  const href = await links.first().getAttribute('href');
  // Click the description, not the title: the title link stretches over the entry (force, as
  // Playwright otherwise refuses because the link covers it, which is the point)
  await page.locator('[role="region"] li').first().locator('p').last().click({ force: true });
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('a post has article SEO: Open Graph, canonical URL and BlogPosting data', async ({ page }) => {
  const [post] = posts;
  await page.goto(post);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${post}$`));
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(1);
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(data['@type']).toBe('BlogPosting');
  expect(data.headline).toBe(await page.locator('h1').textContent());
});

test('on desktop a post shows its tags beside it, and links back to all posts', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the side panels are desktop only');
  const [post] = posts;
  await page.goto(post);
  await expect(page.getByRole('complementary', { name: 'Tags' }).getByRole('listitem').first()).toBeVisible();
  await page.getByRole('link', { name: 'All posts' }).click();
  await expect(page).toHaveURL(/\/blog\/$/);
});

test('on mobile the bar steps to older and newer posts', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the bar is mobile only');
  const [newest, second] = await newestFirst(page);
  await page.goto(newest);
  await expect(page.getByRole('link', { name: /^Newer post:/ })).toHaveCount(0);
  await page.getByRole('link', { name: /^Older post:/ }).click();
  await expect(page).toHaveURL(new RegExp(`${second}$`));
  await page.getByRole('link', { name: /^Newer post:/ }).click();
  await expect(page).toHaveURL(new RegExp(`${newest}$`));
});

test('the RSS feed lists every post', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.ok()).toBe(true);
  expect((await response.text()).match(/<item>/g)).toHaveLength(posts.length);
});
