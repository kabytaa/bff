import { describe, expect, it } from 'vitest';

import { resolveCustomerAuthConfigurationArgs } from './customerAuthConfiguration';

describe('code-owned customer auth configuration', () => {
  it('composes the Business defaults module with environment URLs', async () => {
    const resolved = await resolveCustomerAuthConfigurationArgs([
      'preview-customer-auth',
      '--deployment',
      'local',
      '--key',
      'example-development',
      '--defaults-module',
      'projects/example/customer-auth.defaults.ts',
      '--environment-json',
      JSON.stringify({
        webOrigins: ['https://example-dev.tofler.app'],
        sessionAdapterBaseUrl: 'https://api.example-dev.tofler.app',
        developmentAutomationEnabled: true,
      }),
    ]);
    const index = resolved.indexOf('--configuration-json');
    const configuration = JSON.parse(resolved[index + 1] ?? '{}') as Record<
      string,
      unknown
    >;

    expect(resolved).not.toContain('--defaults-module');
    expect(configuration).toMatchObject({
      version: 2,
      definitionRevision: 1,
      presentation: {
        productName: 'Example',
        theme: 'system',
        accentColor: '#314EC6',
      },
      developmentAutomationEnabled: true,
    });
    expect(configuration.definitionFingerprint).toMatch(/^fnv1a64:/u);
  });
});
