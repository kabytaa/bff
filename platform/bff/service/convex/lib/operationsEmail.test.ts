import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  extractOperationEmailAddress,
  receiveOperationEmail,
  sendOperationEmail,
} from './operationsEmail';

afterEach(() => vi.unstubAllGlobals());
const envelope = {
  from: 'Example <help@example.invalid>',
  to: 'customer@example.invalid',
  replyTo: 'reply@example.invalid',
  subject: 'Help',
  text: '<script>not markup</script>',
  headers: [],
};
const key = 'synthetic-mail-key-for-tests-only';

describe('immutable mail transport', () => {
  it('preserves the exact payload and idempotency key across transport retries', async () => {
    const requests: RequestInit[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        requests.push(init);
        return Response.json({ id: 'email_synthetic' });
      }),
    );
    expect(
      await sendOperationEmail(key, envelope, 'approved_reply_synthetic'),
    ).toMatchObject({ state: 'accepted' });
    await sendOperationEmail(key, envelope, 'approved_reply_synthetic');
    expect(requests[0]?.body).toBe(requests[1]?.body);
    expect(new Headers(requests[0]?.headers).get('idempotency-key')).toBe(
      'approved_reply_synthetic',
    );
    expect(JSON.parse(String(requests[0]?.body)).html).toContain(
      '&lt;script&gt;',
    );
  });
  it('does not blindly retry uncertain acceptance, permanent rejection or malformed success', async () => {
    for (const status of [500, 408]) {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('', { status })),
      );
      expect(
        await sendOperationEmail(key, envelope, 'approved_reply_synthetic'),
      ).toMatchObject({ state: 'uncertain', retryable: false });
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 422 })),
    );
    expect(
      await sendOperationEmail(key, envelope, 'approved_reply_synthetic'),
    ).toMatchObject({ state: 'failed', retryable: false });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ unrelated: true })),
    );
    expect(
      await sendOperationEmail(key, envelope, 'approved_reply_synthetic'),
    ).toMatchObject({ state: 'uncertain', retryable: false });
  });
  it('permits a bounded retry after a definite rate-limit rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 429 })),
    );
    expect(
      await sendOperationEmail(key, envelope, 'approved_reply_synthetic'),
    ).toMatchObject({ state: 'failed', retryable: true });
  });
  it('rejects header injection before any request', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(
      await sendOperationEmail(
        key,
        { ...envelope, subject: 'Help\r\nBcc: attacker@example.invalid' },
        'approved_reply_synthetic',
      ),
    ).toMatchObject({ state: 'failed', retryable: false });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses provider IDs, never supplied fetch targets, and strips untrusted markup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/attachments')
          ? Response.json({ data: [] })
          : Response.json({
              from: 'Customer <person@example.invalid>',
              to: ['help@example.invalid'],
              subject: 'Need help',
              text: null,
              html: '<script>attack()</script><p>Print issue</p>',
            }),
      ),
    );
    expect((await receiveOperationEmail(key, 'email_synthetic')).text).toBe(
      'Print issue',
    );
    await expect(receiveOperationEmail(key, '../other')).rejects.toThrow();
  });
  it('parses a contact address without making it an identity grant', () => {
    expect(
      extractOperationEmailAddress('Customer <Person@example.invalid>'),
    ).toBe('person@example.invalid');
    expect(
      extractOperationEmailAddress(
        'person@example.invalid\r\nBcc: attacker@example.invalid',
      ),
    ).toBeNull();
  });
  it('preserves the email body when unsupported attachments have null metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/attachments')
          ? Response.json({
              data: [
                {
                  id: 'pdf_synthetic',
                  filename: null,
                  content_type: 'application/pdf',
                  content_disposition: null,
                },
              ],
            })
          : Response.json({
              from: 'person@example.invalid',
              to: ['help@example.invalid'],
              subject: 'Need help',
              message_id: '<synthetic@example.invalid>',
              text: 'My export failed',
              html: null,
            }),
      ),
    );
    const received = await receiveOperationEmail(key, 'email_synthetic');
    expect(received.text).toBe('My export failed');
    expect(received.message_id).toBe('<synthetic@example.invalid>');
    expect(received.attachments[0]?.content_type).toBe('application/pdf');
  });
  it('retrieves CID HTML so inline screenshots do not inflate the bounded message response', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.endsWith('/attachments')
        ? Response.json({
            data: [
              {
                id: 'inline_synthetic',
                filename: 'Screenshot.png',
                content_type: 'image/png',
                size: 1024 * 1024,
                content_disposition: 'inline',
              },
            ],
          })
        : Response.json({
            from: 'person@example.invalid',
            to: ['help@example.invalid'],
            subject: 'Screenshot',
            text: 'My export failed',
            html: '<p>My export failed</p><img src="cid:screenshot">',
          }),
    );
    vi.stubGlobal('fetch', fetcher);
    const received = await receiveOperationEmail(key, 'email_synthetic');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.resend.com/emails/receiving/email_synthetic?html_format=cid',
      expect.anything(),
    );
    expect(received.text).toBe('My export failed');
    expect(received.attachments[0]?.size).toBe(1024 * 1024);
  });
});
