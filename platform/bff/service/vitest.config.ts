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
      '@bff/contracts': resolve(
        workspaceRoot,
        'platform/bff/libs/contracts/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'edge-runtime',
    include: ['platform/bff/service/convex/**/*.test.ts'],
    server: {
      deps: {
        inline: ['convex-test'],
      },
    },
  },
});
