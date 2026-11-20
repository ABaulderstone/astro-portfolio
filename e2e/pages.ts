import { readdirSync } from 'node:fs';

// Every route in src/pages (index.astro -> /, about.astro -> /about/), so new pages get checked
// without editing the tests. Only flat pages for now; extend this when nested routes arrive.
export const pages = readdirSync('src/pages')
  .filter((file) => file.endsWith('.astro'))
  .map((file) => file.replace(/\.astro$/, ''))
  .map((name) => (name === 'index' ? '/' : `/${name}/`));

// axe rule tags for WCAG 2.2 AA, which includes the 4.5:1 text contrast rule
export const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
