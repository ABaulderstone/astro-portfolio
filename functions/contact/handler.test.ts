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

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
const valid = { name: 'Ada', email: 'ada@example.com', mobile: '0400 000 000', message: 'Hello, this is a message.' };

describe('handleContact', () => {
  it('stores a valid enquiry, emails both people and redirects to the thank-you page', async () => {
    const { deps, saved, sent } = fakes();
    expect(await handleContact(form(valid), deps)).toEqual({ status: 303, location: 'https://example.com/contact/thanks/' });
    expect(saved).toEqual([expect.objectContaining(valid)]);
    expect(sent.map((email) => email.to).sort()).toEqual(['ada@example.com', 'owner@example.com']);
    const notification = sent.find((email) => email.to === 'owner@example.com')!;
    expect(notification.subject).toBe('New enquiry from Ada');
    expect(notification.text).toContain('Mobile: 0400 000 000');
    expect(notification.text).toContain(valid.message);
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
