import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['projects/tablecards/session-gateway/src/**/*.test.ts'],
  },
});
