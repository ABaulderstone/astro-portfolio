import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the production build (preview on 4322, so they don't collide with
// the dev server on 4321). Unit tests are Vitest; see vitest.config.ts.
const port = 4322;

// The contact form posts to a contact dev endpoint of the tests' own (8788, so it doesn't collide
// with the dev one on 8787), storing what it gets in test-results/
export const contactPort = 8788;
export const contactEndpoint = `http://localhost:${contactPort}/contact/`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // --ignore-lock keeps preview in the foreground as a one-off server. Without it, Astro moves
      // preview into the background when it detects a coding agent, and Playwright sees it exit.
      command: `npm run build && npm run preview -- --port ${port} --ignore-lock`,
      url: `http://localhost:${port}`,
      env: { PUBLIC_CONTACT_ENDPOINT: contactEndpoint },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node functions/contact/dev-server.ts',
      url: contactEndpoint,
      env: { CONTACT_PORT: String(contactPort), CONTACT_DATA_DIR: 'test-results/contact-data', SITE_URL: `http://localhost:${port}` },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
