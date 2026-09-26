import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

export default defineConfig({
  resolve: {
    alias: {
      '@bff/static-config': resolve(
        workspaceRoot,
        'platform/bff/libs/config/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['platform/bff/backoffice-e2e/src/**/*.test.ts'],
  },
});
