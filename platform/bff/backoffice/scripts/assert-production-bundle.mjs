import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import {
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
  BACKOFFICE_OPERATOR_EMAILS,
} from '../../libs/config/src/index.ts';

const output = resolve('dist/platform/bff/backoffice');
const forbidden = [
  'BFF_E2E_FIXTURE_DO_NOT_SHIP',
  'BFF_DEVELOPMENT_AUTH_DO_NOT_SHIP',
  '__BFF_DEVELOPMENT_AUTOMATION_TOKEN__',
  'main.developmentAuth',
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
  'https://ops-dev.tofler.tech',
  'main.e2e',
  ...BACKOFFICE_OPERATOR_EMAILS,
];
const forbiddenFileNames = ['developmentAuth', 'index.development-auth.html'];

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
  for (const marker of forbiddenFileNames) {
    if (file.includes(marker)) {
      throw new Error(
        `Production bundle contains forbidden development-auth file: ${marker}`,
      );
    }
  }
  if (!['.html', '.js', '.css'].includes(extname(file))) continue;
  const content = await readFile(file, 'utf8');
  for (const marker of forbidden) {
    if (content.includes(marker)) {
      throw new Error(
        `Production bundle contains forbidden development/test marker: ${marker}`,
      );
    }
  }
}

console.info(
  'Production bundle contains no development auth, test fixtures, or operator allowlist.',
);
