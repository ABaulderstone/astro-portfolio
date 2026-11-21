import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { projects } from './pages';

test('the projects page lists every project, and a whole card opens its project', async ({ page }) => {
  await page.goto('/projects/');
  const links = page.getByRole('region', { name: 'Projects' }).getByRole('heading', { level: 2 }).getByRole('link');
  await expect(links).toHaveCount(projects.length);
  await expect(links.first()).toHaveAttribute('href', projects[0]);
  // Click the description, not the title: the title link stretches over the card (force, as
  // Playwright otherwise refuses because the link covers it, which is the point)
  await page.locator('[role="region"] article').first().locator('p').last().click({ force: true });
  await expect(page).toHaveURL(new RegExp(`${projects[0]}$`));
});

test('the projects are a grid on desktop and one column on mobile', async ({ page, isMobile }) => {
  test.skip(projects.length < 2, 'needs two projects to compare');
  await page.goto('/projects/');
  const cards = page.getByRole('region', { name: 'Projects' }).locator('article');
  const [first, second] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
  if (isMobile) expect(second.y).toBeGreaterThan(first.y);
  else expect(second.y).toBe(first.y);
});

test('every project links to GitHub, and to its live site only when it has one', async ({ page }) => {
  for (const project of projects) {
    const live = readFileSync(`src/content${project.replace(/\/$/, '')}.md`, 'utf8').match(/^url:\s*(\S+)/m)?.[1];
    await page.goto(project);
    // Only one copy of the links shows (the sidebar on desktop, the header on mobile)
    await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', /^https:\/\/github\.com\//);
    if (live) await expect(page.getByRole('link', { name: 'Live site' })).toHaveAttribute('href', live);
    else await expect(page.getByRole('link', { name: 'Live site' })).toHaveCount(0);
  }
});

test('on desktop a project shows its links and stack beside it, and links back to all projects', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the side panels are desktop only');
  await page.goto(projects[0]);
  const links = page.getByRole('complementary', { name: 'Links' });
  await expect(links.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', /^https:\/\/github\.com\//);
  await expect(page.getByRole('complementary', { name: 'Stack' }).getByRole('listitem').first()).toBeVisible();
  await page.getByRole('link', { name: 'All projects' }).click();
  await expect(page).toHaveURL(/\/projects\/$/);
});

test('on mobile a project shows its links and stack, and the bar steps to older and newer projects', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the bar is mobile only');
  test.skip(projects.length < 2, 'needs two projects to step between');
  const [newest, second] = projects;
  await page.goto(newest);
  const links = page.getByRole('list', { name: 'Links' });
  await expect(links.getByRole('link', { name: 'GitHub' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Stack' }).getByRole('listitem').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /^Newer project:/ })).toHaveCount(0);
  await page.getByRole('link', { name: /^Older project:/ }).click();
  await expect(page).toHaveURL(new RegExp(`${second}$`));
  await page.getByRole('link', { name: /^Newer project:/ }).click();
  await expect(page).toHaveURL(new RegExp(`${newest}$`));
});
