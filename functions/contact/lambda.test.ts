import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import type { ContactDeps } from './handler.ts';
import { type CommandSender, createHandler, decodeBody, dynamoStore, type FunctionUrlEvent, sesMailer } from './lambda.ts';

// A client that records the commands it's given
function recorder() {
  const commands: object[] = [];
  const client: CommandSender = { send: async (command) => void commands.push(command) };
  return { client, commands };
}

const body = new URLSearchParams({ name: 'Ada', email: 'ada@example.com', message: 'Hello, this is a message.' }).toString();
const event = (overrides: Partial<FunctionUrlEvent> = {}): FunctionUrlEvent => ({
  body,
  isBase64Encoded: false,
  requestContext: { http: { method: 'POST' } },
  ...overrides,
});

describe('decodeBody', () => {
  it('passes a plain body through', () => {
    expect(decodeBody(event())).toBe(body);
  });

  it('decodes a base64 body', () => {
    expect(decodeBody(event({ body: Buffer.from(body).toString('base64'), isBase64Encoded: true }))).toBe(body);
  });

  it('treats a missing body as empty', () => {
    expect(decodeBody(event({ body: undefined }))).toBe('');
  });
});

describe('createHandler', () => {
  function deps(): ContactDeps {
    return {
      store: { save: async () => {} },
      mailer: { send: async () => {} },
      siteUrl: 'https://example.com',
      ownerEmail: 'owner@example.com',
      log: vi.fn(),
    };
  }

  it('answers a valid POST with a 303 to the thank-you page', async () => {
    expect(await createHandler(deps())(event())).toEqual({ statusCode: 303, headers: { Location: 'https://example.com/contact/thanks/' } });
  });

  it('handles a base64 body the same way', async () => {
    const result = await createHandler(deps())(event({ body: Buffer.from(body).toString('base64'), isBase64Encoded: true }));
    expect(result.headers.Location).toBe('https://example.com/contact/thanks/');
  });

  it('sends an invalid POST to the error page', async () => {
    expect((await createHandler(deps())(event({ body: 'name=' }))).headers.Location).toBe('https://example.com/contact/error/');
  });

  it('sends anything but a POST to the form', async () => {
    const result = await createHandler(deps())(event({ requestContext: { http: { method: 'GET' } } }));
    expect(result).toEqual({ statusCode: 303, headers: { Location: 'https://example.com/contact/' } });
  });
});

describe('dynamoStore', () => {
  it('puts the enquiry in the table with an id', async () => {
    const { client, commands } = recorder();
    const enquiry = { name: 'Ada', email: 'ada@example.com', message: 'Hi there', receivedAt: '2026-11-23T00:00:00.000Z' };
    await dynamoStore(client, 'enquiries').save(enquiry);
    const [command] = commands as PutCommand[];
    expect(command).toBeInstanceOf(PutCommand);
    expect(command.input).toEqual({ TableName: 'enquiries', Item: { id: expect.any(String), ...enquiry } });
  });
});

describe('sesMailer', () => {
  it('sends a plain-text email from the given address', async () => {
    const { client, commands } = recorder();
    await sesMailer(client, 'Alex <hello@example.com>').send({ to: 'ada@example.com', subject: 'Hi', text: 'Hello', replyTo: 'owner@example.com' });
    const [command] = commands as SendEmailCommand[];
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toEqual({
      FromEmailAddress: 'Alex <hello@example.com>',
      Destination: { ToAddresses: ['ada@example.com'] },
      ReplyToAddresses: ['owner@example.com'],
      Content: { Simple: { Subject: { Data: 'Hi', Charset: 'UTF-8' }, Body: { Text: { Data: 'Hello', Charset: 'UTF-8' } } } },
    });
  });

  it('leaves Reply-To out when there is none', async () => {
    const { client, commands } = recorder();
    await sesMailer(client, 'hello@example.com').send({ to: 'ada@example.com', subject: 'Hi', text: 'Hello' });
    expect((commands[0] as SendEmailCommand).input.ReplyToAddresses).toBeUndefined();
  });
});
