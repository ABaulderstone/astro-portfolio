import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import SiteNav from './SiteNav.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (path: string) =>
  container.renderToString(SiteNav, { request: new Request(`https://alexbaulderstone.com${path}`) });

// The opening tag of each link to `href` (desktop nav and mobile drawer)
const linksTo = (html: string, href: string) => html.match(new RegExp(`<a href="${href}"[^>]*>`, 'g')) ?? [];

describe('SiteNav', () => {
  it('marks the current section in both navs', async () => {
    const html = await render('/about/');
    const about = linksTo(html, '/about/');
    expect(about).toHaveLength(2);
    for (const tag of about) expect(tag).toContain('aria-current="page"');
    for (const tag of linksTo(html, '/blog/')) expect(tag).not.toContain('aria-current');
  });

  it('marks only home as current on the home page', async () => {
    const html = await render('/');
    expect(linksTo(html, '/').every((tag) => tag.includes('aria-current="page"'))).toBe(true);
    expect(html.match(/aria-current="page"/g)).toHaveLength(2);
  });

  it('gives icon-only controls an accessible name', async () => {
    const html = await render('/');
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-label="Open menu"');
    expect(html).toContain('aria-label="Close menu"');
  });
});
