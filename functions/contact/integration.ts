// Starts the contact form's dev endpoint (dev-server.ts) alongside `astro dev`, and stops it with
// it, so one command runs both. Dev only: builds and previews never start it.
import { type ChildProcess, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

export function contactDevServer(): AstroIntegration {
  let child: ChildProcess | undefined;
  const stop = () => {
    child?.kill();
    child = undefined;
  };
  return {
    name: 'contact-dev-server',
    hooks: {
      'astro:server:start': ({ logger }) => {
        child = spawn(process.execPath, [fileURLToPath(new URL('./dev-server.ts', import.meta.url))], { stdio: 'inherit' });
        child.on('exit', (code) => {
          // Usually the port is taken, e.g. by `npm run dev:contact` in another terminal
          if (code) logger.warn(`The contact dev endpoint exited (code ${code}); is port ${process.env.CONTACT_PORT ?? 8787} in use?`);
        });
        process.once('exit', stop);
      },
      'astro:server:done': stop,
    },
  };
}
