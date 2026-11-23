import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Request {
  uri: string;
  headers: Record<string, { value: string }>;
  querystring: Record<string, { value: string; multiValue?: { value: string }[] }>;
}

// rewrite.js is a CloudFront Function script rather than a module, so load it the way CloudFront
// does: as a script that declares handler()
const handler = new Function(`${readFileSync(new URL('./rewrite.js', import.meta.url), 'utf8')}\nreturn handler;`)() as (event: {
  request: Request;
}) => Request | { statusCode: number; headers: { location: { value: string } } };

function run(uri: string, { host = 'alexbaulderstone.com', querystring = {} as Request['querystring'] } = {}) {
  return handler({ request: { uri, headers: { host: { value: host } }, querystring } });
}

describe('rewrite', () => {
  it('serves index.html for directory paths', () => {
    expect(run('/')).toMatchObject({ uri: '/index.html' });
    expect(run('/about/')).toMatchObject({ uri: '/about/index.html' });
    expect(run('/blog/some-post/')).toMatchObject({ uri: '/blog/some-post/index.html' });
  });

  it('leaves files alone', () => {
    expect(run('/rss.xml')).toMatchObject({ uri: '/rss.xml' });
    expect(run('/_astro/index.abc123.css')).toMatchObject({ uri: '/_astro/index.abc123.css' });
  });

  it('redirects a path without a trailing slash, keeping the query string', () => {
    expect(run('/about')).toEqual({ statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: '/about/' } } });
    expect(run('/blog', { querystring: { a: { value: '1' }, b: { value: '' } } })).toMatchObject({ headers: { location: { value: '/blog/?a=1&b' } } });
  });

  it('redirects www to the bare domain', () => {
    expect(run('/about/', { host: 'www.alexbaulderstone.com' })).toMatchObject({
      statusCode: 301,
      headers: { location: { value: 'https://alexbaulderstone.com/about/' } },
    });
  });

  it('keeps repeated query parameters', () => {
    const querystring = { tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] } };
    expect(run('/blog', { querystring })).toMatchObject({ headers: { location: { value: '/blog/?tag=a&tag=b' } } });
  });
});
