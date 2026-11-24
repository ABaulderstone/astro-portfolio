// The mobile marquees (the career page's stack, the about page's now playing), shared with the
// e2e tests, so this file has no Astro imports.

/**
 * CSS can't tell when a row overflows, so estimate its width at build time against a phone's
 * panel (about 300px). The duration keeps the speed at about 40px a second whatever the length.
 */
function marquee(width: number) {
  return { scrolls: width > 300, duration: `${Math.round(width / 40)}s` };
}

/**
 * On mobile a stack shows as one row of chips, scrolling if it won't fit: about 7px a character
 * at 14px, plus each chip's padding, border and gap.
 */
export function stackMarquee(stack: string[]) {
  return marquee(stack.reduce((total, tech) => total + tech.length * 7 + 28, 0));
}

/** A line of body text (16px, about 8px a character) that scrolls if it won't fit. */
export function textMarquee(text: string) {
  return marquee(text.length * 8);
}
