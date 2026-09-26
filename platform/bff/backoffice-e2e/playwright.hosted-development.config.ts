import { defineConfig, devices } from '@playwright/test';

export const HOSTED_DEVELOPMENT_BACKOFFICE_URL = 'https://ops-dev.tofler.tech/';

export default defineConfig({
  testDir: './src',
  testMatch: ['hosted-development.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: HOSTED_DEVELOPMENT_BACKOFFICE_URL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'hosted-development-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
