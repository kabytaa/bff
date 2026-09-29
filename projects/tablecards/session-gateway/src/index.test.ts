import { describe, expect, it, vi } from 'vitest';

import { handleSessionGatewayRequest } from './index';

type GatewayFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const environment = {
  BUILD_VERSION: 'test-version',
  UPSTREAM_ORIGIN: 'https://tablecards-deployment.convex.site',
};

describe('TableCards session gateway', () => {
  it('reports the deployed build without contacting the product backend', async () => {
    const fetcher = vi.fn<GatewayFetch>();
    const response = await handleSessionGatewayRequest(
      new Request(
        'https://api.tablecards-dev.tofler.app/_tofler/session-gateway/health',
      ),
      environment,
      fetcher,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      service: 'business-factory-tablecards-session-gateway',
      version: 'test-version',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('forwards only a fixed auth route and preserves request evidence', async () => {
    const fetcher = vi.fn<GatewayFetch>(async (input) => {
      const request = input as Request;
      expect(request.url).toBe(
        'https://tablecards-deployment.convex.site/_tofler/auth/context',
      );
      expect(request.method).toBe('POST');
      expect(request.headers.get('origin')).toBe(
        'https://tablecards-dev.tofler.app',
      );
      expect(request.headers.get('cookie')).toBe(
        '__Host-tofler-session=opaque-session',
      );
      return new Response('{}', {
        status: 200,
        headers: {
          'access-control-allow-origin': 'https://tablecards-dev.tofler.app',
          'set-cookie':
            '__Host-tofler-session=opaque-session; Path=/; Secure; HttpOnly; SameSite=Lax',
        },
      });
    });

    const response = await handleSessionGatewayRequest(
      new Request(
        'https://api.tablecards-dev.tofler.app/_tofler/auth/context',
        {
          method: 'POST',
          headers: {
            cookie: '__Host-tofler-session=opaque-session',
            origin: 'https://tablecards-dev.tofler.app',
          },
        },
      ),
      environment,
      fetcher,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(
      '__Host-tofler-session=opaque-session',
    );
  });

  it('passes auth redirects through without following them at the edge', async () => {
    const response = await handleSessionGatewayRequest(
      new Request(
        'https://api.tablecards-dev.tofler.app/_tofler/auth/login?returnPath=%2Fcreate',
      ),
      environment,
      vi.fn<GatewayFetch>(async (_input, init) => {
        expect(init?.redirect).toBe('manual');
        return new Response(null, {
          status: 303,
          headers: { location: 'https://auth-dev.tofler.app/' },
        });
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://auth-dev.tofler.app/',
    );
  });

  it('rejects product paths, wrong methods, and non-Convex upstreams', async () => {
    const fetcher = vi.fn<GatewayFetch>();
    const productPath = await handleSessionGatewayRequest(
      new Request('https://api.tablecards-dev.tofler.app/v1/projects'),
      environment,
      fetcher,
    );
    const wrongMethod = await handleSessionGatewayRequest(
      new Request('https://api.tablecards-dev.tofler.app/_tofler/auth/context'),
      environment,
      fetcher,
    );
    const wrongUpstream = await handleSessionGatewayRequest(
      new Request('https://api.tablecards-dev.tofler.app/_tofler/auth/login'),
      { UPSTREAM_ORIGIN: 'https://attacker.example' },
      fetcher,
    );

    expect(productPath.status).toBe(404);
    expect(wrongMethod.status).toBe(405);
    expect(wrongUpstream.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a redacted no-store response when the upstream is unavailable', async () => {
    const response = await handleSessionGatewayRequest(
      new Request('https://api.tablecards-dev.tofler.app/_tofler/auth/login'),
      environment,
      vi.fn<GatewayFetch>(async () => {
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
