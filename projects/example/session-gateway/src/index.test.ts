import { describe, expect, it, vi } from 'vitest';

import { handleSessionGatewayRequest } from './index';

const environment = {
  BUILD_VERSION: 'test-version',
  UPSTREAM_ORIGIN: 'https://example-deployment.convex.site',
};

describe('example session gateway', () => {
  it('reports its deployment version without contacting Convex', async () => {
    const fetcher = vi.fn<GatewayFetch>();
    const response = await handleSessionGatewayRequest(
      new Request(
        'https://api.example-dev.tofler.app/_tofler/session-gateway/health',
      ),
      environment,
      fetcher,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      service: 'business-factory-example-session-gateway',
      version: 'test-version',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('forwards only a fixed session route to the configured Convex origin', async () => {
    const fetcher = vi.fn<GatewayFetch>(async (input) => {
      const request = input as Request;
      expect(request.url).toBe(
        'https://example-deployment.convex.site/_tofler/auth/context',
      );
      expect(request.method).toBe('POST');
      expect(request.headers.get('origin')).toBe(
        'https://example-dev.tofler.app',
      );
      expect(request.headers.get('cookie')).toBe(
        '__Host-tofler-session=opaque-session',
      );
      expect(await request.json()).toEqual({ accountId: 'account_example' });
      return new Response('{}', {
        status: 200,
        headers: {
          'access-control-allow-origin': 'https://example-dev.tofler.app',
          'set-cookie':
            '__Host-tofler-session=opaque-session; Path=/; Secure; HttpOnly; SameSite=None',
        },
      });
    });
    const response = await handleSessionGatewayRequest(
      new Request('https://api.example-dev.tofler.app/_tofler/auth/context', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: '__Host-tofler-session=opaque-session',
          origin: 'https://example-dev.tofler.app',
        },
        body: JSON.stringify({ accountId: 'account_example' }),
      }),
      environment,
      fetcher,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(
      '__Host-tofler-session=opaque-session',
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('passes redirects through instead of following them inside Cloudflare', async () => {
    const fetcher = vi.fn<GatewayFetch>(async (_input, init) => {
      expect(init?.redirect).toBe('manual');
      return new Response(null, {
        status: 303,
        headers: {
          location: 'https://auth-dev.tofler.app/?transaction=example',
          'set-cookie':
            '__Host-tofler-attempt-example=opaque; Path=/; Secure; HttpOnly; SameSite=Lax',
        },
      });
    });
    const response = await handleSessionGatewayRequest(
      new Request(
        'https://api.example-dev.tofler.app/_tofler/auth/login?returnPath=%2F',
      ),
      environment,
      fetcher,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('auth-dev.tofler.app');
    expect(response.headers.get('set-cookie')).toContain(
      '__Host-tofler-attempt-example',
    );
  });

  it('rejects paths, methods and non-Convex upstreams without proxying', async () => {
    const fetcher = vi.fn<GatewayFetch>();
    const missing = await handleSessionGatewayRequest(
      new Request('https://api.example-dev.tofler.app/v1/context'),
      environment,
      fetcher,
    );
    const wrongMethod = await handleSessionGatewayRequest(
      new Request('https://api.example-dev.tofler.app/_tofler/auth/context'),
      environment,
      fetcher,
    );
    const wrongUpstream = await handleSessionGatewayRequest(
      new Request('https://api.example-dev.tofler.app/_tofler/auth/login'),
      { UPSTREAM_ORIGIN: 'https://attacker.example' },
      fetcher,
    );

    expect(missing.status).toBe(404);
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('OPTIONS, POST');
    expect(wrongUpstream.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a redacted no-store error when Convex is unavailable', async () => {
    const response = await handleSessionGatewayRequest(
      new Request('https://api.example-dev.tofler.app/_tofler/auth/login'),
      environment,
      vi.fn(async () => {
        throw new Error('private upstream detail');
      }),
    );

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.text()).resolves.not.toContain(
      'private upstream detail',
    );
  });
});

type GatewayFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
