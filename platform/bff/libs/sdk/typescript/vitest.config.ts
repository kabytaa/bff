import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'platform/bff/libs/sdk/typescript/src/**/*.test.ts',
      'platform/bff/libs/sdk/typescript/src/**/*.test.tsx',
    ],
  },
});
