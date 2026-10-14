import { z } from 'zod';

import {
  boundedBytes,
  escapeOperationHtml,
  OperationTransportError,
} from './operationsTransport';

const API = 'https://api.resend.com';
const bodyLimit = 256_000;
const providerId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/u);
const attachment = z.object({
  id: providerId,
  filename: z.string().max(500).nullable(),
  content_type: z.string().max(200),
  size: z.number().nonnegative().optional(),
  content_disposition: z.string().nullable().optional(),
});

export interface OperationEmailEnvelope {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  headers: Array<{ name: string; value: string }>;
}
export type SendOutcome =
  | { state: 'accepted'; providerMessageId: string }
  | { state: 'failed'; error: string; retryable: boolean }
  | { state: 'uncertain'; error: string; retryable: false };

async function providerJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(
      new TextDecoder().decode(await boundedBytes(response.body, bodyLimit)),
    );
  } catch {
    throw new OperationTransportError(
      'MAIL_RESPONSE_INVALID',
      502,
      'Mail provider response was invalid.',
    );
  }
}

/** Retry only this immutable payload/key. Timeout/5xx is uncertain, never a new email. */
export async function sendOperationEmail(
  key: string,
  envelope: OperationEmailEnvelope,
  idempotencyKey: string,
): Promise<SendOutcome> {
  if (
    key.length < 16 ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 200
  )
    return {
      state: 'failed',
      error: 'Mail transport is not configured.',
      retryable: false,
    };
  const headers = Object.fromEntries(
    envelope.headers.map(({ name, value }) => [name, value]),
  );
  if (
    [
      envelope.from,
      envelope.to,
      envelope.replyTo,
      envelope.subject,
      ...Object.keys(headers),
      ...Object.values(headers),
    ].some((value) => /[\r\n]/u.test(value))
  )
    return {
      state: 'failed',
      error: 'Invalid mail envelope.',
      retryable: false,
    };
  try {
    const response = await fetch(`${API}/emails`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        from: envelope.from,
        to: [envelope.to],
        reply_to: envelope.replyTo,
        subject: envelope.subject,
        text: envelope.text,
        html: `<div style="white-space:pre-wrap">${escapeOperationHtml(envelope.text)}</div>`,
        ...(envelope.headers.length ? { headers } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
      redirect: 'error',
    });
    if (response.ok) {
      const data = z
        .object({ id: providerId })
        .safeParse(await providerJson(response));
      return data.success
        ? { state: 'accepted', providerMessageId: data.data.id }
        : {
            state: 'uncertain',
            error:
              'Mail provider accepted the request without a valid message ID.',
            retryable: false,
          };
    }
    if (response.status === 429)
      return {
        state: 'failed',
        error: 'Mail provider temporarily rate limited this request.',
        retryable: true,
      };
    if (response.status >= 500 || response.status === 408)
      return {
        state: 'uncertain',
        error:
          'Mail provider result is uncertain; reconcile using the same idempotency key.',
        retryable: false,
      };
    return {
      state: 'failed',
      error: `Mail provider rejected this request (HTTP ${response.status}).`,
      retryable: false,
    };
  } catch {
    return {
      state: 'uncertain',
      error: 'Mail provider result is uncertain; reconcile before any resend.',
      retryable: false,
    };
  }
}

async function readProvider(key: string, path: string): Promise<unknown> {
  const response = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  });
  if (!response.ok)
    throw new OperationTransportError(
      'MAIL_CONTENT_UNAVAILABLE',
      502,
      'Mail content is temporarily unavailable.',
    );
  return await providerJson(response);
}

/** Content and attachment URLs are retrieved from authenticated provider APIs only. */
export async function receiveOperationEmail(key: string, emailId: string) {
  providerId.parse(emailId);
  const [content, files] = await Promise.all([
    readProvider(key, `/emails/receiving/${emailId}?html_format=cid`),
    readProvider(key, `/emails/receiving/${emailId}/attachments`),
  ]);
  const message = z
    .object({
      from: z.string().max(500),
      to: z.array(z.string().max(500)).max(30),
      subject: z.string().max(1000),
      message_id: z.string().max(1000).optional(),
      text: z.string().max(100_000).nullable().optional(),
      html: z.string().max(150_000).nullable().optional(),
      headers: z.record(z.string(), z.string()).optional(),
    })
    .parse(content);
  const attachments = z
    .object({ data: z.array(attachment).max(100) })
    .parse(files).data;
  // HTML is never rendered. This bounded lossy fallback supports HTML-only mail.
  const text =
    message.text?.trim() ||
    message.html
      ?.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '')
      .replace(/<[^>]*>/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim() ||
    '[This email contained no readable text.]';
  return { ...message, text: text.slice(0, 12_000), attachments };
}

export async function receiveOperationAttachmentMetadata(
  key: string,
  emailId: string,
  attachmentId: string,
) {
  providerId.parse(emailId);
  providerId.parse(attachmentId);
  return z
    .object({
      download_url: z.string().url(),
      content_type: z.string().max(200),
      filename: z.string().max(500).nullable(),
      size: z.number().nonnegative().optional(),
    })
    .parse(
      await readProvider(
        key,
        `/emails/receiving/${emailId}/attachments/${attachmentId}`,
      ),
    );
}

export function extractOperationEmailAddress(value: string): string | null {
  if (value.length > 500 || /[\r\n]/u.test(value)) return null;
  const extracted = /<([^<>]+)>\s*$/u.exec(value)?.[1] ?? value;
  const parsed = z.email().max(254).safeParse(extracted.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}
