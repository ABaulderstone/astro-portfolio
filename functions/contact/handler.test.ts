import { describe, expect, it, vi } from 'vitest';
import type { Enquiry } from '../../src/lib/enquiry.ts';
import { type ContactDeps, type Email, handleContact } from './handler.ts';

// In-memory stand-ins for the store and mailer, recording what they were given
function fakes(overrides: Partial<ContactDeps> = {}) {
  const saved: Enquiry[] = [];
  const sent: Email[] = [];
  const deps: ContactDeps = {
    store: { save: async (enquiry) => void saved.push(enquiry) },
    mailer: { send: async (email) => void sent.push(email) },
    siteUrl: 'https://example.com',
    ownerEmail: 'owner@example.com',
    log: vi.fn(),
    ...overrides,
  };
  return { deps, saved, sent };
}

const origin = 'https://example.com';
const form = (fields: Record<string, string>) => ({ body: new URLSearchParams(fields).toString(), origin });
const valid = { name: 'Ada', email: 'ada@example.com', mobile: '0400 000 000', message: 'Hello, this is a message.' };

describe('handleContact', () => {
  it('stores a valid enquiry, emails only the owner and redirects to the thank-you page', async () => {
    const { deps, saved, sent } = fakes();
    expect(await handleContact(form(valid), deps)).toEqual({ status: 303, location: 'https://example.com/contact/thanks/' });
    expect(saved).toEqual([expect.objectContaining(valid)]);
    // Nothing to the sender: a bot's address is often a stranger's
    expect(sent.map((email) => email.to)).toEqual(['owner@example.com']);
    const notification = sent[0];
    expect(notification.subject).toBe('New enquiry from Ada');
    expect(notification.text).toContain('Mobile: 0400 000 000');
    expect(notification.text).toContain(valid.message);
    expect(notification.replyTo).toBe('ada@example.com');
  });

  it('redirects an invalid enquiry to the error page without storing or emailing it', async () => {
    const { deps, saved, sent } = fakes();
    expect(await handleContact(form({ ...valid, email: 'nope' }), deps)).toEqual({ status: 303, location: 'https://example.com/contact/error/' });
    expect(saved).toEqual([]);
    expect(sent).toEqual([]);
    expect(deps.log).toHaveBeenCalledWith('Rejected an enquiry: email is invalid');
  });

  it('thanks a bot that filled the honeypot, but drops its enquiry', async () => {
    const { deps, saved, sent } = fakes();
    expect((await handleContact(form({ ...valid, website: 'https://spam.example' }), deps)).location).toBe('https://example.com/contact/thanks/');
    expect(saved).toEqual([]);
    expect(sent).toEqual([]);
  });

  it('thanks a message the spam rules catch, but drops it and logs why', async () => {
    const { deps, saved, sent } = fakes();
    const spam = { name: 'Robertcar', email: 'someone@example.com', mobile: '83961259945', message: '"Hi, I wanted to know your price."' };
    expect((await handleContact(form(spam), deps)).location).toBe('https://example.com/contact/thanks/');
    expect(saved).toEqual([]);
    expect(sent).toEqual([]);
    expect(deps.log).toHaveBeenCalledWith('Dropped spam: message is wrapped in quotes');
  });

  it.each([
    ['no Origin header', undefined, 'no origin'],
    ['another site', 'https://spam.example', 'https://spam.example'],
    ['the right host over http', 'http://example.com', 'http://example.com'],
  ])('thanks a post from %s, but drops it', async (_, badOrigin, logged) => {
    const { deps, saved, sent } = fakes();
    expect((await handleContact({ ...form(valid), origin: badOrigin }, deps)).location).toBe('https://example.com/contact/thanks/');
    expect(saved).toEqual([]);
    expect(sent).toEqual([]);
    expect(deps.log).toHaveBeenCalledWith(`Dropped spam: posted from ${logged}`);
  });

  it('still sends an invalid post with no Origin to the error page', async () => {
    const { deps } = fakes();
    expect((await handleContact({ ...form({ ...valid, email: 'nope' }), origin: undefined }, deps)).location).toBe('https://example.com/contact/error/');
  });

  it('redirects to the error page when storing fails, and sends no email', async () => {
    const { deps, sent } = fakes({ store: { save: async () => Promise.reject(new Error('disk full')) } });
    expect((await handleContact(form(valid), deps)).location).toBe('https://example.com/contact/error/');
    expect(sent).toEqual([]);
    expect(deps.log).toHaveBeenCalledWith('Failed to handle an enquiry', expect.any(Error));
  });

  it('redirects to the error page when an email fails', async () => {
    const { deps } = fakes({ mailer: { send: async () => Promise.reject(new Error('mail down')) } });
    expect((await handleContact(form(valid), deps)).location).toBe('https://example.com/contact/error/');
  });
});
