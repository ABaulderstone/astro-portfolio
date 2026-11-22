// The contact form's endpoint in dev: a plain Node server, run directly by Node (no build step).
// `astro dev` starts it (the contactDevServer integration in astro.config.mjs), or run it alone
// with `npm run dev:contact`. It's on its own port, so it's cross-origin like the real endpoint.
//
//   POST /contact/  takes the form, stores it, "emails" both people, then 303s back to the site
//   GET  /contact/  lists the stored enquiries as JSON
//
// Settings: CONTACT_PORT (8787), CONTACT_DATA_DIR (.dev-data), SITE_URL (http://localhost:4321)
// and CONTACT_OWNER_EMAIL (owner@example.com).
import { createServer } from 'node:http';
import { jsonFileStore, outboxMailer, readEnquiries } from './dev-deps.ts';
import { handleContact } from './handler.ts';

const port = Number(process.env.CONTACT_PORT ?? 8787);
const dataDir = process.env.CONTACT_DATA_DIR ?? '.dev-data';
const siteUrl = (process.env.SITE_URL ?? 'http://localhost:4321').replace(/\/$/, '');
const ownerEmail = process.env.CONTACT_OWNER_EMAIL ?? 'owner@example.com';

// Far more than the form's longest message, so anything bigger isn't from the form
const maxBody = 16 * 1024;

const deps = { store: jsonFileStore(dataDir), mailer: outboxMailer(dataDir), siteUrl, ownerEmail };

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (path !== '/contact/') return res.writeHead(404).end();

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(await readEnquiries(dataDir), null, 2));
  }
  if (req.method !== 'POST') return res.writeHead(405, { Allow: 'GET, POST' }).end();

  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > maxBody) return res.writeHead(413).end();
  }
  const { status, location } = await handleContact(body, deps);
  console.log(`[contact] POST /contact/ -> ${status} ${location}`);
  res.writeHead(status, { Location: location }).end();
});

server.listen(port, () => console.log(`[contact] dev endpoint on http://localhost:${port}/contact/ (data in ${dataDir}/)`));
