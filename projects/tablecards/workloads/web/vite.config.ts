import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(projectRoot, '../../../..');

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@bff/contracts': resolve(
        workspaceRoot,
        'platform/bff/libs/contracts/src/index.ts',
      ),
      '@tablecards/core': resolve(
        workspaceRoot,
        'projects/tablecards/libs/core/src/index.ts',
      ),
      '@tofler/bff-auth/browser': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/browser/index.ts',
      ),
      '@tofler/bff-auth/convex/client': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/adapters/convex/client.ts',
      ),
      '@tofler/bff-auth/core': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/core/index.ts',
      ),
      '@tofler/bff-auth/react': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/react/index.tsx',
      ),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(workspaceRoot, 'dist/projects/tablecards/workloads/web'),
  },
  server: {
    host: '127.0.0.1',
    port: 4400,
  },
});
