// Local stand-ins for the real store and mailer: enquiries go in a JSON file, and emails are
// written to an outbox folder instead of being sent. Both live in the data folder (.dev-data/ by
// default, gitignored).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Enquiry } from '../../src/lib/enquiry.ts';
import type { EnquiryStore, Mailer } from './handler.ts';

/** Every stored enquiry, oldest first (empty before the first one) */
export async function readEnquiries(dir: string): Promise<Enquiry[]> {
  try {
    return JSON.parse(await readFile(join(dir, 'enquiries.json'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export function jsonFileStore(dir: string): EnquiryStore {
  // Saves one at a time, so two submissions at once can't overwrite each other
  let queue = Promise.resolve();
  return {
    save(enquiry) {
      queue = queue.then(async () => {
        await mkdir(dir, { recursive: true });
        const enquiries = await readEnquiries(dir);
        await writeFile(join(dir, 'enquiries.json'), `${JSON.stringify([...enquiries, enquiry], null, 2)}\n`);
      });
      return queue;
    },
  };
}

export function outboxMailer(dir: string): Mailer {
  return {
    async send({ to, subject, text }) {
      const outbox = join(dir, 'outbox');
      await mkdir(outbox, { recursive: true });
      const file = join(outbox, `${new Date().toISOString().replace(/[:.]/g, '-')}-${to}.txt`);
      await writeFile(file, `To: ${to}\nSubject: ${subject}\n\n${text}`);
      console.log(`[contact] email to ${to}: ${subject}`);
    },
  };
}
