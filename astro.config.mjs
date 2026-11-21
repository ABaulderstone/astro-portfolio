// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://alexbaulderstone.com',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
  // The contact form's thank-you page isn't worth a search result
  integrations: [sitemap({ filter: (page) => !page.endsWith('/contact/thanks/') })],
  // Code blocks carry both themes; global.css switches to the dark one with the site's theme
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Roboto',
      cssVariable: '--font-roboto',
      weights: [400, 500, 700],
      styles: ['normal', 'italic'],
    },
    {
      provider: fontProviders.google(),
      name: 'Press Start 2P',
      cssVariable: '--font-press-start',
      weights: [400],
      styles: ['normal'],
      fallbacks: ['monospace'],
    },
  ],
});