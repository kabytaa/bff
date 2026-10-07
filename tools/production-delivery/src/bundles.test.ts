import { describe, expect, it } from 'vitest';

import type { ProductionConfig } from './config';
import {
  assertBackofficeBundleContent,
  assertCustomerAuthBundleContent,
  assertExampleBundleContent,
  assertTableCardsBundleContent,
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
  exampleSessionAdapterUrl: 'https://api.example.tofler.app',
  exampleWebUrl: 'https://example.tofler.app',
};

describe('production bundle assertions', () => {
  it('requires exact TableCards targets and disabled development controls', () => {
    const withTableCards: ProductionConfig = {
      ...config,
      tablecards: {
        convexUrl: 'https://clean-gerbil-451.convex.cloud',
        convexSiteUrl: 'https://clean-gerbil-451.convex.site',
        environmentKey: 'tablecards-production',
        sessionAdapterUrl: 'https://api.tablecards.tofler.app',
        webUrl: 'https://tablecards.tofler.app',
        aiUrl:
          'https://business-factory-tablecards-ai.kabytaa.workers.dev/generate',
        dailyAiBudgetUsd: '1',
      },
    };
    const valid = [
      config.bffConvexSiteUrl,
      withTableCards.tablecards!.convexUrl,
      withTableCards.tablecards!.convexSiteUrl,
      withTableCards.tablecards!.environmentKey,
      withTableCards.tablecards!.sessionAdapterUrl,
      'VITE_TABLECARDS_DEV_CONTROLS:"false"',
    ].join(' ');
    expect(() =>
      assertTableCardsBundleContent(valid, withTableCards),
    ).not.toThrow();
    expect(() =>
      assertTableCardsBundleContent(
        valid.replace('"false"', '`false`'),
        withTableCards,
      ),
    ).not.toThrow();
    expect(() =>
      assertTableCardsBundleContent(
        valid.replace('"false"', '"true"'),
        withTableCards,
      ),
    ).toThrow(/controls/u);
    for (const marker of [
      'tablecards-development',
      'auth-dev.tofler.app',
      'https://other-fox-789.convex.cloud',
    ]) {
      expect(() =>
        assertTableCardsBundleContent(`${valid} ${marker}`, withTableCards),
      ).toThrow();
    }
  });
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
          config.exampleSessionAdapterUrl,
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
          config.exampleSessionAdapterUrl,
          'https://other-fox-789.convex.cloud',
        ].join(' '),
        config,
      ),
    ).toThrow(/unexpected Convex URL/u);
  });
});
