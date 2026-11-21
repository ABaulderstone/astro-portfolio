import { readdirSync, readFileSync } from 'node:fs';

// Every route in src/pages (index.astro -> /, blog/index.astro -> /blog/), so new pages get
// checked without editing the tests. Dynamic routes are skipped; blog posts are added from the
// content folder instead (drafts are left out of the build, so out of here too).
const staticPages = readdirSync('src/pages', { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.astro') && !file.includes('['))
  .map((file) => file.replace(/\.astro$/, '').replace(/(^|\/)index$/, ''))
  .map((route) => (route === '' ? '/' : `/${route}/`));

export const posts = readdirSync('src/content/blog')
  .filter((file) => file.endsWith('.md') && !/^draft:\s*true/m.test(readFileSync(`src/content/blog/${file}`, 'utf8')))
  .map((file) => `/blog/${file.replace(/\.md$/, '')}/`);

export const pages = [...staticPages, ...posts];

// axe rule tags for WCAG 2.2 AA, which includes the 4.5:1 text contrast rule
export const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
