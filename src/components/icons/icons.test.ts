import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

// Every icon in this folder, so a new icon is covered without touching this file
const icons = import.meta.glob<{ default: any }>(['./*Icon.astro', '!./Icon.astro'], { eager: true });

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

describe.each(Object.entries(icons))('%s', (_, { default: Icon }) => {
  it('renders a decorative 24px stroked svg in currentColor', async () => {
    const html = await container.renderToString(Icon);
    expect(html).toMatch(/^<svg /);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('fill="none"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toMatch(/<(path|circle) /);
  });

  it('defaults to size-7', async () => {
    expect(await container.renderToString(Icon)).toContain('class="size-7"');
  });

  it('replaces the default class and passes other attributes through', async () => {
    const html = await container.renderToString(Icon, { props: { class: 'size-6 text-nebula-600', 'data-test': 'x' } });
    expect(html).toContain('class="size-6 text-nebula-600"');
    expect(html).not.toContain('size-7');
    expect(html).toContain('data-test="x"');
  });
});
