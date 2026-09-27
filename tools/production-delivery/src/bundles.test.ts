import { describe, expect, it } from 'vitest';

import type { ProductionConfig } from './config';
import {
  assertBackofficeBundleContent,
  assertCustomerAuthBundleContent,
  assertExampleBundleContent,
} from './bundles';

const config: ProductionConfig = {
  backofficeUrl: 'https://ops.tofler.tech',
  bffConvexSiteUrl: 'https://calm-otter-123.convex.site',
  bffConvexUrl: 'https://calm-otter-123.convex.cloud',
  commitSha: '0123456789abcdef0123456789abcdef01234567',
  customerAuthUrl: 'https://auth.tofler.app',
  customerEnvironmentKey: 'example-production',
  exampleConvexSiteUrl: 'https://kind-fox-456.convex.site',
  exampleConvexUrl: 'https://kind-fox-456.convex.cloud',
  exampleWebUrl: 'https://example.tofler.app',
};

describe('production bundle assertions', () => {
  it('accepts the exact target set for each surface', () => {
    expect(() =>
      assertBackofficeBundleContent(
        `${config.bffConvexUrl} ${config.bffConvexSiteUrl}`,
        config,
      ),
    ).not.toThrow();
    expect(() =>
      assertCustomerAuthBundleContent(config.bffConvexSiteUrl, config),
    ).not.toThrow();
    expect(() =>
      assertExampleBundleContent(
        [
          config.bffConvexSiteUrl,
          config.customerEnvironmentKey,
          config.exampleConvexSiteUrl,
          config.exampleConvexUrl,
        ].join(' '),
        config,
      ),
    ).not.toThrow();
  });

  it('rejects development markers and unexpected deployment targets', () => {
    expect(() =>
      assertCustomerAuthBundleContent(
        `${config.bffConvexSiteUrl} auth-dev.tofler.app`,
        config,
      ),
    ).toThrow(/forbidden marker/u);
    expect(() =>
      assertExampleBundleContent(
        [
          config.bffConvexSiteUrl,
          config.customerEnvironmentKey,
          config.exampleConvexSiteUrl,
          config.exampleConvexUrl,
          'https://other-fox-789.convex.cloud',
        ].join(' '),
        config,
      ),
    ).toThrow(/unexpected Convex URL/u);
  });
});
