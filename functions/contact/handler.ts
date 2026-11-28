// Handles a contact form submission, whatever receives it: the dev server (dev-server.ts) or the
// Lambda (lambda.ts). Each passes in where enquiries are stored and how email is sent, and turns the
// result into its own response. The form is a plain HTML POST, so the answer is always a 303 to
// a page on the site: the thank-you page, or the error page.
//
// Only the owner is emailed. There's no acknowledgement to the sender: bots fill the form with
// other people's addresses, and every acknowledgement to one is unwanted mail from the site's SES
// account, risking complaints that get sending suspended. The thank-you page is the acknowledgement.
import { type Enquiry, parseEnquiry } from '../../src/lib/enquiry.ts';

export interface EnquiryStore {
  save(enquiry: Enquiry): Promise<void>;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
  /** Where a reply goes, if not to the sender */
  replyTo?: string;
}

export interface Mailer {
  send(email: Email): Promise<void>;
}

export interface ContactDeps {
  store: EnquiryStore;
  mailer: Mailer;
  /** Where the redirects point, with no trailing slash (https://alexbaulderstone.com) */
  siteUrl: string;
  /** Who gets told about each enquiry */
  ownerEmail: string;
  /** Defaults to console.error */
  log?: (message: string, error?: unknown) => void;
}

export interface ContactResponse {
  status: 303;
  location: string;
}

/** The note to the site's owner, which they can answer by replying */
export function notification(enquiry: Enquiry, ownerEmail: string): Email {
  const details = [`Name: ${enquiry.name}`, `Email: ${enquiry.email}`, enquiry.mobile && `Mobile: ${enquiry.mobile}`, `Received: ${enquiry.receivedAt}`];
  return {
    to: ownerEmail,
    subject: `New enquiry from ${enquiry.name}`,
    replyTo: enquiry.email,
    text: `${details.filter(Boolean).join('\n')}\n\n${enquiry.message}\n`,
  };
}

export interface ContactRequest {
  /** The form's URL-encoded fields, as a browser sends them */
  body: string;
  /** The request's Origin header. A browser posting the form sends the site's; scripts often don't. */
  origin: string | undefined;
}

export async function handleContact({ body, origin }: ContactRequest, deps: ContactDeps): Promise<ContactResponse> {
  const log = deps.log ?? console.error;
  const redirect = (page: 'thanks' | 'error'): ContactResponse => ({ status: 303, location: `${deps.siteUrl}/contact/${page}/` });

  const result = parseEnquiry(Object.fromEntries(new URLSearchParams(body)));
  if (!result.ok) {
    log(`Rejected an enquiry: ${result.errors.join(', ')}`);
    return redirect('error');
  }
  // A bot: thank it and move on, so it can't tell it was caught. The reason goes to the log, so
  // the rules can be checked against what they drop.
  if (result.spam || origin !== new URL(deps.siteUrl).origin) {
    log(`Dropped spam: ${result.spam ? result.reason : `posted from ${origin ?? 'no origin'}`}`);
    return redirect('thanks');
  }

  try {
    await deps.store.save(result.enquiry);
    await deps.mailer.send(notification(result.enquiry, deps.ownerEmail));
  } catch (error) {
    log('Failed to handle an enquiry', error);
    return redirect('error');
  }
  return redirect('thanks');
}
