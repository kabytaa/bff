import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['projects/example/session-gateway/src/**/*.test.ts'],
  },
});
