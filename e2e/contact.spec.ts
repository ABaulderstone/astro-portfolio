import { expect, test } from '@playwright/test';

test('the browser blocks an empty or invalid contact form, and the error shows after leaving a field', async ({ page }) => {
  await page.goto('/contact/');
  const form = page.getByRole('form', { name: 'Contact' });
  const email = form.getByLabel('Email');
  const emailError = form.getByText('Please enter a valid email address.');

  // Reserved but not shown until the field has been used
  await expect(emailError).toBeHidden();
  await email.fill('not-an-email');
  await email.blur();
  await expect(emailError).toBeVisible();

  await form.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/contact\/$/);
  expect(await form.evaluate((el: HTMLFormElement) => el.checkValidity())).toBe(false);

  await form.getByLabel('Name').fill('Ada');
  await email.fill('ada@example.com');
  await form.getByLabel('Message').fill('Hello, this is a message.');
  await expect(emailError).toBeHidden();
  expect(await form.evaluate((el: HTMLFormElement) => el.checkValidity())).toBe(true);

  await form.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/contact\/thanks\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thank you');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('the thank-you page is kept out of search results', async ({ page, request }) => {
  await page.goto('/contact/thanks/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  expect(await (await request.get('/sitemap-0.xml')).text()).not.toContain('/contact/thanks/');
});
