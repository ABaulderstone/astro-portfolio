// Blog settings shared by the pages and the e2e tests, so this file has no Astro imports.

/** Posts on each page of the blog list (/blog/, /blog/2/, ...) */
export const POSTS_PER_PAGE = 10;

/** Posts in the RSS feed, newest first; readers re-download the whole feed, so keep it short */
export const RSS_POSTS = 20;
