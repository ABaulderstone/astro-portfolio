import { expect, test } from '@playwright/test';
import { POSTS_PER_PAGE, RSS_POSTS } from '../src/lib/blog-config';
import { posts } from './pages';

test('the blog lists the newest posts, and a whole entry opens its post', async ({ page }) => {
  await page.goto('/blog/');
  const links = page.getByRole('region', { name: 'Posts' }).getByRole('heading', { level: 2 }).getByRole('link');
  await expect(links).toHaveCount(Math.min(posts.length, POSTS_PER_PAGE));
  await expect(links.first()).toHaveAttribute('href', posts[0]);
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
  const [newest, second] = posts;
  await page.goto(newest);
  await expect(page.getByRole('link', { name: /^Newer post:/ })).toHaveCount(0);
  await page.getByRole('link', { name: /^Older post:/ }).click();
  await expect(page).toHaveURL(new RegExp(`${second}$`));
  await page.getByRole('link', { name: /^Newer post:/ }).click();
  await expect(page).toHaveURL(new RegExp(`${newest}$`));
});

test('the RSS feed lists the newest posts, up to its limit', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.ok()).toBe(true);
  expect((await response.text()).match(/<item>/g)).toHaveLength(Math.min(posts.length, RSS_POSTS));
});

test('the blog list pages only when there are more posts than fit on one', async ({ page, request }) => {
  await page.goto('/blog/');
  const pager = page.getByRole('navigation', { name: 'Pages' });
  if (posts.length <= POSTS_PER_PAGE) {
    await expect(pager).toHaveCount(0);
    expect((await request.get('/blog/2/')).status()).toBe(404);
  } else {
    const lastPage = Math.ceil(posts.length / POSTS_PER_PAGE);
    await expect(pager.locator('[aria-current="page"]:visible')).toHaveAccessibleName('Page 1');
    await expect(pager.getByRole('link', { name: `Page ${lastPage}` })).toBeVisible();
    await pager.getByRole('link', { name: 'Older posts' }).click();
    await expect(page).toHaveURL(/\/blog\/2\/$/);
    await expect(pager.locator('[aria-current="page"]:visible')).toHaveAccessibleName('Page 2');
  }
});
