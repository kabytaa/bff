import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(projectRoot, '../../..');

export default defineConfig({
  root: projectRoot,
  plugins: [react(), tailwindcss()],
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
      '@bff/service-api': resolve(
        workspaceRoot,
        'platform/bff/service/convex/_generated/api.js',
      ),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(workspaceRoot, 'dist/platform/bff/backoffice'),
  },
  server: {
    host: '127.0.0.1',
    port: 4200,
  },
});
