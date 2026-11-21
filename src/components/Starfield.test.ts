import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Starfield from './Starfield.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('Starfield', () => {
  it('is decorative', async () => {
    const html = await container.renderToString(Starfield);
    expect(html).toMatch(/<div class="starfield[^"]*" aria-hidden="true"/);
  });

  it('renders four star layers, two of them twinkling', async () => {
    const html = await container.renderToString(Starfield);
    expect(html.match(/class="layer/g)).toHaveLength(4);
    expect(html.match(/class="layer twinkle/g)).toHaveLength(2);
    expect(html.match(/--stars: url\(&quot;data:image\/svg\+xml,/g)).toHaveLength(4);
  });

  it('draws the same sky on every render', async () => {
    expect(await container.renderToString(Starfield)).toBe(await container.renderToString(Starfield));
  });
});
