import { expect, test } from '@playwright/test';
import { socials } from '../src/lib/socials';

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
  expect(await form.evaluate((el: HTMLFormElement) => el.checkValidity())).toBe(true);

  // The mobile number is optional, but checked when given
  const mobile = form.getByLabel('Mobile (optional)');
  await mobile.fill('call me');
  await mobile.blur();
  await expect(form.getByText('Please enter a valid phone number.')).toBeVisible();
  expect(await form.evaluate((el: HTMLFormElement) => el.checkValidity())).toBe(false);
  await mobile.fill('+61 (0)400 000-000');
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

test('on desktop the social links sit beside the form, with labels', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the side panel is desktop only');
  await page.goto('/contact/');
  const links = page.getByRole('complementary', { name: 'Elsewhere' }).getByRole('link');
  await expect(links).toHaveCount(socials.length);
  for (const [i, { label, href }] of socials.entries()) {
    await expect(links.nth(i)).toHaveText(label);
    await expect(links.nth(i)).toHaveAttribute('href', href);
  }
});

test('on mobile the social links are icons along the bottom, named for screen readers', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the icon bar is mobile only');
  await page.goto('/contact/');
  const list = page.getByRole('list', { name: 'Social links' });
  for (const { label, href } of socials) {
    const link = list.getByRole('link', { name: label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveText('');
  }
  // Below the form
  const formBox = (await page.getByRole('region', { name: 'Contact form' }).boundingBox())!;
  expect((await list.boundingBox())!.y).toBeGreaterThanOrEqual(formBox.y + formBox.height);
});

// The form fits its panel without scrolling on large screens. With every field on its own line
// it's too tall for a laptop, where it scrolls inside its panel instead
for (const size of [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`the contact form doesn't scroll at ${size.width}x${size.height}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop sizes');
    await page.setViewportSize(size);
    await page.goto('/contact/');
    // Measure with the web fonts in, as the fallback font is narrower and can hide an overflow
    await page.evaluate(() => document.fonts.ready);
    const [scroll, client] = await page
      .getByRole('region', { name: 'Contact form' })
      .evaluate((el) => [el.scrollHeight, el.clientHeight]);
    expect(scroll).toBeLessThanOrEqual(client);
  });
}
