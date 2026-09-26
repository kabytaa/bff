import { describe, expect, it, vi } from 'vitest';

import type { SmokeConfig } from './config';
import { checkProductionOnce, runProductionSmoke } from './smoke';

const config: SmokeConfig = {
  backofficeUrl: 'https://ops.tofler.tech',
  commitSha: '0123456789abcdef0123456789abcdef01234567',
  convexSiteUrl: 'https://calm-otter-123.convex.site',
  expectedConvexUrl: 'https://calm-otter-123.convex.cloud',
};

const securityHeaders = {
  'cache-control': 'no-store',
  'content-security-policy':
    "default-src 'self'; connect-src 'self' https://*.convex.cloud https://*.convex.site; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
};

function healthy(version = config.commitSha): Response {
  return Response.json({
    status: 'ok',
    service: 'business-factory-bff',
    version,
  });
}

function dashboard(headers = securityHeaders): Response {
  return new Response(
    '<!doctype html><script type="module" src="/assets/index-123.js"></script>',
    { headers },
  );
}

function bundle(convexUrl = config.expectedConvexUrl): Response {
  return new Response(`const convexUrl=${JSON.stringify(convexUrl)};`);
}

describe('production smoke', () => {
  it('proves health version, dashboard headers and bundle target', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(healthy())
      .mockResolvedValueOnce(dashboard())
      .mockResolvedValueOnce(bundle());

    await expect(checkProductionOnce(config, fetcher)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://calm-otter-123.convex.site/v1/health',
      expect.any(Object),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      'https://ops.tofler.tech/assets/index-123.js',
      expect.any(Object),
    );
  });

  it('retries a propagating deployment and then succeeds', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(new Response('pending', { status: 503 }))
      .mockResolvedValueOnce(healthy())
      .mockResolvedValueOnce(dashboard())
      .mockResolvedValueOnce(bundle());
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

  it.each([
    ['wrong health version', healthy('old-version'), dashboard(), bundle()],
    [
      'missing security header',
      healthy(),
      dashboard({ ...securityHeaders, 'x-frame-options': '' }),
      bundle(),
    ],
    [
      'wrong Convex bundle target',
      healthy(),
      dashboard(),
      bundle('https://other-otter-456.convex.cloud'),
    ],
  ])('rejects %s', async (_name, health, page, asset) => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(health as Response)
      .mockResolvedValueOnce(page as Response)
      .mockResolvedValueOnce(asset as Response);

    await expect(checkProductionOnce(config, fetcher)).rejects.toThrow();
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
    ).rejects.toThrow(/failed after 2 attempts/);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleeper).toHaveBeenCalledOnce();
  });
});

type Fetcher = typeof fetch;
