import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { readBuildConfig } from './config';

const execFileAsync = promisify(execFile);

async function runNxTarget(target: string): Promise<void> {
  await execFileAsync(resolve('node_modules/.bin/nx'), ['run', target], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function buildProductionDashboard(): Promise<void> {
  const config = readBuildConfig();
  console.info(
    `Building production dashboard ${config.commitSha} for ${config.backofficeUrl}.`,
  );
  await runNxTarget('bff-backoffice:build');
  await runNxTarget('bff-backoffice:assert-production-bundle');
  console.info('Production dashboard build and bundle assertions passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildProductionDashboard();
}
