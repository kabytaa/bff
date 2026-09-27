import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(projectRoot, '../../..');

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@bff/contracts': resolve(
        workspaceRoot,
        'platform/bff/libs/contracts/src/index.ts',
      ),
      '@bff/static-config': resolve(
        workspaceRoot,
        'platform/bff/libs/config/src/index.ts',
      ),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(workspaceRoot, 'dist/platform/bff/customer-auth'),
  },
  server: {
    host: '127.0.0.1',
    port: 4201,
  },
});
