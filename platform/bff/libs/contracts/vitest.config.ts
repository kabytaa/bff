import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['platform/bff/libs/contracts/src/**/*.test.ts'],
  },
});
