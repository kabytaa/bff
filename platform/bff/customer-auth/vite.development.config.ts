import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

import baseConfig from './vite.config.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = resolve(projectRoot, '../../..');

export default mergeConfig(baseConfig, {
  build: {
    outDir: resolve(
      workspaceRoot,
      'dist/platform/bff/customer-auth-development',
    ),
  },
});
