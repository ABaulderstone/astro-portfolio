import { describe, expect, it } from 'vitest';
import { pageItems, pageUrl } from './pagination';

describe('pageUrl', () => {
  it('is /blog/ for the first page and /blog/<n>/ after', () => {
    expect(pageUrl(1)).toBe('/blog/');
    expect(pageUrl(3)).toBe('/blog/3/');
  });
});

describe('pageItems', () => {
  it('lists every page when there are only a few', () => {
    expect(pageItems(1, 1, 2)).toEqual([1]);
    expect(pageItems(2, 3, 0)).toEqual([1, 2, 3]);
  });

  it('keeps the first and last pages and the current one with its siblings', () => {
    expect(pageItems(1, 10, 2)).toEqual([1, 2, 3, 'gap', 10]);
    expect(pageItems(6, 10, 2)).toEqual([1, 'gap', 4, 5, 6, 7, 8, 9, 10]);
    expect(pageItems(5, 10, 0)).toEqual([1, 'gap', 5, 'gap', 10]);
    expect(pageItems(10, 10, 0)).toEqual([1, 'gap', 10]);
  });

  it('shows a lone skipped page rather than a gap', () => {
    expect(pageItems(5, 10, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, 'gap', 10]);
    expect(pageItems(3, 10, 0)).toEqual([1, 2, 3, 'gap', 10]);
  });
});
