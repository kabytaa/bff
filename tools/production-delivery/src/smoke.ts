import { parseHealthResponse } from '@bff/contracts';

import {
  assertBackofficeBundleContent,
  assertCustomerAuthBundleContent,
  assertExampleBundleContent,
} from './bundles';
import { readSmokeConfig, type SmokeConfig } from './config';

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 10_000;

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

async function request(
  fetcher: Fetcher,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  return await fetcher(url, {
    ...init,
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function successfulResponse(
  fetcher: Fetcher,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const result = await request(fetcher, url, init);
  if (!result.ok) {
    throw new Error(`${new URL(url).hostname} returned HTTP ${result.status}.`);
  }
  return result;
}

function javascriptAsset(html: string, baseUrl: string): string {
  const matches = html.matchAll(
    /<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/giu,
  );
  for (const match of matches) {
    const source = match[1];
    if (!source) continue;
    const url = new URL(source, baseUrl);
    if (url.origin === new URL(baseUrl).origin) return url.href;
  }
  throw new Error('HTML does not reference a same-origin JavaScript asset.');
}

function assertStaticHeaders(
  response: Response,
  cspMarkers: readonly string[],
): void {
  assertIncludes(
    response.headers.get('cache-control'),
    'no-store',
    'Cache-Control',
  );
  assertIncludes(
    response.headers.get('x-content-type-options'),
    'nosniff',
    'X-Content-Type-Options',
  );
  assertIncludes(
    response.headers.get('x-frame-options'),
    'deny',
    'X-Frame-Options',
  );
  assertIncludes(
    response.headers.get('x-robots-tag'),
    'noindex',
    'X-Robots-Tag',
  );
  assertIncludes(
    response.headers.get('content-security-policy'),
    "frame-ancestors 'none'",
    'Content-Security-Policy',
  );
  for (const marker of cspMarkers) {
    assertIncludes(
      response.headers.get('content-security-policy'),
      marker,
      'Content-Security-Policy',
    );
  }
}

async function assertStaticSurface(
  fetcher: Fetcher,
  baseUrl: string,
  surface: string,
  commitSha: string,
  cspMarkers: readonly string[],
  assertBundle: (content: string) => void,
): Promise<void> {
  const metadataResponse = await successfulResponse(
    fetcher,
    new URL('/build-metadata.json', baseUrl).href,
  );
  const metadata = (await metadataResponse.json()) as Record<string, unknown>;
  if (metadata.commitSha !== commitSha || metadata.surface !== surface) {
    throw new Error(`${surface} build metadata does not match the release.`);
  }

  const pageResponse = await successfulResponse(fetcher, baseUrl);
  assertStaticHeaders(pageResponse, cspMarkers);
  const html = await pageResponse.text();
  const assetResponse = await successfulResponse(
    fetcher,
    javascriptAsset(html, baseUrl),
  );
  assertBundle(await assetResponse.text());
}

function assertPublicJwks(value: unknown): void {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('keys' in value) ||
    !Array.isArray(value.keys) ||
    value.keys.length === 0
  ) {
    throw new Error('BFF JWKS has no public signing keys.');
  }
  for (const key of value.keys) {
    if (
      typeof key !== 'object' ||
      key === null ||
      key.kty !== 'EC' ||
      key.crv !== 'P-256' ||
      typeof key.kid !== 'string' ||
      'd' in key
    ) {
      throw new Error('BFF JWKS contains an invalid or private key.');
    }
  }
}

async function assertExpectedStatus(
  fetcher: Fetcher,
  url: string,
  expectedStatus: number,
  init?: RequestInit,
): Promise<Response> {
  const result = await request(fetcher, url, init);
  if (result.status !== expectedStatus) {
    throw new Error(
      `${new URL(url).hostname} returned HTTP ${result.status}; expected ${expectedStatus}.`,
    );
  }
  return result;
}

function assertCorsHeaders(
  response: Response,
  origin: string,
  credentials: boolean,
): void {
  if (response.headers.get('access-control-allow-origin') !== origin) {
    throw new Error('Access-Control-Allow-Origin does not match the example.');
  }
  assertIncludes(response.headers.get('vary'), 'Origin', 'Vary');
  if (
    credentials &&
    response.headers.get('access-control-allow-credentials') !== 'true'
  ) {
    throw new Error('Credentialed CORS is not enabled.');
  }
}

export async function checkProductionOnce(
  config: SmokeConfig,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const bffHealthUrl = new URL('/v1/health', config.bffConvexSiteUrl).href;
  const healthResponse = await successfulResponse(fetcher, bffHealthUrl);
  const health = parseHealthResponse(await healthResponse.json());
  if (health.version !== config.commitSha) {
    throw new Error(
      `BFF health version does not match the expected commit ${config.commitSha}.`,
    );
  }

  const jwksResponse = await successfulResponse(
    fetcher,
    new URL('/v1/auth/jwks', config.bffConvexSiteUrl).href,
  );
  assertPublicJwks(await jwksResponse.json());
  await assertExpectedStatus(
    fetcher,
    new URL('/v1/auth/transactions/development', config.bffConvexSiteUrl).href,
    404,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    },
  );

  const exampleHealthResponse = await successfulResponse(
    fetcher,
    new URL('/v1/health', config.exampleConvexSiteUrl).href,
  );
  const exampleHealth = (await exampleHealthResponse.json()) as Record<
    string,
    unknown
  >;
  if (
    exampleHealth.status !== 'ok' ||
    exampleHealth.service !== 'business-factory-example' ||
    exampleHealth.version !== config.commitSha
  ) {
    throw new Error('Example backend health does not match the release.');
  }
  const exampleDenial = await assertExpectedStatus(
    fetcher,
    new URL('/v1/context', config.exampleConvexSiteUrl).href,
    401,
    { headers: { origin: config.exampleWebUrl } },
  );
  assertCorsHeaders(exampleDenial, config.exampleWebUrl, false);
  const examplePreflight = await assertExpectedStatus(
    fetcher,
    new URL('/v1/context', config.exampleConvexSiteUrl).href,
    204,
    { method: 'OPTIONS', headers: { origin: config.exampleWebUrl } },
  );
  assertCorsHeaders(examplePreflight, config.exampleWebUrl, false);
  assertIncludes(
    examplePreflight.headers.get('access-control-allow-headers'),
    'Authorization',
    'Access-Control-Allow-Headers',
  );
  const gatewayDenial = await assertExpectedStatus(
    fetcher,
    new URL('/_tofler/auth/context', config.exampleSessionAdapterUrl).href,
    401,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: config.exampleWebUrl,
        'x-tofler-csrf': '1',
      },
      body: '{}',
    },
  );
  assertCorsHeaders(gatewayDenial, config.exampleWebUrl, true);
  const gatewayPreflight = await assertExpectedStatus(
    fetcher,
    new URL('/_tofler/auth/context', config.exampleSessionAdapterUrl).href,
    204,
    {
      method: 'OPTIONS',
      headers: {
        origin: config.exampleWebUrl,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, x-tofler-csrf',
      },
    },
  );
  assertCorsHeaders(gatewayPreflight, config.exampleWebUrl, true);
  assertIncludes(
    gatewayPreflight.headers.get('access-control-allow-headers'),
    'X-Tofler-CSRF',
    'Access-Control-Allow-Headers',
  );
  await assertExpectedStatus(
    fetcher,
    new URL('/v1/context', config.exampleSessionAdapterUrl).href,
    404,
  );
  const gatewayHealthResponse = await successfulResponse(
    fetcher,
    new URL('/_tofler/session-gateway/health', config.exampleSessionAdapterUrl)
      .href,
  );
  const gatewayHealth = (await gatewayHealthResponse.json()) as Record<
    string,
    unknown
  >;
  if (
    gatewayHealth.status !== 'ok' ||
    gatewayHealth.service !== 'business-factory-example-session-gateway' ||
    gatewayHealth.version !== config.commitSha
  ) {
    throw new Error('Example session gateway health does not match release.');
  }

  await assertStaticSurface(
    fetcher,
    config.backofficeUrl,
    'business-factory-backoffice',
    config.commitSha,
    ['https://*.convex.cloud', 'https://*.convex.site'],
    (content) => assertBackofficeBundleContent(content, config),
  );
  await assertStaticSurface(
    fetcher,
    config.customerAuthUrl,
    'business-factory-customer-auth',
    config.commitSha,
    ['https://accounts.google.com', 'https://*.convex.site'],
    (content) => assertCustomerAuthBundleContent(content, config),
  );
  await assertStaticSurface(
    fetcher,
    config.exampleWebUrl,
    'business-factory-example',
    config.commitSha,
    ['https://*.tofler.app', 'https://*.convex.cloud', 'https://*.convex.site'],
    (content) => assertExampleBundleContent(content, config),
  );
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
        `Production smoke passed for ${config.commitSha} across every Build 2 surface.`,
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
