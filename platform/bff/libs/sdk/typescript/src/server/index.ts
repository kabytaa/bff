import {
  businessTransportConfigSchema,
  CUSTOMER_AUTH_CSRF_HEADER,
  CUSTOMER_AUTH_CSRF_HEADER_VALUE,
  customerAuthIntentSchema,
  deriveCustomerAuthCallbackUrl,
  publicIdentifierSchema,
  relativeApplicationPathSchema,
  type BusinessTransportConfig,
} from '../core';

export const BFF_SESSION_COOKIE_NAME = '__Host-tofler-session' as const;
export const BFF_CSRF_HEADER = CUSTOMER_AUTH_CSRF_HEADER;
export const BFF_CSRF_HEADER_VALUE = CUSTOMER_AUTH_CSRF_HEADER_VALUE;

const ATTEMPT_COOKIE_PREFIX = '__Host-tofler-attempt-' as const;
const MAX_ATTEMPT_COOKIES = 8;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = 20 * 1024;
const DEFAULT_TIMEOUT_MILLISECONDS = 10_000;

type AttemptPurpose = 'login' | 'ownership_transfer';

interface AttemptCookie {
  purpose: AttemptPurpose;
  verifier: string;
}

interface BffResponse<T> {
  readonly status: number;
  readonly body: T;
}

class BffUnavailableError extends Error {}

export interface BffAuthServerOptions {
  readonly bffBaseUrl: string;
  readonly environmentKey: string;
  readonly transport: BusinessTransportConfig;
  readonly fetch?: typeof fetch;
  readonly timeoutMilliseconds?: number;
}

export interface BffAuthServer {
  handle(request: Request): Promise<Response>;
}

function canonicalOrigin(value: string): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== value ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('bffBaseUrl must be a canonical HTTPS origin');
  }
  return parsed.origin;
}

export function isAllowedWebOrigin(
  origin: string | null,
  transport: BusinessTransportConfig,
): boolean {
  return origin !== null && transport.webOrigins.includes(origin);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function randomOpaqueSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function pkceS256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies.set(name, value);
  }
  return cookies;
}

function attemptCookieName(state: string) {
  return `${ATTEMPT_COOKIE_PREFIX}${state}`;
}

function encodeAttemptCookie(attempt: AttemptCookie) {
  return encodeURIComponent(JSON.stringify(attempt));
}

function decodeAttemptCookie(value: string): AttemptCookie | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('purpose' in parsed) ||
      !('verifier' in parsed) ||
      (parsed.purpose !== 'login' && parsed.purpose !== 'ownership_transfer') ||
      typeof parsed.verifier !== 'string' ||
      parsed.verifier.length !== 43
    ) {
      return null;
    }
    return { purpose: parsed.purpose, verifier: parsed.verifier };
  } catch {
    return null;
  }
}

function attemptCookie(state: string, attempt: AttemptCookie) {
  return `${attemptCookieName(state)}=${encodeAttemptCookie(attempt)}; Max-Age=600; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

function expireAttemptCookie(state: string) {
  return `${attemptCookieName(state)}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

function sessionCookie(sessionHandle: string, absoluteExpiresAt: number) {
  const maxAge = Math.max(
    0,
    Math.floor((absoluteExpiresAt - Date.now()) / 1_000),
  );
  return `${BFF_SESSION_COOKIE_NAME}=${sessionHandle}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=None`;
}

function expireSessionCookie() {
  return `${BFF_SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None`;
}

function appendCookie(headers: Headers, value: string) {
  headers.append('set-cookie', value);
}

function noStoreHeaders(extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.set('cache-control', 'no-store');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-content-type-options', 'nosniff');
  return headers;
}

function jsonResponse(body: unknown, status = 200, extra: HeadersInit = {}) {
  const headers = noStoreHeaders(extra);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

function publicError(
  status: number,
  code: string,
  message: string,
  extra: HeadersInit = {},
) {
  return jsonResponse(
    { error: { code, message, correlationId: randomOpaqueSecret() } },
    status,
    extra,
  );
}

function redirectResponse(location: string, cookies: readonly string[] = []) {
  const headers = noStoreHeaders({ location });
  for (const cookie of cookies) appendCookie(headers, cookie);
  return new Response(null, { status: 303, headers });
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await readBoundedText(
    response.body,
    response.headers.get('content-length'),
    MAX_RESPONSE_BYTES,
  );
  return JSON.parse(text) as unknown;
}

async function readBoundedText(
  body: ReadableStream<Uint8Array> | null,
  declaredLength: string | null,
  maximumBytes: number,
) {
  const contentLength = Number(declaredLength);
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new Error('Message body is too large');
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const reader = body?.getReader();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        await reader.cancel();
        throw new Error('Message body is too large');
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredResponseString(body: unknown, key: string): string {
  if (!isObject(body) || typeof body[key] !== 'string') {
    throw new BffUnavailableError('BFF response is invalid');
  }
  return body[key];
}

function requiredResponseNumber(body: unknown, key: string): number {
  if (
    !isObject(body) ||
    typeof body[key] !== 'number' ||
    !Number.isFinite(body[key])
  ) {
    throw new BffUnavailableError('BFF response is invalid');
  }
  return body[key];
}

function requiredOpaqueSecret(body: unknown, key: string): string {
  const value = requiredResponseString(body, key);
  if (!/^[A-Za-z0-9_-]{43,128}$/u.test(value)) {
    throw new BffUnavailableError('BFF response is invalid');
  }
  return value;
}

function requiredHttpsUrl(body: unknown, key: string): string {
  const value = requiredResponseString(body, key);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BffUnavailableError('BFF response is invalid');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.href !== value
  ) {
    throw new BffUnavailableError('BFF response is invalid');
  }
  return parsed.href;
}

function corsHeaders(origin: string) {
  return {
    'access-control-allow-credentials': 'true',
    'access-control-allow-origin': origin,
    vary: 'Origin',
  };
}

function safeDestination(
  body: unknown,
  transport: BusinessTransportConfig,
): string {
  const webOrigin = requiredResponseString(body, 'webOrigin');
  const returnPath = relativeApplicationPathSchema.safeParse(
    requiredResponseString(body, 'returnPath'),
  );
  if (!transport.webOrigins.includes(webOrigin) || !returnPath.success) {
    throw new BffUnavailableError('BFF returned an unsafe destination');
  }
  return new URL(returnPath.data, `${webOrigin}/`).href;
}

function validateBrowserPost(
  request: Request,
  transport: BusinessTransportConfig,
):
  | { readonly ok: true; readonly origin: string }
  | {
      readonly ok: false;
      readonly error: Response;
    } {
  const origin = request.headers.get('origin');
  if (origin === null || !isAllowedWebOrigin(origin, transport)) {
    return {
      ok: false,
      error: publicError(403, 'FORBIDDEN', 'Origin is not allowed.'),
    };
  }
  if (request.headers.get(BFF_CSRF_HEADER) !== BFF_CSRF_HEADER_VALUE) {
    return {
      ok: false,
      error: publicError(
        403,
        'FORBIDDEN',
        'CSRF validation failed.',
        corsHeaders(origin),
      ),
    };
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return {
      ok: false,
      error: publicError(
        415,
        'INVALID_INPUT',
        'Content-Type must be application/json.',
        corsHeaders(origin),
      ),
    };
  }
  return { ok: true, origin };
}

async function readSmallJson(request: Request) {
  const text = await readBoundedText(
    request.body,
    request.headers.get('content-length'),
    MAX_REQUEST_BYTES,
  );
  const body: unknown = JSON.parse(text);
  if (!isObject(body)) throw new Error('Request body must be an object');
  return body;
}

function optionResponse(request: Request, transport: BusinessTransportConfig) {
  const origin = request.headers.get('origin');
  if (origin === null || !isAllowedWebOrigin(origin, transport)) {
    return publicError(403, 'FORBIDDEN', 'Origin is not allowed.');
  }
  return new Response(null, {
    status: 204,
    headers: noStoreHeaders({
      ...corsHeaders(origin),
      'access-control-allow-headers': `Content-Type, ${BFF_CSRF_HEADER}`,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-max-age': '600',
    }),
  });
}

export function createBffAuthServer(
  rawOptions: BffAuthServerOptions,
): BffAuthServer {
  const bffBaseUrl = canonicalOrigin(rawOptions.bffBaseUrl);
  const environmentKey = rawOptions.environmentKey;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(environmentKey)) {
    throw new Error('environmentKey must be kebab-case');
  }
  const transport = businessTransportConfigSchema.parse(rawOptions.transport);
  const callbackUrl = deriveCustomerAuthCallbackUrl(
    transport.sessionAdapterBaseUrl,
  );
  const fetchImplementation = rawOptions.fetch ?? fetch;
  const timeoutMilliseconds =
    rawOptions.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
  if (
    !Number.isInteger(timeoutMilliseconds) ||
    timeoutMilliseconds < 100 ||
    timeoutMilliseconds > 60_000
  ) {
    throw new Error('timeoutMilliseconds must be between 100 and 60000');
  }

  async function bffRequest<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<BffResponse<T>> {
    try {
      const response = await fetchImplementation(new URL(path, bffBaseUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMilliseconds),
      });
      return {
        status: response.status,
        body: (await readResponseJson(response)) as T,
      };
    } catch {
      throw new BffUnavailableError('BFF request failed');
    }
  }

  async function startLogin(request: Request) {
    const url = new URL(request.url);
    const webOrigin =
      url.searchParams.get('webOrigin') ?? transport.webOrigins[0];
    const returnPath = relativeApplicationPathSchema.parse(
      url.searchParams.get('returnPath') ?? transport.defaultPostLoginPath,
    );
    const intent = customerAuthIntentSchema.parse(
      url.searchParams.get('intent') ?? 'continue',
    );
    if (!webOrigin || !transport.webOrigins.includes(webOrigin)) {
      return publicError(400, 'INVALID_INPUT', 'Web origin is not registered.');
    }
    const attemptCount = [...parseCookies(request).keys()].filter((name) =>
      name.startsWith(ATTEMPT_COOKIE_PREFIX),
    ).length;
    if (attemptCount >= MAX_ATTEMPT_COOKIES) {
      return publicError(
        409,
        'CONFLICT',
        'Too many sign-in attempts are already open.',
      );
    }
    const state = randomOpaqueSecret();
    const verifier = randomOpaqueSecret();
    const response = await bffRequest<Record<string, unknown>>(
      '/v1/auth/transactions',
      {
        environmentKey,
        state,
        pkceChallenge: await pkceS256Challenge(verifier),
        callbackUrl,
        webOrigin,
        returnPath,
        intent,
      },
    );
    if (response.status !== 201) {
      return jsonResponse(response.body, response.status);
    }
    return redirectResponse(
      requiredHttpsUrl(response.body, 'authorizationUrl'),
      [attemptCookie(state, { purpose: 'login', verifier })],
    );
  }

  async function completeCallback(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state || code.length > 128 || state.length > 128) {
      return publicError(400, 'INVALID_INPUT', 'Callback is invalid.');
    }
    const attempt = decodeAttemptCookie(
      parseCookies(request).get(attemptCookieName(state)) ?? '',
    );
    if (!attempt) {
      return publicError(401, 'UNAUTHENTICATED', 'Login attempt expired.');
    }

    if (attempt.purpose === 'ownership_transfer') {
      const exchanged = await bffRequest<Record<string, unknown>>(
        '/v1/auth/transfer/exchange',
        { environmentKey, code, verifier: attempt.verifier, callbackUrl },
      );
      if (exchanged.status !== 200) {
        return jsonResponse(exchanged.body, exchanged.status);
      }
      const completed = await bffRequest<Record<string, unknown>>(
        '/v1/auth/transfer/complete',
        {
          environmentKey,
          transferProof: requiredOpaqueSecret(exchanged.body, 'transferProof'),
        },
      );
      if (completed.status !== 200) {
        return jsonResponse(completed.body, completed.status);
      }
      return redirectResponse(safeDestination(exchanged.body, transport), [
        expireAttemptCookie(state),
      ]);
    }

    const exchanged = await bffRequest<Record<string, unknown>>(
      '/v1/auth/exchange',
      { environmentKey, code, verifier: attempt.verifier, callbackUrl },
    );
    if (exchanged.status !== 200) {
      return jsonResponse(exchanged.body, exchanged.status);
    }
    const sessionHandle = requiredOpaqueSecret(exchanged.body, 'sessionHandle');
    const absoluteExpiresAt = requiredResponseNumber(
      exchanged.body,
      'absoluteExpiresAt',
    );
    if (absoluteExpiresAt <= Date.now()) {
      throw new BffUnavailableError('BFF returned an expired session');
    }
    return redirectResponse(safeDestination(exchanged.body, transport), [
      sessionCookie(sessionHandle, absoluteExpiresAt),
      expireAttemptCookie(state),
    ]);
  }

  async function context(request: Request) {
    const validation = validateBrowserPost(request, transport);
    if (!validation.ok) return validation.error;
    const sessionHandle = parseCookies(request).get(BFF_SESSION_COOKIE_NAME);
    if (!sessionHandle) {
      return publicError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
        corsHeaders(validation.origin),
      );
    }
    const input = await readSmallJson(request);
    const accountId = input.accountId;
    if (
      accountId !== undefined &&
      !publicIdentifierSchema.safeParse(accountId).success
    ) {
      return publicError(
        400,
        'INVALID_INPUT',
        'Account selection is invalid.',
        corsHeaders(validation.origin),
      );
    }
    const response = await bffRequest<Record<string, unknown>>(
      '/v1/auth/session/context',
      {
        environmentKey,
        sessionHandle,
        ...(accountId === undefined ? {} : { accountId }),
      },
    );
    const headers = noStoreHeaders({
      ...corsHeaders(validation.origin),
      'content-type': 'application/json; charset=utf-8',
    });
    if (response.status === 401) appendCookie(headers, expireSessionCookie());
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers,
    });
  }

  async function logout(request: Request) {
    const validation = validateBrowserPost(request, transport);
    if (!validation.ok) return validation.error;
    const sessionHandle = parseCookies(request).get(BFF_SESSION_COOKIE_NAME);
    if (!sessionHandle) {
      return publicError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
        corsHeaders(validation.origin),
      );
    }
    const response = await bffRequest<Record<string, unknown>>(
      '/v1/auth/session/logout',
      { environmentKey, sessionHandle },
    );
    const headers = noStoreHeaders({
      ...corsHeaders(validation.origin),
      'content-type': 'application/json; charset=utf-8',
    });
    if (response.status === 200 || response.status === 401) {
      appendCookie(headers, expireSessionCookie());
    }
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers,
    });
  }

  async function startTransfer(request: Request) {
    const validation = validateBrowserPost(request, transport);
    if (!validation.ok) return validation.error;
    const sessionHandle = parseCookies(request).get(BFF_SESSION_COOKIE_NAME);
    if (!sessionHandle) {
      return publicError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
        corsHeaders(validation.origin),
      );
    }
    const input = await readSmallJson(request);
    const accountId = publicIdentifierSchema.parse(input.accountId);
    const targetMembershipId = publicIdentifierSchema.parse(
      input.targetMembershipId,
    );
    const returnPath = relativeApplicationPathSchema.parse(
      input.returnPath ?? transport.defaultPostLoginPath,
    );
    const attemptCount = [...parseCookies(request).keys()].filter((name) =>
      name.startsWith(ATTEMPT_COOKIE_PREFIX),
    ).length;
    if (attemptCount >= MAX_ATTEMPT_COOKIES) {
      return publicError(
        409,
        'CONFLICT',
        'Too many confirmation attempts are already open.',
        corsHeaders(validation.origin),
      );
    }
    const state = randomOpaqueSecret();
    const verifier = randomOpaqueSecret();
    const response = await bffRequest<Record<string, unknown>>(
      '/v1/auth/transfer/start',
      {
        environmentKey,
        sessionHandle,
        accountId,
        targetMembershipId,
        state,
        pkceChallenge: await pkceS256Challenge(verifier),
        callbackUrl,
        webOrigin: validation.origin,
        returnPath,
      },
    );
    if (response.status !== 201) {
      return jsonResponse(
        response.body,
        response.status,
        corsHeaders(validation.origin),
      );
    }
    const browserResponse = {
      authorizationUrl: requiredHttpsUrl(response.body, 'authorizationUrl'),
      expiresAt: requiredResponseNumber(response.body, 'expiresAt'),
    };
    const headers = noStoreHeaders({
      ...corsHeaders(validation.origin),
      'content-type': 'application/json; charset=utf-8',
    });
    appendCookie(
      headers,
      attemptCookie(state, { purpose: 'ownership_transfer', verifier }),
    );
    return new Response(JSON.stringify(browserResponse), {
      status: 201,
      headers,
    });
  }

  return {
    handle: async (request) => {
      try {
        const { pathname } = new URL(request.url);
        if (request.method === 'GET' && pathname === '/_tofler/auth/login') {
          return await startLogin(request);
        }
        if (request.method === 'GET' && pathname === '/_tofler/auth/callback') {
          return await completeCallback(request);
        }
        if (
          request.method === 'OPTIONS' &&
          (pathname === '/_tofler/auth/context' ||
            pathname === '/_tofler/auth/logout' ||
            pathname === '/_tofler/auth/transfer/start')
        ) {
          return optionResponse(request, transport);
        }
        if (request.method === 'POST' && pathname === '/_tofler/auth/context') {
          return await context(request);
        }
        if (request.method === 'POST' && pathname === '/_tofler/auth/logout') {
          return await logout(request);
        }
        if (
          request.method === 'POST' &&
          pathname === '/_tofler/auth/transfer/start'
        ) {
          return await startTransfer(request);
        }
        return publicError(404, 'INVALID_INPUT', 'Route was not found.');
      } catch (error) {
        const origin = request.headers.get('origin');
        const cors =
          origin !== null && isAllowedWebOrigin(origin, transport)
            ? corsHeaders(origin)
            : {};
        if (error instanceof BffUnavailableError) {
          return publicError(
            503,
            'RETRYABLE_UNAVAILABLE',
            'The authentication service is temporarily unavailable.',
            cors,
          );
        }
        return publicError(
          400,
          'INVALID_INPUT',
          'The request could not be completed.',
          cors,
        );
      }
    },
  };
}
