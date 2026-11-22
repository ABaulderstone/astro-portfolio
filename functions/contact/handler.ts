// Handles a contact form submission, whatever receives it: the dev server (dev-server.ts) now,
// a Lambda later. Each passes in where enquiries are stored and how email is sent, and turns the
// result into its own response. The form is a plain HTML POST, so the answer is always a 303 to
// a page on the site: the thank-you page, or the error page.
import { type Enquiry, parseEnquiry } from '../../src/lib/enquiry.ts';

export interface EnquiryStore {
  save(enquiry: Enquiry): Promise<void>;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
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

/** The reply to the person who got in touch */
export function acknowledgement(enquiry: Enquiry): Email {
  return {
    to: enquiry.email,
    subject: 'Thanks for getting in touch',
    text: `Hi ${enquiry.name},\n\nThanks for your message. I'll get back to you shortly.\n\nAlex\n\n---\nYou wrote:\n\n${enquiry.message}\n`,
  };
}

/** The note to the site's owner */
export function notification(enquiry: Enquiry, ownerEmail: string): Email {
  const details = [`Name: ${enquiry.name}`, `Email: ${enquiry.email}`, enquiry.mobile && `Mobile: ${enquiry.mobile}`, `Received: ${enquiry.receivedAt}`];
  return {
    to: ownerEmail,
    subject: `New enquiry from ${enquiry.name}`,
    text: `${details.filter(Boolean).join('\n')}\n\n${enquiry.message}\n`,
  };
}

/** `body` is the form's URL-encoded fields, as a browser sends them */
export async function handleContact(body: string, deps: ContactDeps): Promise<ContactResponse> {
  const log = deps.log ?? console.error;
  const redirect = (page: 'thanks' | 'error'): ContactResponse => ({ status: 303, location: `${deps.siteUrl}/contact/${page}/` });

  const result = parseEnquiry(Object.fromEntries(new URLSearchParams(body)));
  if (!result.ok) {
    log(`Rejected an enquiry: ${result.errors.join(', ')}`);
    return redirect('error');
  }
  // A bot: thank it and move on, so it can't tell it was caught
  if (result.spam) return redirect('thanks');

  try {
    await deps.store.save(result.enquiry);
    await Promise.all([deps.mailer.send(acknowledgement(result.enquiry)), deps.mailer.send(notification(result.enquiry, deps.ownerEmail))]);
  } catch (error) {
    log('Failed to handle an enquiry', error);
    return redirect('error');
  }
  return redirect('thanks');
}
