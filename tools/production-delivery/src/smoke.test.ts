import { describe, expect, it, vi } from 'vitest';

import type { SmokeConfig } from './config';
import { checkProductionOnce, runProductionSmoke } from './smoke';

const config: SmokeConfig = {
  backofficeUrl: 'https://ops.tofler.tech',
  bffConvexSiteUrl: 'https://calm-otter-123.convex.site',
  bffConvexUrl: 'https://calm-otter-123.convex.cloud',
  commitSha: '0123456789abcdef0123456789abcdef01234567',
  customerAuthUrl: 'https://auth.tofler.app',
  customerEnvironmentKey: 'example-production',
  exampleConvexSiteUrl: 'https://kind-fox-456.convex.site',
  exampleConvexUrl: 'https://kind-fox-456.convex.cloud',
  exampleSessionAdapterUrl: 'https://api.example.tofler.app',
  exampleWebUrl: 'https://example.tofler.app',
};

const baseHeaders = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
};

function staticHeaders(connectSources: string): HeadersInit {
  return {
    ...baseHeaders,
    'content-security-policy': `default-src 'self'; connect-src 'self' ${connectSources}; frame-ancestors 'none'`,
  };
}

function page(connectSources: string, asset: string): Response {
  return new Response(
    `<!doctype html><script type="module" src="${asset}"></script>`,
    { headers: staticHeaders(connectSources) },
  );
}

function metadata(surface: string, commitSha = config.commitSha): Response {
  return Response.json({ commitSha, surface }, { headers: baseHeaders });
}

function healthy(version = config.commitSha): Response {
  return Response.json({
    status: 'ok',
    service: 'business-factory-bff',
    version,
  });
}

function exampleHealthy(version = config.commitSha): Response {
  return Response.json({
    status: 'ok',
    service: 'business-factory-example',
    version,
  });
}

type RouteResponder = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Response;

function corsHeaders(credentials = false): HeadersInit {
  return {
    'access-control-allow-origin': config.exampleWebUrl,
    ...(credentials ? { 'access-control-allow-credentials': 'true' } : {}),
    vary: 'Origin',
  };
}

function routes(): Map<string, RouteResponder> {
  return new Map([
    [`${config.bffConvexSiteUrl}/v1/health`, () => healthy()],
    [
      `${config.bffConvexSiteUrl}/v1/auth/jwks`,
      () =>
        Response.json({
          keys: [
            {
              kty: 'EC',
              crv: 'P-256',
              kid: 'customer-production-key',
              x: 'public-x',
              y: 'public-y',
            },
          ],
        }),
    ],
    [
      `${config.bffConvexSiteUrl}/v1/auth/transactions/development`,
      () => new Response('not found', { status: 404 }),
    ],
    [`${config.exampleConvexSiteUrl}/v1/health`, () => exampleHealthy()],
    [
      `${config.exampleConvexSiteUrl}/v1/context`,
      (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'OPTIONS'
          ? new Response(null, {
              status: 204,
              headers: {
                ...corsHeaders(),
                'access-control-allow-headers': 'Authorization',
                'access-control-allow-methods': 'GET, OPTIONS',
              },
            })
          : new Response('unauthenticated', {
              status: 401,
              headers: corsHeaders(),
            }),
    ],
    [
      `${config.exampleSessionAdapterUrl}/_tofler/auth/context`,
      (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'OPTIONS'
          ? new Response(null, {
              status: 204,
              headers: {
                ...corsHeaders(true),
                'access-control-allow-headers': 'Content-Type, X-Tofler-CSRF',
                'access-control-allow-methods': 'POST, OPTIONS',
              },
            })
          : new Response('unauthenticated', {
              status: 401,
              headers: corsHeaders(true),
            }),
    ],
    [
      `${config.exampleSessionAdapterUrl}/v1/context`,
      () => new Response('not found', { status: 404 }),
    ],
    [
      `${config.exampleSessionAdapterUrl}/_tofler/session-gateway/health`,
      () =>
        Response.json({
          status: 'ok',
          service: 'business-factory-example-session-gateway',
          version: config.commitSha,
        }),
    ],
    [
      `${config.backofficeUrl}/build-metadata.json`,
      () => metadata('business-factory-backoffice'),
    ],
    [
      `${config.backofficeUrl}/`,
      () =>
        page(
          'https://*.convex.cloud https://*.convex.site',
          '/assets/backoffice.js',
        ),
    ],
    [
      `${config.backofficeUrl}/assets/backoffice.js`,
      () => new Response(`${config.bffConvexUrl} ${config.bffConvexSiteUrl}`),
    ],
    [
      `${config.customerAuthUrl}/build-metadata.json`,
      () => metadata('business-factory-customer-auth'),
    ],
    [
      `${config.customerAuthUrl}/`,
      () =>
        page(
          'https://accounts.google.com https://*.convex.site',
          '/assets/customer-auth.js',
        ),
    ],
    [
      `${config.customerAuthUrl}/assets/customer-auth.js`,
      () => new Response(config.bffConvexSiteUrl),
    ],
    [
      `${config.exampleWebUrl}/build-metadata.json`,
      () => metadata('business-factory-example'),
    ],
    [
      `${config.exampleWebUrl}/`,
      () =>
        page(
          'https://*.tofler.app https://*.convex.cloud https://*.convex.site',
          '/assets/example.js',
        ),
    ],
    [
      `${config.exampleWebUrl}/assets/example.js`,
      () =>
        new Response(
          [
            config.bffConvexSiteUrl,
            config.customerEnvironmentKey,
            config.exampleConvexSiteUrl,
            config.exampleConvexUrl,
            config.exampleSessionAdapterUrl,
          ].join(' '),
        ),
    ],
  ]);
}

function createFetcher(
  overrides: ReadonlyMap<string, RouteResponder> = new Map(),
): ReturnType<typeof vi.fn<Fetcher>> {
  const available = new Map([...routes(), ...overrides]);
  return vi.fn<Fetcher>(async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const route = available.get(new URL(url).href);
    if (!route) return new Response('missing test route', { status: 500 });
    return route(input, init);
  });
}

describe('production smoke', () => {
  it('proves both backends, public JWKS, negative auth and all asset SHAs', async () => {
    const fetcher = createFetcher();

    await expect(checkProductionOnce(config, fetcher)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      `${config.bffConvexSiteUrl}/v1/auth/transactions/development`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      `${config.exampleConvexSiteUrl}/v1/context`,
      expect.objectContaining({
        headers: { origin: config.exampleWebUrl },
      }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      `${config.exampleSessionAdapterUrl}/_tofler/auth/context`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          origin: config.exampleWebUrl,
          'x-tofler-csrf': '1',
        }),
      }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      `${config.exampleSessionAdapterUrl}/_tofler/auth/context`,
      expect.objectContaining({ method: 'OPTIONS' }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      `${config.exampleSessionAdapterUrl}/v1/context`,
      expect.anything(),
    );
  });

  it.each([
    [
      'wrong BFF health version',
      `${config.bffConvexSiteUrl}/v1/health`,
      () => healthy('old-version'),
    ],
    [
      'private signing key in JWKS',
      `${config.bffConvexSiteUrl}/v1/auth/jwks`,
      () =>
        Response.json({
          keys: [
            {
              kty: 'EC',
              crv: 'P-256',
              kid: 'bad',
              d: 'private',
            },
          ],
        }),
    ],
    [
      'enabled production dummy route',
      `${config.bffConvexSiteUrl}/v1/auth/transactions/development`,
      () => new Response('enabled', { status: 400 }),
    ],
    [
      'unprotected example API',
      `${config.exampleConvexSiteUrl}/v1/context`,
      () => Response.json({ accountId: 'leaked' }),
    ],
    [
      'unprotected session gateway',
      `${config.exampleSessionAdapterUrl}/_tofler/auth/context`,
      () => Response.json({ token: 'leaked' }),
    ],
    [
      'stale session gateway',
      `${config.exampleSessionAdapterUrl}/_tofler/session-gateway/health`,
      () =>
        Response.json({
          status: 'ok',
          service: 'business-factory-example-session-gateway',
          version: 'old-version',
        }),
    ],
    [
      'stale example asset metadata',
      `${config.exampleWebUrl}/build-metadata.json`,
      () => metadata('business-factory-example', 'old-version'),
    ],
  ])('rejects %s', async (_name, url, responder) => {
    const fetcher = createFetcher(new Map([[url, responder]]));
    await expect(checkProductionOnce(config, fetcher)).rejects.toThrow();
  });

  it('retries a propagating deployment and then succeeds', async () => {
    const healthyFetcher = createFetcher();
    let first = true;
    const fetcher = vi.fn<Fetcher>(async (input, init) => {
      if (first) {
        first = false;
        return new Response('pending', { status: 503 });
      }
      return await healthyFetcher(input, init);
    });
    const sleeper = vi.fn(async () => undefined);

    await expect(
      runProductionSmoke(config, {
        attempts: 2,
        delayMs: 0,
        fetcher,
        sleeper,
      }),
    ).resolves.toBeUndefined();
    expect(sleeper).toHaveBeenCalledOnce();
  });

  it('fails after bounded retry exhaustion', async () => {
    const fetcher = vi.fn<Fetcher>().mockRejectedValue(new Error('offline'));
    const sleeper = vi.fn(async () => undefined);

    await expect(
      runProductionSmoke(config, {
        attempts: 2,
        delayMs: 0,
        fetcher,
        sleeper,
      }),
    ).rejects.toThrow(/failed after 2 attempts/u);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleeper).toHaveBeenCalledOnce();
  });
});

type Fetcher = typeof fetch;
