import { expect, test } from '@playwright/test';

// Picking a job is a radio group styled as a timeline; CSS shows the selected job's details
// and stack, so only one of each should ever be visible
const visibleJobs = (page: import('@playwright/test').Page, selector: string) =>
  page.evaluate(
    (selector) => [...document.querySelectorAll<HTMLElement>(selector)].filter((el) => el.checkVisibility()).map((el) => el.dataset.job),
    selector,
  );

test('the newest job is shown by default', async ({ page }) => {
  await page.goto('/career/');
  const first = await page.locator('input[name="job"]').first().getAttribute('id');
  expect(await visibleJobs(page, 'article[data-job]')).toEqual([first!.replace(/^job-/, '')]);
  expect(await visibleJobs(page, 'ul[data-job]')).toEqual([first!.replace(/^job-/, '')]);
});

test('clicking a job swaps the details and stack', async ({ page }) => {
  await page.goto('/career/');
  const second = page.locator('input[name="job"]').nth(1);
  const id = (await second.getAttribute('id'))!.replace(/^job-/, '');
  await page.locator(`label[for="job-${id}"]`).click();
  expect(await visibleJobs(page, 'article[data-job]')).toEqual([id]);
  expect(await visibleJobs(page, 'ul[data-job]')).toEqual([id]);
});

test('the arrow keys move between jobs', async ({ page }) => {
  await page.goto('/career/');
  const radios = page.locator('input[name="job"]');
  await radios.first().focus();
  await page.keyboard.press('ArrowDown');
  const id = (await radios.nth(1).getAttribute('id'))!.replace(/^job-/, '');
  await expect(radios.nth(1)).toBeChecked();
  expect(await visibleJobs(page, 'article[data-job]')).toEqual([id]);
});
