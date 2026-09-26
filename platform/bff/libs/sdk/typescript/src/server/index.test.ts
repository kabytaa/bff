import { describe, expect, it } from 'vitest';

import {
  BFF_CSRF_HEADER,
  BFF_CSRF_HEADER_VALUE,
  BFF_SESSION_COOKIE_NAME,
  createBffAuthServer,
  isAllowedWebOrigin,
} from './index';

const adapterOrigin = 'https://example-backend.convex.site';
const webOrigin = 'https://example.tofler.app';
const bffOrigin = 'https://bff-dev.tofler.tech';
const environmentKey = 'example-development';
const sessionHandle = 's'.repeat(43);

const transport = {
  webOrigins: [webOrigin],
  sessionAdapterBaseUrl: adapterOrigin,
  defaultPostLoginPath: '/',
};

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function createFetchHarness() {
  const calls: FetchCall[] = [];
  const results: Array<Response | Error> = [];
  const implementation: typeof fetch = async (input, init) => {
    calls.push({
      url: input instanceof Request ? input.url : input.toString(),
      init,
    });
    const result = results.shift();
    if (!result) throw new Error('Unexpected fetch');
    if (result instanceof Error) throw result;
    return result;
  };
  return {
    calls,
    enqueue: (...responses: Array<Response | Error>) => {
      results.push(...responses);
    },
    implementation,
  };
}

function createServer(fetchImplementation: typeof fetch) {
  return createBffAuthServer({
    bffBaseUrl: bffOrigin,
    environmentKey,
    transport,
    fetch: fetchImplementation,
  });
}

function requestBody(call: FetchCall): Record<string, unknown> {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

function setCookieHeader(response: Response) {
  return response.headers.get('set-cookie') ?? '';
}

function cookiePair(setCookie: string) {
  return setCookie.split(';', 1)[0] ?? '';
}

function browserPost(path: string, body: unknown, cookie = '') {
  return new Request(`${adapterOrigin}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: webOrigin,
      [BFF_CSRF_HEADER]: BFF_CSRF_HEADER_VALUE,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('isAllowedWebOrigin', () => {
  it('requires an exact registered origin', () => {
    expect(isAllowedWebOrigin(webOrigin, transport)).toBe(true);
    expect(isAllowedWebOrigin('https://other.tofler.app', transport)).toBe(
      false,
    );
    expect(isAllowedWebOrigin(null, transport)).toBe(false);
  });
});

describe('createBffAuthServer', () => {
  it('starts a browser-bound login with PKCE in an independent HttpOnly cookie', async () => {
    const harness = createFetchHarness();
    harness.enqueue(
      json(
        {
          authorizationUrl:
            'https://auth-dev.tofler.app/?transaction=login_1234567890123456',
          expiresAt: Date.now() + 600_000,
        },
        201,
      ),
    );
    const server = createServer(harness.implementation);

    const response = await server.handle(
      new Request(
        `${adapterOrigin}/_tofler/auth/login?webOrigin=${encodeURIComponent(webOrigin)}&returnPath=${encodeURIComponent('/cards?day=today')}`,
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://auth-dev.tofler.app/?transaction=login_1234567890123456',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = requestBody(harness.calls[0]!);
    expect(harness.calls[0]?.url).toBe(`${bffOrigin}/v1/auth/transactions`);
    expect(body).toMatchObject({
      environmentKey,
      callbackUrl: `${adapterOrigin}/_tofler/auth/callback`,
      webOrigin,
      returnPath: '/cards?day=today',
    });
    expect(body.state).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(body.pkceChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(JSON.stringify(body)).not.toContain('verifier');

    const cookie = setCookieHeader(response);
    expect(cookie).toContain(`__Host-tofler-attempt-${String(body.state)}=`);
    expect(cookie).toContain('Max-Age=600');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('exchanges the callback server-side and redirects without exposing the handle', async () => {
    const harness = createFetchHarness();
    harness.enqueue(
      json(
        {
          authorizationUrl:
            'https://auth-dev.tofler.app/?transaction=login_1234567890123456',
          expiresAt: Date.now() + 600_000,
        },
        201,
      ),
    );
    const server = createServer(harness.implementation);
    const started = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/login?returnPath=/cards`),
    );
    const startBody = requestBody(harness.calls[0]!);
    const state = String(startBody.state);
    const attemptCookie = cookiePair(setCookieHeader(started));

    harness.enqueue(
      json({
        sessionHandle,
        absoluteExpiresAt: Date.now() + 3_600_000,
        webOrigin,
        returnPath: '/cards',
      }),
    );
    const callback = await server.handle(
      new Request(
        `${adapterOrigin}/_tofler/auth/callback?code=${'c'.repeat(43)}&state=${state}`,
        { headers: { cookie: attemptCookie } },
      ),
    );

    expect(callback.status).toBe(303);
    expect(callback.headers.get('location')).toBe(`${webOrigin}/cards`);
    expect(callback.headers.get('location')).not.toContain(sessionHandle);
    expect(await callback.text()).toBe('');
    const exchange = requestBody(harness.calls[1]!);
    expect(harness.calls[1]?.url).toBe(`${bffOrigin}/v1/auth/exchange`);
    expect(exchange).toMatchObject({
      environmentKey,
      code: 'c'.repeat(43),
      callbackUrl: `${adapterOrigin}/_tofler/auth/callback`,
    });
    expect(exchange.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/u);

    const cookies = setCookieHeader(callback);
    expect(cookies).toContain(`${BFF_SESSION_COOKIE_NAME}=${sessionHandle}`);
    expect(cookies).toContain('Secure');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('SameSite=None');
    expect(cookies).not.toContain('Domain=');
    expect(cookies).toContain(`__Host-tofler-attempt-${state}=`);
    expect(cookies).toContain('Max-Age=0');
  });

  it('uses the stable cookie only server-to-server and does not renew it on context issuance', async () => {
    const harness = createFetchHarness();
    harness.enqueue(
      json({
        status: 'authenticated',
        token: 'short.jwt.value',
        expiresAt: Date.now() + 600_000,
        customer: { id: 'user_1234567890123456' },
      }),
    );
    const server = createServer(harness.implementation);
    const response = await server.handle(
      browserPost(
        '/_tofler/auth/context',
        { accountId: 'account_1234567890123456' },
        `${BFF_SESSION_COOKIE_NAME}=${sessionHandle}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(webOrigin);
    expect(response.headers.get('access-control-allow-credentials')).toBe(
      'true',
    );
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.text()).not.toContain(sessionHandle);
    expect(requestBody(harness.calls[0]!)).toEqual({
      environmentKey,
      sessionHandle,
      accountId: 'account_1234567890123456',
    });
  });

  it('requires exact Origin, JSON and the non-simple CSRF header before using the cookie', async () => {
    const harness = createFetchHarness();
    const server = createServer(harness.implementation);
    const cookie = `${BFF_SESSION_COOKIE_NAME}=${sessionHandle}`;

    const wrongOrigin = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/context`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://attacker.invalid',
          [BFF_CSRF_HEADER]: BFF_CSRF_HEADER_VALUE,
          cookie,
        },
        body: '{}',
      }),
    );
    const missingCsrf = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/context`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: webOrigin,
          cookie,
        },
        body: '{}',
      }),
    );
    const simpleForm = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/context`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          origin: webOrigin,
          [BFF_CSRF_HEADER]: BFF_CSRF_HEADER_VALUE,
          cookie,
        },
        body: 'accountId=account_1234567890123456',
      }),
    );
    const oversized = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/context`, {
        method: 'POST',
        headers: {
          'content-length': String(20 * 1024 + 1),
          'content-type': 'application/json',
          origin: webOrigin,
          [BFF_CSRF_HEADER]: BFF_CSRF_HEADER_VALUE,
          cookie,
        },
        body: '{}',
      }),
    );

    expect(wrongOrigin.status).toBe(403);
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.headers.get('access-control-allow-origin')).toBe(
      webOrigin,
    );
    expect(simpleForm.status).toBe(415);
    expect(oversized.status).toBe(400);
    expect(oversized.headers.get('access-control-allow-origin')).toBe(
      webOrigin,
    );
    expect(harness.calls).toHaveLength(0);
  });

  it('answers only exact-origin preflight requests', async () => {
    const server = createServer(createFetchHarness().implementation);
    const allowed = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/context`, {
        method: 'OPTIONS',
        headers: { origin: webOrigin },
      }),
    );
    const denied = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/context`, {
        method: 'OPTIONS',
        headers: { origin: 'https://attacker.invalid' },
      }),
    );

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(webOrigin);
    expect(allowed.headers.get('access-control-allow-credentials')).toBe(
      'true',
    );
    expect(allowed.headers.get('access-control-allow-headers')).toContain(
      BFF_CSRF_HEADER,
    );
    expect(denied.status).toBe(403);
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('clears an unavailable session but preserves the cookie on a retryable failure', async () => {
    const harness = createFetchHarness();
    harness.enqueue(
      json({ error: { code: 'RETRYABLE_UNAVAILABLE' } }, 503),
      json({ error: { code: 'SESSION_EXPIRED' } }, 401),
    );
    const server = createServer(harness.implementation);
    const cookie = `${BFF_SESSION_COOKIE_NAME}=${sessionHandle}`;

    const retryable = await server.handle(
      browserPost('/_tofler/auth/context', {}, cookie),
    );
    const expired = await server.handle(
      browserPost('/_tofler/auth/context', {}, cookie),
    );

    expect(retryable.status).toBe(503);
    expect(retryable.headers.get('set-cookie')).toBeNull();
    expect(expired.status).toBe(401);
    expect(setCookieHeader(expired)).toContain(
      `${BFF_SESSION_COOKIE_NAME}=; Max-Age=0`,
    );
  });

  it('revokes the durable session and clears the cookie without exposing the handle', async () => {
    const harness = createFetchHarness();
    harness.enqueue(json({ signedOut: true }));
    const server = createServer(harness.implementation);
    const response = await server.handle(
      browserPost(
        '/_tofler/auth/logout',
        {},
        `${BFF_SESSION_COOKIE_NAME}=${sessionHandle}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(requestBody(harness.calls[0]!)).toEqual({
      environmentKey,
      sessionHandle,
    });
    expect(await response.text()).not.toContain(sessionHandle);
    expect(setCookieHeader(response)).toContain(
      `${BFF_SESSION_COOKIE_NAME}=; Max-Age=0`,
    );
  });

  it('completes ownership transfer privately while keeping the session cookie stable', async () => {
    const harness = createFetchHarness();
    harness.enqueue(
      json(
        {
          authorizationUrl:
            'https://auth-dev.tofler.app/?transaction=transfer_1234567890123456',
          expiresAt: Date.now() + 600_000,
          sessionHandle: 'must-not-reach-the-browser',
        },
        201,
      ),
    );
    const server = createServer(harness.implementation);
    const started = await server.handle(
      browserPost(
        '/_tofler/auth/transfer/start',
        {
          accountId: 'account_1234567890123456',
          targetMembershipId: 'membership_1234567890123456',
          returnPath: '/members',
        },
        `${BFF_SESSION_COOKIE_NAME}=${sessionHandle}`,
      ),
    );

    expect(started.status).toBe(201);
    expect(await started.text()).not.toContain('must-not-reach-the-browser');
    const transferStart = requestBody(harness.calls[0]!);
    const state = String(transferStart.state);
    const attemptCookie = cookiePair(setCookieHeader(started));
    expect(transferStart).toMatchObject({
      environmentKey,
      sessionHandle,
      accountId: 'account_1234567890123456',
      targetMembershipId: 'membership_1234567890123456',
      webOrigin,
      returnPath: '/members',
    });

    harness.enqueue(
      json({
        transferProof: 'p'.repeat(43),
        webOrigin,
        returnPath: '/members',
      }),
      json({ transferred: true }),
    );
    const completed = await server.handle(
      new Request(
        `${adapterOrigin}/_tofler/auth/callback?code=${'c'.repeat(43)}&state=${state}`,
        { headers: { cookie: attemptCookie } },
      ),
    );

    expect(completed.status).toBe(303);
    expect(completed.headers.get('location')).toBe(`${webOrigin}/members`);
    expect(setCookieHeader(completed)).not.toContain(
      `${BFF_SESSION_COOKIE_NAME}=`,
    );
    expect(harness.calls.map((call) => call.url)).toEqual([
      `${bffOrigin}/v1/auth/transfer/start`,
      `${bffOrigin}/v1/auth/transfer/exchange`,
      `${bffOrigin}/v1/auth/transfer/complete`,
    ]);
    expect(requestBody(harness.calls[2]!)).toEqual({
      environmentKey,
      transferProof: 'p'.repeat(43),
    });
  });

  it('rejects mismatched callbacks and bounds concurrent attempt cookies before BFF work', async () => {
    const harness = createFetchHarness();
    const server = createServer(harness.implementation);
    const attemptCookies = Array.from(
      { length: 8 },
      (_, index) => `__Host-tofler-attempt-state${index}=value${index}`,
    ).join('; ');
    const bounded = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/login`, {
        headers: { cookie: attemptCookies },
      }),
    );
    const mismatched = await server.handle(
      new Request(
        `${adapterOrigin}/_tofler/auth/callback?code=${'c'.repeat(43)}&state=${'x'.repeat(43)}`,
        {
          headers: {
            cookie: `__Host-tofler-attempt-${'y'.repeat(43)}=invalid`,
          },
        },
      ),
    );

    expect(bounded.status).toBe(409);
    expect(mismatched.status).toBe(401);
    expect(harness.calls).toHaveLength(0);
  });

  it('maps upstream failures to retryable errors and never writes a malformed cookie', async () => {
    const networkHarness = createFetchHarness();
    networkHarness.enqueue(new Error('offline'));
    const unavailable = await createServer(
      networkHarness.implementation,
    ).handle(new Request(`${adapterOrigin}/_tofler/auth/login`));
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({
      error: { code: 'RETRYABLE_UNAVAILABLE' },
    });

    const oversizedHarness = createFetchHarness();
    oversizedHarness.enqueue(
      new Response('{}', {
        headers: { 'content-length': String(64 * 1024 + 1) },
      }),
    );
    const oversized = await createServer(
      oversizedHarness.implementation,
    ).handle(new Request(`${adapterOrigin}/_tofler/auth/login`));
    expect(oversized.status).toBe(503);

    const malformedHarness = createFetchHarness();
    malformedHarness.enqueue(
      json(
        {
          authorizationUrl:
            'https://auth-dev.tofler.app/?transaction=login_1234567890123456',
          expiresAt: Date.now() + 600_000,
        },
        201,
      ),
    );
    const server = createServer(malformedHarness.implementation);
    const started = await server.handle(
      new Request(`${adapterOrigin}/_tofler/auth/login`),
    );
    const state = String(requestBody(malformedHarness.calls[0]!).state);
    malformedHarness.enqueue(
      json({
        sessionHandle: 'bad; Path=/; Domain=attacker.invalid',
        absoluteExpiresAt: Date.now() + 3_600_000,
        webOrigin,
        returnPath: '/',
      }),
    );
    const callback = await server.handle(
      new Request(
        `${adapterOrigin}/_tofler/auth/callback?code=${'c'.repeat(43)}&state=${state}`,
        { headers: { cookie: cookiePair(setCookieHeader(started)) } },
      ),
    );
    expect(callback.status).toBe(503);
    expect(callback.headers.get('set-cookie')).toBeNull();
  });
});
