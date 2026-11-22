import { describe, expect, it } from 'vitest';
import { HONEYPOT_FIELD, MAX_LENGTHS, parseEnquiry } from './enquiry';

const now = new Date('2026-11-22T10:00:00Z');
const valid = { name: 'Ada', email: 'ada@example.com', message: 'Hello, this is a message.' };

describe('parseEnquiry', () => {
  it('accepts a valid enquiry, trimmed and stamped', () => {
    expect(parseEnquiry({ ...valid, name: '  Ada  ' }, now)).toEqual({
      ok: true,
      spam: false,
      enquiry: { ...valid, receivedAt: '2026-11-22T10:00:00.000Z' },
    });
  });

  it('keeps the mobile number when given, and leaves it out when blank', () => {
    const withMobile = parseEnquiry({ ...valid, mobile: '+61 (0)400 000-000' }, now);
    expect(withMobile.ok && !withMobile.spam && withMobile.enquiry.mobile).toBe('+61 (0)400 000-000');
    const blank = parseEnquiry({ ...valid, mobile: '  ' }, now);
    expect(blank.ok && !blank.spam && 'mobile' in blank.enquiry).toBe(false);
  });

  it.each([
    ['a missing name', { name: '' }, 'name is required'],
    ['an invalid email', { email: 'not-an-email' }, 'email is invalid'],
    ['an invalid mobile', { mobile: 'call me' }, 'mobile is invalid'],
    ['a short message', { message: 'Hi' }, 'message is shorter than 10 characters'],
    ['a long name', { name: 'a'.repeat(MAX_LENGTHS.name + 1) }, 'name is too long'],
    ['a long message', { message: 'a'.repeat(MAX_LENGTHS.message + 1) }, 'message is too long'],
  ])('rejects %s', (_, change, error) => {
    expect(parseEnquiry({ ...valid, ...change })).toEqual({ ok: false, errors: [error] });
  });

  it('rejects a form with no fields at all', () => {
    const result = parseEnquiry({});
    expect(result.ok).toBe(false);
  });

  it('flags a filled honeypot as spam, whatever else is in the form', () => {
    expect(parseEnquiry({ ...valid, [HONEYPOT_FIELD]: 'https://spam.example' })).toEqual({ ok: true, spam: true });
    expect(parseEnquiry({ [HONEYPOT_FIELD]: 'x' })).toEqual({ ok: true, spam: true });
  });
});
