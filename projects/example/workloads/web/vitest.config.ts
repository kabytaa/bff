import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(projectRoot, '../../../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bff/contracts': resolve(
        workspaceRoot,
        'platform/bff/libs/contracts/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['projects/example/workloads/web/src/**/*.test.{ts,tsx}'],
  },
});
