import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

import baseConfig from './vite.config.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default mergeConfig(baseConfig, {
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        developmentAuth: resolve(projectRoot, 'index.development-auth.html'),
      },
    },
  },
});
