import { imageSize } from 'image-size';

import { OPERATOR_WORK_LIMITS } from '@bff/contracts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class OperationTransportError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function boundedBytes(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        throw new OperationTransportError(
          'PAYLOAD_TOO_LARGE',
          413,
          'The content exceeds the permitted size.',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function readOperationJson(
  request: Request,
  maximumBytes = 32_768,
): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    throw new OperationTransportError(
      'INVALID_INPUT',
      415,
      'Use an application/json request.',
    );
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new OperationTransportError(
      'PAYLOAD_TOO_LARGE',
      413,
      'The request is too large.',
    );
  }
  try {
    const value: unknown = JSON.parse(
      decoder.decode(await boundedBytes(request.body, maximumBytes)),
    );
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Object required');
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof OperationTransportError) throw error;
    throw new OperationTransportError(
      'INVALID_INPUT',
      400,
      'The request JSON is invalid.',
    );
  }
}

export async function constantTimeSecretEqual(
  expected: string,
  supplied: string,
): Promise<boolean> {
  if (
    !expected ||
    !supplied ||
    expected.length > 1_024 ||
    supplied.length > 1_024
  )
    return false;
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    );
  const [left, right] = await Promise.all([digest(expected), digest(supplied)]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

export async function verifyOperationServiceAuthorization(
  environmentKey: string,
  authorization: string | null,
): Promise<boolean> {
  const configured = process.env['BFF_OPERATION_EVENT_SECRETS_JSON'];
  if (!configured || !authorization?.startsWith('Bearer ')) return false;
  try {
    const parsed: unknown = JSON.parse(configured);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return false;
    const expected = (parsed as Record<string, unknown>)[environmentKey];
    const supplied = authorization.slice(7);
    return (
      typeof expected === 'string' &&
      expected.length >= 32 &&
      (await constantTimeSecretEqual(expected, supplied))
    );
  } catch {
    return false;
  }
}

/** Verify the exact raw Svix payload, with a bounded clock-skew/replay window. */
export async function verifyResendOperationWebhook(input: {
  payload: string;
  headers: Headers;
  secret: string;
  now?: number;
}): Promise<boolean> {
  const id = input.headers.get('svix-id');
  const timestamp = input.headers.get('svix-timestamp');
  const signatures = input.headers.get('svix-signature');
  if (
    !id ||
    id.length > 200 ||
    !timestamp ||
    !/^\d{1,12}$/.test(timestamp) ||
    !signatures ||
    signatures.length > 2_048 ||
    input.payload.length > 64_000 ||
    !input.secret.startsWith('whsec_')
  )
    return false;
  const seconds = Number(timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(seconds) || Math.abs(now / 1_000 - seconds) > 300)
    return false;
  try {
    const secretBytes = Uint8Array.from(
      atob(input.secret.slice(6)),
      (character) => character.charCodeAt(0),
    );
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${id}.${timestamp}.${input.payload}`),
      ),
    );
    const encoded = btoa(String.fromCharCode(...signature));
    for (const candidate of signatures.split(' ')) {
      const [version, value] = candidate.split(',');
      if (
        version === 'v1' &&
        value &&
        (await constantTimeSecretEqual(encoded, value))
      )
        return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function inspectOperationScreenshot(
  bytes: Uint8Array,
  claimedMime?: string,
) {
  if (
    bytes.byteLength > OPERATOR_WORK_LIMITS.attachmentBytes ||
    bytes.byteLength < 24
  ) {
    throw new OperationTransportError(
      'IMAGE_SIZE',
      413,
      'Only bounded screenshot images can be previewed.',
    );
  }
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (value, index) => bytes[index] === value,
  );
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : undefined;
  if (!mime || (claimedMime && claimedMime !== mime)) {
    throw new OperationTransportError(
      'UNSUPPORTED_IMAGE',
      415,
      'Only verified PNG and JPEG screenshots are supported.',
    );
  }
  try {
    const { width, height } = imageSize(bytes);
    if (
      !width ||
      !height ||
      width < 1 ||
      height < 1 ||
      width > 16_000 ||
      height > 16_000 ||
      width * height > OPERATOR_WORK_LIMITS.attachmentPixels
    )
      throw new Error('Image dimension limit');
    return { mime, width, height, bytes: bytes.byteLength };
  } catch {
    throw new OperationTransportError(
      'INVALID_IMAGE',
      422,
      'The screenshot cannot be safely processed.',
    );
  }
}

/** Only authenticated provider metadata may supply this URL; never customer input. */
export async function retrieveOperationAttachment(
  downloadUrl: string,
): Promise<Uint8Array> {
  const url = new URL(downloadUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    (url.hostname !== 'cdn.resend.app' &&
      !/\.(?:resend\.com|resend\.dev|amazonaws\.com|r2\.cloudflarestorage\.com)$/.test(
        url.hostname,
      ))
  ) {
    throw new OperationTransportError(
      'ATTACHMENT_ORIGIN',
      422,
      'The attachment provider address is not approved.',
    );
  }
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new OperationTransportError(
      'ATTACHMENT_UNAVAILABLE',
      502,
      'The attachment is unavailable.',
    );
  const declared = Number(response.headers.get('content-length'));
  if (
    Number.isFinite(declared) &&
    declared > OPERATOR_WORK_LIMITS.attachmentBytes
  ) {
    await response.body?.cancel();
    throw new OperationTransportError(
      'IMAGE_SIZE',
      413,
      'The screenshot exceeds the size limit.',
    );
  }
  return await boundedBytes(
    response.body,
    OPERATOR_WORK_LIMITS.attachmentBytes,
  );
}

export function operationResponseHeaders(cors: HeadersInit = {}): Headers {
  const headers = new Headers(cors);
  headers.set('cache-control', 'private, no-store');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'no-referrer');
  return headers;
}

export function operationJson(
  value: unknown,
  status = 200,
  cors: HeadersInit = {},
) {
  const headers = operationResponseHeaders(cors);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(value), { status, headers });
}

export function escapeOperationHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
}
