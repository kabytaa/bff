import { defineConfig, devices } from '@playwright/test';

export const HOSTED_DEVELOPMENT_BACKOFFICE_URL = 'https://ops-dev.tofler.tech/';

export default defineConfig({
  testDir: './src',
  testMatch: ['hosted-development.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  workers: 1,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: HOSTED_DEVELOPMENT_BACKOFFICE_URL,
    actionTimeout: 15_000,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'hosted-development-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'hosted-development-phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
