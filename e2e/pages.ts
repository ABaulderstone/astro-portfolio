import { readdirSync, readFileSync } from 'node:fs';
import { POSTS_PER_PAGE } from '../src/lib/blog-config';
import { pageUrl } from '../src/lib/pagination';

// Every route in src/pages (index.astro -> /, about.astro -> /about/), so new pages get checked
// without editing the tests. Dynamic routes are skipped; blog posts and the blog list's pages
// are worked out from the content folder instead (drafts are left out of the build, so out of
// here too).
const staticPages = readdirSync('src/pages', { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.astro') && !file.includes('['))
  .map((file) => file.replace(/\.astro$/, '').replace(/(^|\/)index$/, ''))
  .map((route) => (route === '' ? '/' : `/${route}/`));

/** Every published post, newest first */
export const posts = readdirSync('src/content/blog')
  .filter((file) => file.endsWith('.md'))
  .map((file) => ({ file, frontmatter: readFileSync(`src/content/blog/${file}`, 'utf8') }))
  .filter(({ frontmatter }) => !/^draft:\s*true/m.test(frontmatter))
  .map(({ file, frontmatter }) => ({
    path: `/blog/${file.replace(/\.md$/, '')}/`,
    date: new Date(frontmatter.match(/^pubDate:\s*(\S+)/m)![1]),
  }))
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .map(({ path }) => path);

const listPages = Array.from({ length: Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE)) }, (_, i) => pageUrl(i + 1));

/** Every page, for the cheap layout checks: a post's content (a wide table, say) can break the layout */
export const pages = [...new Set([...staticPages, ...listPages, ...posts])];

/**
 * The pages axe checks: every page except most posts. Posts share one template, so the newest
 * few stand in for the rest rather than running axe on every post as the blog grows.
 */
export const axePages = [...new Set([...staticPages, ...listPages, ...posts.slice(0, 3)])];

// axe rule tags for WCAG 2.2 AA, which includes the 4.5:1 text contrast rule
export const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
