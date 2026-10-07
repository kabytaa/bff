import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['projects/tablecards/ai-provider/src/**/*.test.ts'],
  },
});
