import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import {
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
  BACKOFFICE_GOOGLE_CLIENT_ID,
  CUSTOMER_GOOGLE_CLIENT_ID,
} from '../../libs/config/src/index.ts';

const output = resolve('dist/platform/bff/customer-auth');
const forbidden = [
  'BFF_DEVELOPMENT_AUTH_DO_NOT_SHIP',
  '__BFF_DEVELOPMENT_AUTOMATION_TOKEN__',
  'development-auth',
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
  BACKOFFICE_GOOGLE_CLIENT_ID,
  'ops-dev.tofler.tech',
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

let includesCustomerClient = false;
for (const file of await files(output)) {
  if (!['.html', '.js', '.css'].includes(extname(file))) continue;
  const content = await readFile(file, 'utf8');
  includesCustomerClient ||= content.includes(CUSTOMER_GOOGLE_CLIENT_ID);
  for (const marker of forbidden) {
    if (content.includes(marker)) {
      throw new Error(
        `Production customer-auth bundle contains forbidden marker: ${marker}`,
      );
    }
  }
}

if (!includesCustomerClient) {
  throw new Error(
    'Production bundle is missing the reviewed customer client ID',
  );
}

console.info(
  'Production customer-auth bundle contains only the reviewed public customer identity configuration.',
);
