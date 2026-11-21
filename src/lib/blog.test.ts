import { describe, expect, it } from 'vitest';
import { formatDate, readingTime } from './blog';

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
