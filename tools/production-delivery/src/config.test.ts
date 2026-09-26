import { describe, expect, it } from 'vitest';

import {
  ProductionConfigError,
  readBuildConfig,
  readSmokeConfig,
} from './config';

const commitSha = '0123456789abcdef0123456789abcdef01234567';
const production = {
  BACKOFFICE_URL: 'https://ops.tofler.tech',
  CONVEX_SITE_URL: 'https://calm-otter-123.convex.site',
  EXPECTED_CONVEX_URL: 'https://calm-otter-123.convex.cloud',
  GITHUB_SHA: commitSha,
  VITE_CONVEX_SITE_URL: 'https://calm-otter-123.convex.site',
  VITE_CONVEX_URL: 'https://calm-otter-123.convex.cloud',
} satisfies NodeJS.ProcessEnv;

describe('production configuration', () => {
  it('parses and normalizes the approved production targets', () => {
    expect(readBuildConfig(production)).toEqual({
      backofficeUrl: 'https://ops.tofler.tech',
      commitSha,
      convexSiteUrl: 'https://calm-otter-123.convex.site',
      expectedConvexUrl: 'https://calm-otter-123.convex.cloud',
      viteConvexUrl: 'https://calm-otter-123.convex.cloud',
    });
    expect(readSmokeConfig(production)).not.toHaveProperty('viteConvexUrl');
  });

  it.each([
    ['BACKOFFICE_URL'],
    ['CONVEX_SITE_URL'],
    ['EXPECTED_CONVEX_URL'],
    ['GITHUB_SHA'],
  ])('rejects missing %s without dumping the environment', (name) => {
    const environment = { ...production, [name]: undefined };
    expect(() => readSmokeConfig(environment)).toThrow(
      new ProductionConfigError(`${name} is required.`),
    );
  });

  it('rejects the development dashboard target', () => {
    expect(() =>
      readSmokeConfig({
        ...production,
        BACKOFFICE_URL: 'https://ops-dev.tofler.tech',
      }),
    ).toThrow(/must be https:\/\/ops\.tofler\.tech/);
  });

  it('rejects mismatched Convex client and site targets', () => {
    expect(() =>
      readBuildConfig({
        ...production,
        EXPECTED_CONVEX_URL: 'https://other-otter-456.convex.cloud',
        VITE_CONVEX_URL: 'https://other-otter-456.convex.cloud',
      }),
    ).toThrow(/must identify the same deployment/);
    expect(() =>
      readBuildConfig({
        ...production,
        VITE_CONVEX_URL: 'https://other-otter-456.convex.cloud',
      }),
    ).toThrow(/does not match EXPECTED_CONVEX_URL/);
    expect(() =>
      readBuildConfig({
        ...production,
        VITE_CONVEX_SITE_URL: 'https://other-otter-456.convex.site',
      }),
    ).toThrow(/does not match CONVEX_SITE_URL/);
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
