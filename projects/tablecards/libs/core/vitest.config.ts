import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['projects/tablecards/libs/core/src/**/*.test.ts'],
  },
});
