// The contact endpoint in production: a Lambda behind a function URL (infra/contact.tf), around the
// same handleContact the dev server uses, with DynamoDB storing enquiries and SES sending the
// emails. `npm run build:lambda` bundles it into one file, leaving out the AWS SDK, which the Node
// runtime includes.
import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { type ContactDeps, type EnquiryStore, handleContact, type Mailer } from './handler.ts';

/** The parts of a function URL event this reads */
export interface FunctionUrlEvent {
  body?: string;
  isBase64Encoded: boolean;
  requestContext: { http: { method: string } };
}

export interface FunctionUrlResult {
  statusCode: number;
  headers: Record<string, string>;
}

/** Anything that sends AWS SDK commands: a real client, or a fake in the tests */
export interface CommandSender {
  send(command: object): Promise<unknown>;
}

/** Each enquiry is one item, keyed by a random id */
export function dynamoStore(client: CommandSender, tableName: string): EnquiryStore {
  return {
    async save(enquiry) {
      await client.send(new PutCommand({ TableName: tableName, Item: { id: randomUUID(), ...enquiry } }));
    },
  };
}

/** `from` may include a display name (`Alex <hello@example.com>`) */
export function sesMailer(client: CommandSender, from: string): Mailer {
  return {
    async send({ to, subject, text, replyTo }) {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: { ToAddresses: [to] },
          ReplyToAddresses: replyTo ? [replyTo] : undefined,
          Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } },
        }),
      );
    },
  };
}

/** Function URLs base64-encode some bodies, depending on the content type */
export function decodeBody(event: FunctionUrlEvent): string {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

export function createHandler(deps: ContactDeps) {
  return async (event: FunctionUrlEvent): Promise<FunctionUrlResult> => {
    // Someone opening the endpoint in a browser: send them to the form
    if (event.requestContext.http.method !== 'POST') return { statusCode: 303, headers: { Location: `${deps.siteUrl}/contact/` } };
    const { status, location } = await handleContact(decodeBody(event), deps);
    return { statusCode: status, headers: { Location: location } };
  };
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} isn't set`);
  return value;
}

// Built on the first request rather than at import, so the tests can import this file without the
// environment. The clients then live as long as the Lambda's container, so warm requests reuse them.
let contactHandler: ReturnType<typeof createHandler> | undefined;

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  contactHandler ??= createHandler({
    store: dynamoStore(DynamoDBDocumentClient.from(new DynamoDBClient()), env('TABLE_NAME')),
    mailer: sesMailer(new SESv2Client(), env('FROM_EMAIL')),
    siteUrl: env('SITE_URL'),
    ownerEmail: env('OWNER_EMAIL'),
  });
  return contactHandler(event);
}
