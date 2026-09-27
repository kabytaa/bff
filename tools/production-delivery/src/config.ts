const PRODUCTION_BACKOFFICE_ORIGIN = 'https://ops.tofler.tech';
const PRODUCTION_CUSTOMER_AUTH_ORIGIN = 'https://auth.tofler.app';
const PRODUCTION_EXAMPLE_SESSION_ADAPTER_ORIGIN =
  'https://api.example.tofler.app';
const PRODUCTION_EXAMPLE_WEB_ORIGIN = 'https://example.tofler.app';
const PRODUCTION_EXAMPLE_ENVIRONMENT_KEY = 'example-production';
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;

export class ProductionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionConfigError';
  }
}

export interface ProductionConfig {
  backofficeUrl: string;
  bffConvexSiteUrl: string;
  bffConvexUrl: string;
  commitSha: string;
  customerAuthUrl: string;
  customerEnvironmentKey: string;
  exampleConvexSiteUrl: string;
  exampleConvexUrl: string;
  exampleSessionAdapterUrl: string;
  exampleWebUrl: string;
}

export interface BuildConfig extends ProductionConfig {
  injectedBffConvexUrl: string;
}

export interface ExampleDeploymentTargetConfig {
  deploymentName: string;
  exampleConvexUrl: string;
}

export type SmokeConfig = ProductionConfig;

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

function exactOrigin(
  environment: NodeJS.ProcessEnv,
  name: string,
  expected: string,
): string {
  const value = httpsOrigin(environment, name);
  if (value !== expected) {
    throw new ProductionConfigError(`${name} must be ${expected}.`);
  }
  return value;
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

function assertDeploymentPair(
  clientUrl: string,
  siteUrl: string,
  label: string,
): string {
  const siteDeployment = new URL(siteUrl).hostname.replace(
    /\.convex\.site$/u,
    '',
  );
  const clientDeployment = new URL(clientUrl).hostname.replace(
    /\.convex\.cloud$/u,
    '',
  );
  if (siteDeployment !== clientDeployment) {
    throw new ProductionConfigError(
      `${label} Convex site and client URLs must identify the same deployment.`,
    );
  }
  return clientDeployment;
}

function commonConfig(environment: NodeJS.ProcessEnv): ProductionConfig {
  const backofficeUrl = exactOrigin(
    environment,
    'BACKOFFICE_URL',
    PRODUCTION_BACKOFFICE_ORIGIN,
  );
  const customerAuthUrl = exactOrigin(
    environment,
    'CUSTOMER_AUTH_URL',
    PRODUCTION_CUSTOMER_AUTH_ORIGIN,
  );
  const exampleWebUrl = exactOrigin(
    environment,
    'EXAMPLE_WEB_URL',
    PRODUCTION_EXAMPLE_WEB_ORIGIN,
  );
  const exampleSessionAdapterUrl = exactOrigin(
    environment,
    'EXAMPLE_SESSION_ADAPTER_URL',
    PRODUCTION_EXAMPLE_SESSION_ADAPTER_ORIGIN,
  );
  const customerEnvironmentKey = required(
    environment,
    'BFF_CUSTOMER_ENVIRONMENT_KEY',
  );
  if (customerEnvironmentKey !== PRODUCTION_EXAMPLE_ENVIRONMENT_KEY) {
    throw new ProductionConfigError(
      `BFF_CUSTOMER_ENVIRONMENT_KEY must be ${PRODUCTION_EXAMPLE_ENVIRONMENT_KEY}.`,
    );
  }

  const bffConvexSiteUrl = httpsOrigin(
    environment,
    'CONVEX_SITE_URL',
    '.convex.site',
  );
  const bffConvexUrl = httpsOrigin(
    environment,
    'EXPECTED_CONVEX_URL',
    '.convex.cloud',
  );
  const exampleConvexSiteUrl = httpsOrigin(
    environment,
    'EXAMPLE_CONVEX_SITE_URL',
    '.convex.site',
  );
  const exampleConvexUrl = httpsOrigin(
    environment,
    'EXPECTED_EXAMPLE_CONVEX_URL',
    '.convex.cloud',
  );
  const bffDeployment = assertDeploymentPair(
    bffConvexUrl,
    bffConvexSiteUrl,
    'BFF',
  );
  const exampleDeployment = assertDeploymentPair(
    exampleConvexUrl,
    exampleConvexSiteUrl,
    'Example',
  );
  if (bffDeployment === exampleDeployment) {
    throw new ProductionConfigError(
      'BFF and Example must use separate Convex deployments.',
    );
  }

  return {
    backofficeUrl,
    bffConvexSiteUrl,
    bffConvexUrl,
    commitSha: commitSha(environment),
    customerAuthUrl,
    customerEnvironmentKey,
    exampleConvexSiteUrl,
    exampleConvexUrl,
    exampleSessionAdapterUrl,
    exampleWebUrl,
  };
}

export function readBuildConfig(
  environment: NodeJS.ProcessEnv = process.env,
): BuildConfig {
  const common = commonConfig(environment);
  const injectedBffConvexUrl = httpsOrigin(
    environment,
    'BFF_DEPLOY_CONVEX_URL',
    '.convex.cloud',
  );
  if (injectedBffConvexUrl !== common.bffConvexUrl) {
    throw new ProductionConfigError(
      'BFF_DEPLOY_CONVEX_URL does not match EXPECTED_CONVEX_URL.',
    );
  }
  return { ...common, injectedBffConvexUrl };
}

export function readSmokeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): SmokeConfig {
  return commonConfig(environment);
}

export function readExampleDeploymentTargetConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ExampleDeploymentTargetConfig {
  const exampleConvexUrl = httpsOrigin(
    environment,
    'EXPECTED_EXAMPLE_CONVEX_URL',
    '.convex.cloud',
  );
  const deployKey = required(environment, 'CONVEX_DEPLOY_KEY');
  const match = /^prod:([a-z0-9-]+)\|.+$/u.exec(deployKey);
  if (!match) {
    throw new ProductionConfigError(
      'CONVEX_DEPLOY_KEY must be a deployment-scoped production key.',
    );
  }
  const deploymentName = match[1];
  const expectedDeploymentName = new URL(exampleConvexUrl).hostname.replace(
    /\.convex\.cloud$/u,
    '',
  );
  if (deploymentName !== expectedDeploymentName) {
    throw new ProductionConfigError(
      'CONVEX_DEPLOY_KEY does not target EXPECTED_EXAMPLE_CONVEX_URL.',
    );
  }
  return { deploymentName, exampleConvexUrl };
}
