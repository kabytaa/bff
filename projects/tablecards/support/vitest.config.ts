import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@bff/contracts': fileURLToPath(
        new URL(
          '../../../platform/bff/libs/contracts/src/index.ts',
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: 'node',
    include: [resolve('projects/tablecards/support/**/*.test.ts')],
  },
});
