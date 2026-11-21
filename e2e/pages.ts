import { readdirSync, readFileSync } from 'node:fs';
import { POSTS_PER_PAGE } from '../src/lib/blog-config';
import { pageUrl } from '../src/lib/pagination';

// Every route in src/pages (index.astro -> /, about.astro -> /about/), so new pages get checked
// without editing the tests. Dynamic routes are skipped; blog posts, the blog list's pages and
// projects are worked out from the content folders instead (drafts are left out of the build, so
// out of here too).
const staticPages = readdirSync('src/pages', { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.astro') && !file.includes('['))
  .map((file) => file.replace(/\.astro$/, '').replace(/(^|\/)index$/, ''))
  .map((route) => (route === '' ? '/' : `/${route}/`));

/** Paths of a collection's published entries (/<section>/<file name>/), newest first by a date field */
function entries(section: string, dateField: string): string[] {
  return readdirSync(`src/content/${section}`)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({ file, frontmatter: readFileSync(`src/content/${section}/${file}`, 'utf8') }))
    .filter(({ frontmatter }) => !/^draft:\s*true/m.test(frontmatter))
    .map(({ file, frontmatter }) => ({
      path: `/${section}/${file.replace(/\.md$/, '')}/`,
      date: new Date(frontmatter.match(new RegExp(`^${dateField}:\\s*(\\S+)`, 'm'))![1]),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(({ path }) => path);
}

/** Every published post, newest first */
export const posts = entries('blog', 'pubDate');

/** Every published project, newest first */
export const projects = entries('projects', 'date');

const listPages = Array.from({ length: Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE)) }, (_, i) => pageUrl(i + 1));

/** Every page, for the cheap layout checks: a post's content (a wide table, say) can break the layout */
export const pages = [...new Set([...staticPages, ...listPages, ...posts, ...projects])];

/**
 * The pages axe checks: every page except most posts and projects. Each shares one template, so
 * the newest few stand in for the rest rather than running axe on every one as they grow.
 */
export const axePages = [...new Set([...staticPages, ...listPages, ...posts.slice(0, 3), ...projects.slice(0, 3)])];

// axe rule tags for WCAG 2.2 AA, which includes the 4.5:1 text contrast rule
export const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
