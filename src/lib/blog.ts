import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** Published posts, newest first (drafts too in dev) */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** Minutes to read some Markdown at about 200 words a minute, never less than 1 */
export function readingTime(markdown: string): number {
  const words = markdown.split(/\s+/).filter((word) => /\w/.test(word)).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** A date as it's shown on the site, e.g. 21 Nov 2026 (en-GB, as en-AU spells out June and Sept) */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
