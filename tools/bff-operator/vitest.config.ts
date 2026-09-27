import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@bff/contracts': resolve(
        workspaceRoot,
        'platform/bff/libs/contracts/src/index.ts',
      ),
      '@tofler/bff-auth/core': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/core/index.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tools/bff-operator/src/**/*.test.ts'],
  },
});
