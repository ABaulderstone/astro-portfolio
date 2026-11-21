// Page links for the blog list. No Astro imports, so the e2e tests can use it too.

/** A list page's URL: page 1 is /blog/ itself */
export function pageUrl(page: number): string {
  return page === 1 ? '/blog/' : `/blog/${page}/`;
}

/**
 * The page numbers to link to: the first and last pages, and `siblings` pages either side of
 * the current one, with 'gap' where pages are skipped. A gap that would hide a single page
 * shows that page instead, since the number takes no more room than the "…".
 */
export function pageItems(current: number, last: number, siblings: number): (number | 'gap')[] {
  const shown = new Set([1, last]);
  for (let page = current - siblings; page <= current + siblings; page++) {
    if (page >= 1 && page <= last) shown.add(page);
  }
  const items: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of [...shown].sort((a, b) => a - b)) {
    if (page - previous === 2) items.push(page - 1);
    else if (page - previous > 2) items.push('gap');
    items.push(page);
    previous = page;
  }
  return items;
}
