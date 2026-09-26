import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tools/bff-operator/src/**/*.test.ts'],
  },
});
