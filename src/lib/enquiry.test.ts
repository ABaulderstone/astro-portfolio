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
    const spam = { ok: true, spam: true, reason: 'honeypot filled' };
    expect(parseEnquiry({ ...valid, [HONEYPOT_FIELD]: 'https://spam.example' })).toEqual(spam);
    expect(parseEnquiry({ [HONEYPOT_FIELD]: 'x' })).toEqual(spam);
  });

  // Real submissions the form received
  it.each([
    ['the price bot, its message in quotes', { name: 'Robertcar', mobile: '83961259945', message: '"Hi, roeddwn i eisiau gwybod eich pris."' }, 'message is wrapped in quotes'],
    ['the price bot in Cyrillic', { name: 'Robertcar', mobile: '85958948939', message: '"Прывітанне, я хацеў даведацца Ваш прайс."' }, 'message is wrapped in quotes'],
    ['curly quotes', { message: '“Hi, I wanted to know your price.”' }, 'message is wrapped in quotes'],
    [
      'a sales pitch with links',
      { name: 'Marc Mayne', message: 'Hi team,\n\nSee it in action: open https://lead.example, click the phone.\n\nNot a fit? Opt out here: https://lead.example/unsubscribe' },
      'message has 2 or more links',
    ],
    ['BBCode links', { message: 'Cheap watches [url=https://spam.example]here[/url]' }, 'message has link markup'],
    ['HTML links', { message: 'Cheap watches <a href="https://spam.example">here</a>' }, 'message has link markup'],
    ['a link for a name', { name: 'www.spam.example' }, 'name has a link'],
    ['the price bot without its quotes', { name: 'Robertcar', message: 'Hi, I wanted to know your price.' }, 'name is blocked'],
    ['a blocked name in another case', { name: ' ROBERTCAR ' }, 'name is blocked'],
  ])('flags %s as spam', (_, change, reason) => {
    expect(parseEnquiry({ ...valid, ...change })).toEqual({ ok: true, spam: true, reason });
  });

  it.each([
    ['a real message', 'Hello your website is very cool'],
    ['one link', 'Saw your project, I built something similar: https://github.com/example/thing'],
    ['a quote inside the message', 'Loved the line "ship it" in your last post, so true.'],
    ['a message that only starts with a quote', '"Ship it" is my motto too. Are you free for a chat?'],
  ])("doesn't flag %s", (_, message) => {
    expect(parseEnquiry({ ...valid, message })).toMatchObject({ ok: true, spam: false });
  });

  it("doesn't flag a name that only contains a blocked one", () => {
    expect(parseEnquiry({ ...valid, name: 'Robertcarson' })).toMatchObject({ ok: true, spam: false });
  });

  it('checks the rules every time, as a stateful regex would skip every other match', () => {
    const name = 'https://spam.example';
    expect(parseEnquiry({ ...valid, name })).toMatchObject({ spam: true });
    expect(parseEnquiry({ ...valid, name })).toMatchObject({ spam: true });
  });
});
