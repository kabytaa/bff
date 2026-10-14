import { describe, expect, it } from 'vitest';

import { operatorProviderDryRunArgs } from './build-surfaces';
import type { ProductionConfig } from './config';

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

describe('production provider preflight', () => {
  it('skips the optional operator provider when disabled', () => {
    expect(operatorProviderDryRunArgs(config)).toBeUndefined();
  });

  it('dry-runs the runtime-only production manifest when enabled', () => {
    expect(
      operatorProviderDryRunArgs({
        ...config,
        operatorRuntime: {
          providerBaseUrl:
            'https://business-factory-ai-provider.kabytaa.workers.dev',
        },
      }),
    ).toEqual([
      'deploy',
      '--dry-run',
      '--config',
      'platform/bff/ai-provider/wrangler.production.jsonc',
      '--outdir',
      'dist/platform/bff/ai-provider-production',
      '--var',
      'RUNTIME_ONLY:true',
      '--var',
      'LIVE_TEXT_ENABLED:true',
      '--var',
      'CAPS_VERIFIED:true',
      '--var',
      'RUNTIME_KNOWLEDGE_SELECTION_ENABLED:true',
    ]);
  });
});
