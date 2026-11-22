// The career page's mobile stack marquee, shared with the e2e tests, so this file has no Astro
// imports.

/**
 * On mobile a stack shows as one row of chips, scrolling as a marquee if it won't fit. CSS can't
 * tell when a row overflows, so estimate it at build time: about 7px a character at 14px, plus
 * each chip's padding, border and gap, against a phone's panel (about 300px). The duration keeps
 * the speed at about 40px a second whatever the length.
 */
export function stackMarquee(stack: string[]) {
  const width = stack.reduce((total, tech) => total + tech.length * 7 + 28, 0);
  return { scrolls: width > 300, duration: `${Math.round(width / 40)}s` };
}
