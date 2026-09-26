const PRODUCTION_BACKOFFICE_ORIGIN = 'https://ops.tofler.tech';
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;

export class ProductionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionConfigError';
  }
}

export interface BuildConfig {
  backofficeUrl: string;
  commitSha: string;
  convexSiteUrl: string;
  expectedConvexUrl: string;
  viteConvexUrl: string;
}

export interface SmokeConfig {
  backofficeUrl: string;
  commitSha: string;
  convexSiteUrl: string;
  expectedConvexUrl: string;
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new ProductionConfigError(`${name} is required.`);
  }
  return value;
}

function httpsOrigin(
  environment: NodeJS.ProcessEnv,
  name: string,
  hostnameSuffix?: string,
): string {
  const raw = required(environment, name);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProductionConfigError(`${name} must be a valid HTTPS origin.`);
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new ProductionConfigError(`${name} must be a valid HTTPS origin.`);
  }

  if (hostnameSuffix && !url.hostname.endsWith(hostnameSuffix)) {
    throw new ProductionConfigError(
      `${name} must use the expected ${hostnameSuffix} hostname.`,
    );
  }

  return url.origin;
}

function commitSha(environment: NodeJS.ProcessEnv): string {
  const value = required(environment, 'GITHUB_SHA').toLowerCase();
  if (!FULL_COMMIT_SHA.test(value)) {
    throw new ProductionConfigError(
      'GITHUB_SHA must be a full 40-character hexadecimal commit SHA.',
    );
  }
  return value;
}

function commonConfig(environment: NodeJS.ProcessEnv): SmokeConfig {
  const backofficeUrl = httpsOrigin(environment, 'BACKOFFICE_URL');
  if (backofficeUrl !== PRODUCTION_BACKOFFICE_ORIGIN) {
    throw new ProductionConfigError(
      `BACKOFFICE_URL must be ${PRODUCTION_BACKOFFICE_ORIGIN}.`,
    );
  }

  const convexSiteUrl = httpsOrigin(
    environment,
    'CONVEX_SITE_URL',
    '.convex.site',
  );
  const expectedConvexUrl = httpsOrigin(
    environment,
    'EXPECTED_CONVEX_URL',
    '.convex.cloud',
  );
  const siteDeployment = new URL(convexSiteUrl).hostname.replace(
    /\.convex\.site$/,
    '',
  );
  const clientDeployment = new URL(expectedConvexUrl).hostname.replace(
    /\.convex\.cloud$/,
    '',
  );
  if (siteDeployment !== clientDeployment) {
    throw new ProductionConfigError(
      'CONVEX_SITE_URL and EXPECTED_CONVEX_URL must identify the same deployment.',
    );
  }

  return {
    backofficeUrl,
    commitSha: commitSha(environment),
    convexSiteUrl,
    expectedConvexUrl,
  };
}

export function readBuildConfig(
  environment: NodeJS.ProcessEnv = process.env,
): BuildConfig {
  const common = commonConfig(environment);
  const viteConvexUrl = httpsOrigin(
    environment,
    'VITE_CONVEX_URL',
    '.convex.cloud',
  );
  const viteConvexSiteUrl = httpsOrigin(
    environment,
    'VITE_CONVEX_SITE_URL',
    '.convex.site',
  );

  if (viteConvexUrl !== common.expectedConvexUrl) {
    throw new ProductionConfigError(
      'VITE_CONVEX_URL does not match EXPECTED_CONVEX_URL.',
    );
  }
  if (viteConvexSiteUrl !== common.convexSiteUrl) {
    throw new ProductionConfigError(
      'VITE_CONVEX_SITE_URL does not match CONVEX_SITE_URL.',
    );
  }

  return { ...common, viteConvexUrl };
}

export function readSmokeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): SmokeConfig {
  return commonConfig(environment);
}
