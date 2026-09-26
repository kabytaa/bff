import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(projectRoot, '../../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bff/contracts': resolve(
        workspaceRoot,
        'platform/bff/libs/contracts/src/index.ts',
      ),
      '@bff/service-api': resolve(
        workspaceRoot,
        'platform/bff/service/convex/_generated/api.js',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['platform/bff/backoffice/src/**/*.test.tsx'],
    setupFiles: ['platform/bff/backoffice/src/test/setup.ts'],
  },
});
