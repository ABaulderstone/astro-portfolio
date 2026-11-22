// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import { satteri } from '@astrojs/markdown-satteri';
import { taskListLabels } from './src/lib/task-list-labels';
import { contactDevServer } from './functions/contact/integration';

export default defineConfig({
  site: 'https://alexbaulderstone.com',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
  // The contact form's thank-you and error pages aren't worth a search result
  integrations: [sitemap({ filter: (page) => !/\/contact\/(thanks|error)\/$/.test(page) }), contactDevServer()],
  // Where the contact form posts. Required, so a build with nowhere to send messages fails rather
  // than thanking people for messages that went nowhere. .env.development points it at the dev
  // endpoint (functions/contact/); production sets the real one.
  env: {
    schema: {
      PUBLIC_CONTACT_ENDPOINT: envField.string({ context: 'client', access: 'public', url: true }),
    },
  },
  // Code blocks carry both themes; global.css switches to the dark one with the site's theme.
  // github-dark-default rather than github-dark, whose comments miss 4.5:1 contrast
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark-default' } },
    processor: satteri({ hastPlugins: [taskListLabels] }),
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