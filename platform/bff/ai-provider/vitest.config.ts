import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: {
      '@bff/assistant/knowledge-selection': fileURLToPath(
        new URL(
          '../libs/assistant/src/knowledge-selection.ts',
          import.meta.url,
        ),
      ),
      '@bff/assistant/models': fileURLToPath(
        new URL('../libs/assistant/src/models.ts', import.meta.url),
      ),
      '@bff/assistant/server': fileURLToPath(
        new URL('../libs/assistant/src/server.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['platform/bff/ai-provider/src/**/*.test.ts'],
  },
});
