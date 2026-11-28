// The contact form's rules, shared by the form (as validation attributes) and the endpoint that
// receives it, so the two can't drift apart. No Astro imports, and only TypeScript that Node can
// strip, as the contact server (functions/contact/) runs this file directly.

/** Shortest message the form accepts */
export const MESSAGE_MIN_LENGTH = 10;

/** Longest value each field accepts (254 is the longest valid email address) */
export const MAX_LENGTHS = { name: 100, email: 254, mobile: 20, message: 5000 } as const;

/**
 * A lenient phone number: digits with spaces, brackets, dashes and an optional leading +. An HTML
 * `pattern`, which browsers match against the whole value with the `v` flag.
 */
export const MOBILE_PATTERN = '\\+?[0-9 \\(\\)\\-]{8,20}';

/** The hidden field bots fill in and people never see */
export const HONEYPOT_FIELD = 'website';

export interface Enquiry {
  name: string;
  email: string;
  mobile?: string;
  message: string;
  /** ISO 8601 */
  receivedAt: string;
}

export type EnquiryResult =
  | { ok: true; spam: false; enquiry: Enquiry }
  | { ok: true; spam: true; reason: string }
  | { ok: false; errors: string[] };

// Spam looks like this in practice (from the form's own submissions): a bot that sends "I wanted to
// know your price" in a different language each time, its message wrapped in quotes, and sales
// pitches stuffed with links. Real messages rarely do any of these.
const quoted = /^["“].*["”]$/s;
const link = /https?:\/\/|www\./i;
const links = new RegExp(link.source, 'gi');
const markup = /\[url|<a\s/i;
/** A message with this many links or more is spam */
export const MAX_LINKS = 2;
/** Names that only ever send spam, matched in any case against the whole name */
export const BLOCKED_NAMES = ['robertcar'];
const blockedNames = new Set(BLOCKED_NAMES.map((n) => n.toLowerCase()));

/** Why a (valid) enquiry looks like spam, or undefined if it doesn't */
function spamReason({ name, message }: { name: string; message: string }): string | undefined {
  if (quoted.test(message)) return 'message is wrapped in quotes';
  if (markup.test(message)) return 'message has link markup';
  if ((message.match(links)?.length ?? 0) >= MAX_LINKS) return `message has ${MAX_LINKS} or more links`;
  if (link.test(name)) return 'name has a link';
  if (blockedNames.has(name.toLowerCase())) return 'name is blocked';
}

const mobilePattern = new RegExp(`^(?:${MOBILE_PATTERN})$`, 'v');
// As lenient as the browser's type="email": something, an @, something
const emailPattern = /^[^\s@]+@[^\s@]+$/;

/** Checks a submitted form's fields with the same rules the browser applies */
export function parseEnquiry(fields: Record<string, string | undefined>, now = new Date()): EnquiryResult {
  if (fields[HONEYPOT_FIELD]?.trim()) return { ok: true, spam: true, reason: 'honeypot filled' };

  const name = fields.name?.trim() ?? '';
  const email = fields.email?.trim() ?? '';
  const mobile = fields.mobile?.trim() ?? '';
  const message = fields.message?.trim() ?? '';

  const errors: string[] = [];
  if (!name) errors.push('name is required');
  if (!emailPattern.test(email)) errors.push('email is invalid');
  if (mobile && !mobilePattern.test(mobile)) errors.push('mobile is invalid');
  if (message.length < MESSAGE_MIN_LENGTH) errors.push(`message is shorter than ${MESSAGE_MIN_LENGTH} characters`);
  for (const [field, value] of Object.entries({ name, email, mobile, message })) {
    if (value.length > MAX_LENGTHS[field as keyof typeof MAX_LENGTHS]) errors.push(`${field} is too long`);
  }
  if (errors.length) return { ok: false, errors };

  const reason = spamReason({ name, message });
  if (reason) return { ok: true, spam: true, reason };

  return { ok: true, spam: false, enquiry: { name, email, ...(mobile && { mobile }), message, receivedAt: now.toISOString() } };
}
