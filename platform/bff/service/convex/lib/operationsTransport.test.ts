import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  boundedBytes,
  constantTimeSecretEqual,
  escapeOperationHtml,
  inspectOperationScreenshot,
  readOperationJson,
  retrieveOperationAttachment,
  verifyOperationServiceAuthorization,
  verifyResendOperationWebhook,
} from './operationsTransport';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function stream(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

async function signedHeaders(
  payload: string,
  timestamp: number,
  secretBytes: Uint8Array,
) {
  const id = 'evt_synthetic_webhook';
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(secretBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${id}.${timestamp}.${payload}`),
    ),
  );
  return new Headers({
    'svix-id': id,
    'svix-timestamp': String(timestamp),
    'svix-signature': `v1,${btoa(String.fromCharCode(...signature))}`,
  });
}

describe('bounded operations transport', () => {
  it('rejects chunked over-limit input without trusting a claimed length', async () => {
    await expect(
      boundedBytes(stream([new Uint8Array(4), new Uint8Array(4)]), 6),
    ).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    expect(
      await boundedBytes(
        stream([new Uint8Array([1, 2]), new Uint8Array([3])]),
        3,
      ),
    ).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('requires bounded object JSON and the correct content type', async () => {
    await expect(
      readOperationJson(
        new Request('https://example.invalid', { method: 'POST', body: '{}' }),
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readOperationJson(
        new Request('https://example.invalid', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '[]',
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      await readOperationJson(
        new Request('https://example.invalid', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"message":"hello"}',
        }),
      ),
    ).toEqual({ message: 'hello' });
  });

  it('uses separate environment-scoped event authority, not a checkout credential', async () => {
    vi.stubEnv(
      'BFF_OPERATION_EVENT_SECRETS_JSON',
      JSON.stringify({
        'example-development': 'synthetic-event-secret-long-enough-to-test',
      }),
    );
    expect(
      await verifyOperationServiceAuthorization(
        'example-development',
        'Bearer synthetic-event-secret-long-enough-to-test',
      ),
    ).toBe(true);
    expect(
      await verifyOperationServiceAuthorization(
        'other-development',
        'Bearer synthetic-event-secret-long-enough-to-test',
      ),
    ).toBe(false);
    expect(
      await verifyOperationServiceAuthorization(
        'example-development',
        'Bearer wrong',
      ),
    ).toBe(false);
    expect(await constantTimeSecretEqual('same', 'same')).toBe(true);
    expect(await constantTimeSecretEqual('same', 'other')).toBe(false);
  });

  it('verifies exact signed webhook bytes and enforces time and signature bounds', async () => {
    const payload =
      '{"type":"email.delivered","data":{"email_id":"synthetic"}}';
    const bytes = new TextEncoder().encode(
      'synthetic-webhook-key-not-a-real-secret',
    );
    const secret = `whsec_${btoa(String.fromCharCode(...bytes))}`;
    const timestamp = 1_750_000_000;
    const headers = await signedHeaders(payload, timestamp, bytes);
    expect(
      await verifyResendOperationWebhook({
        payload,
        headers,
        secret,
        now: timestamp * 1_000,
      }),
    ).toBe(true);
    expect(
      await verifyResendOperationWebhook({
        payload: payload + ' ',
        headers,
        secret,
        now: timestamp * 1_000,
      }),
    ).toBe(false);
    expect(
      await verifyResendOperationWebhook({
        payload,
        headers,
        secret,
        now: (timestamp + 301) * 1_000,
      }),
    ).toBe(false);
    expect(
      await verifyResendOperationWebhook({
        payload,
        headers: new Headers(),
        secret,
        now: timestamp * 1_000,
      }),
    ).toBe(false);
  });

  it('rejects SVG, archives and mismatched claimed MIME', () => {
    expect(() =>
      inspectOperationScreenshot(
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        ),
      ),
    ).toThrow();
    expect(() =>
      inspectOperationScreenshot(new Uint8Array(24), 'image/png'),
    ).toThrow();
    const png = new Uint8Array(33);
    png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    png.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
    new DataView(png.buffer).setUint32(16, 10);
    new DataView(png.buffer).setUint32(20, 10);
    expect(() => inspectOperationScreenshot(png, 'image/jpeg')).toThrow();
    expect(inspectOperationScreenshot(png, 'image/png')).toMatchObject({
      width: 10,
      height: 10,
      mime: 'image/png',
    });
    new DataView(png.buffer).setUint32(16, 16_000);
    new DataView(png.buffer).setUint32(20, 16_000);
    expect(() => inspectOperationScreenshot(png, 'image/png')).toThrow();
  });

  it('refuses customer-controlled and private-network attachment origins', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    for (const url of [
      'http://download.resend.com/file',
      'https://127.0.0.1/file',
      'https://evil.example/file',
      'https://user:password@download.resend.com/file',
      'http://cdn.resend.app/file',
      'https://cdn.resend.app.evil.example/file',
      'https://other.resend.app/file',
      'https://cdn.resend.app:8443/file',
    ]) {
      await expect(retrieveOperationAttachment(url)).rejects.toMatchObject({
        code: 'ATTACHMENT_ORIGIN',
      });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts the exact authenticated Resend attachment CDN host without redirects', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetcher = vi.fn(async () => new Response(bytes));
    vi.stubGlobal('fetch', fetcher);
    const url =
      'https://cdn.resend.app/attachments/synthetic/preview.png?token=synthetic';
    expect(await retrieveOperationAttachment(url)).toEqual(bytes);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(new URL(url), {
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });

  it('rejects a redirect response without fetching any fallback destination', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://127.0.0.1/private' },
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(
      retrieveOperationAttachment(
        'https://cdn.resend.app/attachments/synthetic',
      ),
    ).rejects.toMatchObject({ code: 'ATTACHMENT_UNAVAILABLE' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(expect.any(URL), {
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });

  it('escapes email text instead of treating it as HTML', () => {
    expect(escapeOperationHtml('<script>alert("x")</script>&')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;',
    );
  });
});
