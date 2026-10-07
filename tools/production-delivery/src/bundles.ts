import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import type { ProductionConfig } from './config';

const CONVEX_CLIENT_EXAMPLE_URL = 'https://happy-otter-123.convex.cloud';

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? files(path) : [path];
    }),
  );
  return nested.flat();
}

async function bundleText(directory: string): Promise<string> {
  const contents = await Promise.all(
    (await files(directory))
      .filter((file) => ['.css', '.html', '.js'].includes(extname(file)))
      .map((file) => readFile(file, 'utf8')),
  );
  return contents.join('\n');
}

function requireMarkers(
  content: string,
  markers: readonly string[],
  surface: string,
): void {
  for (const marker of markers) {
    if (!content.includes(marker)) {
      throw new Error(`${surface} bundle is missing ${marker}.`);
    }
  }
}

function rejectMarkers(
  content: string,
  markers: readonly string[],
  surface: string,
): void {
  for (const marker of markers) {
    if (content.includes(marker)) {
      throw new Error(`${surface} bundle contains forbidden marker ${marker}.`);
    }
  }
}

function assertOnlyConvexUrls(
  content: string,
  allowed: readonly string[],
  suffix: 'cloud' | 'site',
  surface: string,
): void {
  const urls = new Set(
    content.match(
      new RegExp(`https://[a-z0-9-]+\\.convex\\.${suffix}`, 'giu'),
    ) ?? [],
  );
  const unexpected = [...urls].filter(
    (url) =>
      !allowed.includes(url) &&
      !(suffix === 'cloud' && url === CONVEX_CLIENT_EXAMPLE_URL),
  );
  if (unexpected.length > 0) {
    throw new Error(`${surface} bundle contains an unexpected Convex URL.`);
  }
}

export function assertExampleBundleContent(
  content: string,
  config: ProductionConfig,
): void {
  requireMarkers(
    content,
    [
      config.bffConvexSiteUrl,
      config.customerEnvironmentKey,
      config.exampleConvexSiteUrl,
      config.exampleConvexUrl,
      config.exampleSessionAdapterUrl,
    ],
    'Example',
  );
  rejectMarkers(
    content,
    [
      'example-development',
      'auth-dev.tofler.app',
      'example-dev.tofler.app',
      'api.example-dev.tofler.app',
      '__BFF_CUSTOMER_DEVELOPMENT_GRANT__',
    ],
    'Example',
  );
  assertOnlyConvexUrls(content, [config.exampleConvexUrl], 'cloud', 'Example');
  assertOnlyConvexUrls(
    content,
    [config.bffConvexSiteUrl, config.exampleConvexSiteUrl],
    'site',
    'Example',
  );
}

export function assertCustomerAuthBundleContent(
  content: string,
  config: ProductionConfig,
): void {
  requireMarkers(content, [config.bffConvexSiteUrl], 'Customer auth');
  rejectMarkers(
    content,
    [
      'auth-dev.tofler.app',
      'example-development',
      '__BFF_CUSTOMER_DEVELOPMENT_GRANT__',
      'index.development-auth.html',
    ],
    'Customer auth',
  );
  assertOnlyConvexUrls(
    content,
    [config.bffConvexSiteUrl],
    'site',
    'Customer auth',
  );
}

export function assertBackofficeBundleContent(
  content: string,
  config: ProductionConfig,
): void {
  requireMarkers(
    content,
    [config.bffConvexSiteUrl, config.bffConvexUrl],
    'Backoffice',
  );
  assertOnlyConvexUrls(content, [config.bffConvexUrl], 'cloud', 'Backoffice');
  assertOnlyConvexUrls(
    content,
    [config.bffConvexSiteUrl],
    'site',
    'Backoffice',
  );
}

export function assertTableCardsBundleContent(
  content: string,
  config: ProductionConfig,
): void {
  const target = config.tablecards;
  if (!target)
    throw new Error('TableCards production configuration is required.');
  requireMarkers(
    content,
    [
      config.bffConvexSiteUrl,
      target.convexUrl,
      target.convexSiteUrl,
      target.environmentKey,
      target.sessionAdapterUrl,
    ],
    'TableCards',
  );
  rejectMarkers(
    content,
    [
      'tablecards-development',
      'tablecards-dev.tofler.app',
      'auth-dev.tofler.app',
      '__BFF_CUSTOMER_DEVELOPMENT_GRANT__',
    ],
    'TableCards',
  );
  if (
    !/VITE_TABLECARDS_DEV_CONTROLS["']?\s*:\s*["'\x60]false["'\x60]/u.test(
      content,
    )
  ) {
    throw new Error(
      'TableCards development controls must be explicitly disabled.',
    );
  }
  assertOnlyConvexUrls(content, [target.convexUrl], 'cloud', 'TableCards');
  assertOnlyConvexUrls(
    content,
    [config.bffConvexSiteUrl, target.convexSiteUrl],
    'site',
    'TableCards',
  );
}

export async function assertProductionBundles(
  config: ProductionConfig,
): Promise<void> {
  const [backoffice, customerAuth, example] = await Promise.all([
    bundleText('dist/platform/bff/backoffice'),
    bundleText('dist/platform/bff/customer-auth'),
    bundleText('dist/projects/example/workloads/web'),
  ]);
  assertBackofficeBundleContent(backoffice, config);
  assertCustomerAuthBundleContent(customerAuth, config);
  assertExampleBundleContent(example, config);
  if (config.tablecards) {
    assertTableCardsBundleContent(
      await bundleText('dist/projects/tablecards/workloads/web'),
      config,
    );
  }
}
