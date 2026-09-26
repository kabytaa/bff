import { parseHealthResponse } from '@bff/contracts';

import { readSmokeConfig, type SmokeConfig } from './config';

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 10_000;
// ConvexReactClient includes this URL only in its invalid-URL error message.
// It is dependency text, not a configured deployment target.
const CONVEX_CLIENT_EXAMPLE_URL = 'https://happy-otter-123.convex.cloud';

type Fetcher = typeof fetch;
type Sleeper = (milliseconds: number) => Promise<void>;

export interface SmokeOptions {
  attempts?: number;
  delayMs?: number;
  fetcher?: Fetcher;
  sleeper?: Sleeper;
}

function assertIncludes(
  value: string | null,
  expected: string,
  header: string,
): void {
  if (!value?.toLowerCase().includes(expected.toLowerCase())) {
    throw new Error(`${header} is missing ${expected}.`);
  }
}

async function response(fetcher: Fetcher, url: string): Promise<Response> {
  const result = await fetcher(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!result.ok) {
    throw new Error(`${new URL(url).hostname} returned HTTP ${result.status}.`);
  }
  return result;
}

function dashboardAsset(html: string, baseUrl: string): string {
  const matches = html.matchAll(
    /<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi,
  );
  for (const match of matches) {
    const source = match[1];
    if (!source) continue;
    const url = new URL(source, baseUrl);
    if (url.origin === new URL(baseUrl).origin) return url.href;
  }
  throw new Error(
    'Dashboard HTML does not reference a same-origin JavaScript asset.',
  );
}

function assertConvexTarget(bundle: string, expectedUrl: string): void {
  if (!bundle.includes(expectedUrl)) {
    throw new Error(
      'Dashboard bundle does not contain the production Convex URL.',
    );
  }

  const referencedUrls = new Set(
    bundle.match(/https:\/\/[a-z0-9-]+\.convex\.cloud/gi) ?? [],
  );
  const unexpected = [...referencedUrls].filter(
    (url) => url !== expectedUrl && url !== CONVEX_CLIENT_EXAMPLE_URL,
  );
  if (unexpected.length > 0) {
    throw new Error('Dashboard bundle contains an unexpected Convex URL.');
  }
}

export async function checkProductionOnce(
  config: SmokeConfig,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const healthUrl = new URL('/v1/health', config.convexSiteUrl).href;
  const healthResponse = await response(fetcher, healthUrl);
  const health = parseHealthResponse(await healthResponse.json());
  if (health.version !== config.commitSha) {
    throw new Error(
      `BFF health version does not match the expected commit ${config.commitSha}.`,
    );
  }

  const dashboardResponse = await response(fetcher, config.backofficeUrl);
  assertIncludes(
    dashboardResponse.headers.get('cache-control'),
    'no-store',
    'Cache-Control',
  );
  assertIncludes(
    dashboardResponse.headers.get('x-content-type-options'),
    'nosniff',
    'X-Content-Type-Options',
  );
  assertIncludes(
    dashboardResponse.headers.get('x-frame-options'),
    'deny',
    'X-Frame-Options',
  );
  assertIncludes(
    dashboardResponse.headers.get('x-robots-tag'),
    'noindex',
    'X-Robots-Tag',
  );
  assertIncludes(
    dashboardResponse.headers.get('content-security-policy'),
    "frame-ancestors 'none'",
    'Content-Security-Policy',
  );
  assertIncludes(
    dashboardResponse.headers.get('content-security-policy'),
    'https://*.convex.cloud',
    'Content-Security-Policy',
  );
  assertIncludes(
    dashboardResponse.headers.get('content-security-policy'),
    'https://*.convex.site',
    'Content-Security-Policy',
  );

  const html = await dashboardResponse.text();
  const assetUrl = dashboardAsset(html, config.backofficeUrl);
  const assetResponse = await response(fetcher, assetUrl);
  assertConvexTarget(await assetResponse.text(), config.expectedConvexUrl);
}

export async function runProductionSmoke(
  config: SmokeConfig = readSmokeConfig(),
  options: SmokeOptions = {},
): Promise<void> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const fetcher = options.fetcher ?? fetch;
  const sleeper =
    options.sleeper ??
    ((milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error('Smoke attempts must be a positive integer.');
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.info(`Production smoke attempt ${attempt}/${attempts}.`);
      await checkProductionOnce(config, fetcher);
      console.info(
        `Production smoke passed for ${config.commitSha} at ${config.backofficeUrl}.`,
      );
      return;
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : 'Unknown failure.';
      console.error(`Production smoke attempt ${attempt} failed: ${message}`);
      if (attempt < attempts) await sleeper(delayMs);
    }
  }

  throw new Error(
    `Production smoke failed after ${attempts} attempts.`,
    lastError === undefined ? undefined : { cause: lastError },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runProductionSmoke();
}
