import { describe, expect, it } from 'vitest';

import {
  ProductionConfigError,
  readBuildConfig,
  readExampleDeploymentTargetConfig,
  readSmokeConfig,
} from './config';

const commitSha = '0123456789abcdef0123456789abcdef01234567';
const production = {
  BACKOFFICE_URL: 'https://ops.tofler.tech',
  BFF_CUSTOMER_ENVIRONMENT_KEY: 'example-production',
  BFF_DEPLOY_CONVEX_URL: 'https://calm-otter-123.convex.cloud',
  CONVEX_SITE_URL: 'https://calm-otter-123.convex.site',
  CUSTOMER_AUTH_URL: 'https://auth.tofler.app',
  EXAMPLE_CONVEX_SITE_URL: 'https://kind-fox-456.convex.site',
  EXAMPLE_SESSION_ADAPTER_URL: 'https://api.example.tofler.app',
  EXAMPLE_WEB_URL: 'https://example.tofler.app',
  EXPECTED_CONVEX_URL: 'https://calm-otter-123.convex.cloud',
  EXPECTED_EXAMPLE_CONVEX_URL: 'https://kind-fox-456.convex.cloud',
  GITHUB_SHA: commitSha,
} satisfies NodeJS.ProcessEnv;

describe('production configuration', () => {
  it('parses separate approved BFF, example and asset targets', () => {
    expect(readBuildConfig(production)).toEqual({
      backofficeUrl: 'https://ops.tofler.tech',
      bffConvexSiteUrl: 'https://calm-otter-123.convex.site',
      bffConvexUrl: 'https://calm-otter-123.convex.cloud',
      commitSha,
      customerAuthUrl: 'https://auth.tofler.app',
      customerEnvironmentKey: 'example-production',
      exampleConvexSiteUrl: 'https://kind-fox-456.convex.site',
      exampleConvexUrl: 'https://kind-fox-456.convex.cloud',
      exampleSessionAdapterUrl: 'https://api.example.tofler.app',
      exampleWebUrl: 'https://example.tofler.app',
      injectedBffConvexUrl: 'https://calm-otter-123.convex.cloud',
    });
    expect(readSmokeConfig(production)).not.toHaveProperty(
      'injectedBffConvexUrl',
    );
  });

  it.each([
    ['BACKOFFICE_URL'],
    ['CUSTOMER_AUTH_URL'],
    ['EXAMPLE_WEB_URL'],
    ['CONVEX_SITE_URL'],
    ['EXPECTED_CONVEX_URL'],
    ['EXAMPLE_CONVEX_SITE_URL'],
    ['EXAMPLE_SESSION_ADAPTER_URL'],
    ['EXPECTED_EXAMPLE_CONVEX_URL'],
    ['BFF_CUSTOMER_ENVIRONMENT_KEY'],
    ['GITHUB_SHA'],
  ])('rejects missing %s without dumping the environment', (name) => {
    const environment = { ...production, [name]: undefined };
    expect(() => readSmokeConfig(environment)).toThrow(
      new ProductionConfigError(`${name} is required.`),
    );
  });

  it.each([
    ['BACKOFFICE_URL', 'https://ops-dev.tofler.tech'],
    ['CUSTOMER_AUTH_URL', 'https://auth-dev.tofler.app'],
    ['EXAMPLE_WEB_URL', 'https://example-dev.tofler.app'],
    ['EXAMPLE_SESSION_ADAPTER_URL', 'https://api.example-dev.tofler.app'],
    ['BFF_CUSTOMER_ENVIRONMENT_KEY', 'example-development'],
  ])('rejects a development %s target', (name, value) => {
    expect(() => readSmokeConfig({ ...production, [name]: value })).toThrow(
      ProductionConfigError,
    );
  });

  it('rejects mismatched or shared Convex deployment targets', () => {
    expect(() =>
      readBuildConfig({
        ...production,
        EXAMPLE_CONVEX_SITE_URL: 'https://other-fox-789.convex.site',
      }),
    ).toThrow(/Example Convex site and client URLs/u);
    expect(() =>
      readBuildConfig({
        ...production,
        EXAMPLE_CONVEX_SITE_URL: production.CONVEX_SITE_URL,
        EXPECTED_EXAMPLE_CONVEX_URL: production.EXPECTED_CONVEX_URL,
      }),
    ).toThrow(/separate Convex deployments/u);
    expect(() =>
      readBuildConfig({
        ...production,
        BFF_DEPLOY_CONVEX_URL: 'https://other-otter-789.convex.cloud',
      }),
    ).toThrow(/does not match EXPECTED_CONVEX_URL/u);
  });

  it('binds the example deploy key target before any environment writes', () => {
    expect(
      readExampleDeploymentTargetConfig({
        EXPECTED_EXAMPLE_CONVEX_URL: 'https://kind-fox-456.convex.cloud',
        EXAMPLE_DEPLOY_CONVEX_URL: 'https://kind-fox-456.convex.cloud',
      }),
    ).toEqual({
      exampleConvexUrl: 'https://kind-fox-456.convex.cloud',
      injectedExampleConvexUrl: 'https://kind-fox-456.convex.cloud',
    });
    expect(() =>
      readExampleDeploymentTargetConfig({
        EXPECTED_EXAMPLE_CONVEX_URL: 'https://kind-fox-456.convex.cloud',
        EXAMPLE_DEPLOY_CONVEX_URL: 'https://wrong-otter-789.convex.cloud',
      }),
    ).toThrow(/does not match EXPECTED_EXAMPLE_CONVEX_URL/u);
  });

  it.each([
    ['GITHUB_SHA', 'short'],
    ['EXPECTED_CONVEX_URL', 'http://calm-otter-123.convex.cloud'],
    ['CONVEX_SITE_URL', 'https://example.com'],
    ['BACKOFFICE_URL', 'https://ops.tofler.tech/path'],
  ])('rejects invalid %s', (name, value) => {
    expect(() => readBuildConfig({ ...production, [name]: value })).toThrow(
      ProductionConfigError,
    );
  });
});
