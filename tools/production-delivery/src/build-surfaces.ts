import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { assertProductionBundles } from './bundles';
import { readBuildConfig, type BuildConfig } from './config';

const execFileAsync = promisify(execFile);

async function runNxTarget(
  target: string,
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  await execFileAsync(resolve('node_modules/.bin/nx'), ['run', target], {
    encoding: 'utf8',
    env: { ...process.env, ...environment },
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function writeBuildMetadata(
  directory: string,
  surface: string,
  commitSha: string,
): Promise<void> {
  await writeFile(
    resolve(directory, 'build-metadata.json'),
    `${JSON.stringify({ commitSha, surface })}\n`,
    { encoding: 'utf8', mode: 0o644 },
  );
}

export async function buildProductionSurfaces(
  config: BuildConfig = readBuildConfig(),
): Promise<void> {
  console.info(
    `Building all production surfaces for ${config.commitSha} before release.`,
  );

  await runNxTarget('bff-backoffice:assert-production-bundle', {
    VITE_CONVEX_SITE_URL: config.bffConvexSiteUrl,
    VITE_CONVEX_URL: config.bffConvexUrl,
  });
  await runNxTarget('bff-customer-auth:assert-production-bundle', {
    VITE_BFF_SITE_URL: config.bffConvexSiteUrl,
  });
  await runNxTarget('example-session-gateway:build', {});
  await runNxTarget('example-web:build', {
    VITE_BFF_AUTH_DIAGNOSTICS: 'false',
    VITE_BFF_CUSTOMER_API_URL: config.bffConvexSiteUrl,
    VITE_BFF_CUSTOMER_ENVIRONMENT_KEY: config.customerEnvironmentKey,
    VITE_BFF_SESSION_ADAPTER_URL: config.exampleSessionAdapterUrl,
    VITE_CONVEX_SITE_URL: config.exampleConvexSiteUrl,
    VITE_CONVEX_URL: config.exampleConvexUrl,
  });

  await assertProductionBundles(config);
  await Promise.all([
    writeBuildMetadata(
      'dist/platform/bff/backoffice',
      'business-factory-backoffice',
      config.commitSha,
    ),
    writeBuildMetadata(
      'dist/platform/bff/customer-auth',
      'business-factory-customer-auth',
      config.commitSha,
    ),
    writeBuildMetadata(
      'dist/projects/example/workloads/web',
      'business-factory-example',
      config.commitSha,
    ),
  ]);
  console.info('All production assets and bundle assertions passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildProductionSurfaces();
}
