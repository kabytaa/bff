import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { assertProductionBundles } from './bundles';
import {
  readBuildConfig,
  type BuildConfig,
  type ProductionConfig,
} from './config';

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

export function operatorProviderDryRunArgs(
  config: ProductionConfig,
): string[] | undefined {
  if (!config.operatorRuntime) return undefined;
  return [
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
  ];
}

async function runOperatorProviderDryRun(config: BuildConfig): Promise<void> {
  const args = operatorProviderDryRunArgs(config);
  if (!args) return;
  await execFileAsync(resolve('node_modules/.bin/wrangler'), args, {
    encoding: 'utf8',
    env: process.env,
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

  if (config.tablecards) {
    await runNxTarget('tablecards-session-gateway:build', {});
    await runNxTarget('tablecards-ai-provider:build', {});
    await runNxTarget('tablecards-web:build', {
      VITE_BFF_CUSTOMER_API_URL: config.bffConvexSiteUrl,
      VITE_BFF_CUSTOMER_ENVIRONMENT_KEY: config.tablecards.environmentKey,
      VITE_BFF_SESSION_ADAPTER_URL: config.tablecards.sessionAdapterUrl,
      VITE_CONVEX_SITE_URL: config.tablecards.convexSiteUrl,
      VITE_CONVEX_URL: config.tablecards.convexUrl,
      VITE_TABLECARDS_WEB_ORIGIN: config.tablecards.webUrl,
      VITE_TABLECARDS_DEV_CONTROLS: 'false',
    });
    await writeBuildMetadata(
      'dist/projects/tablecards/workloads/web',
      'business-factory-tablecards',
      config.commitSha,
    );
  }

  await runOperatorProviderDryRun(config);

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
