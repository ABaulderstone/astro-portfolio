import { describe, expect, it } from 'vitest';
import { byYear, formatDate, readingTime, type Post } from './blog';

describe('readingTime', () => {
  it('rounds up at 200 words a minute', () => {
    expect(readingTime('word '.repeat(200))).toBe(1);
    expect(readingTime('word '.repeat(201))).toBe(2);
  });

  it('is at least a minute, and ignores Markdown punctuation', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('## Heading\n\n- one\n- two\n\n---')).toBe(1);
  });
});

describe('formatDate', () => {
  it('formats as day, short month and year in UTC', () => {
    expect(formatDate(new Date('2026-11-01'))).toBe('1 Nov 2026');
  });
});

describe('byYear', () => {
  const post = (id: string, date: string) => ({ id, data: { pubDate: new Date(date) } }) as Post;

  it('groups posts by year, keeping their order', () => {
    const posts = [post('c', '2026-09-01'), post('b', '2026-02-01'), post('a', '2025-06-01')];
    expect(byYear(posts).map(([year, posts]) => [year, posts.map((p) => p.id)])).toEqual([
      [2026, ['c', 'b']],
      [2025, ['a']],
    ]);
  });
});
