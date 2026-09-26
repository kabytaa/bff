import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import { BACKOFFICE_OPERATOR_EMAILS } from '../../libs/config/src/index.ts';

const output = resolve('dist/platform/bff/backoffice');
const forbidden = [
  'BFF_E2E_FIXTURE_DO_NOT_SHIP',
  'main.e2e',
  ...BACKOFFICE_OPERATOR_EMAILS,
];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? files(path) : [path];
    }),
  );
  return nested.flat();
}

for (const file of await files(output)) {
  if (!['.html', '.js', '.css'].includes(extname(file))) continue;
  const content = await readFile(file, 'utf8');
  for (const marker of forbidden) {
    if (content.includes(marker)) {
      throw new Error(
        `Production bundle contains forbidden test marker: ${marker}`,
      );
    }
  }
}

console.info(
  'Production bundle contains no test-auth fixtures or operator allowlist.',
);
