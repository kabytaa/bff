import { defineConfig, devices } from '@playwright/test';

export const HOSTED_CUSTOMER_AUTH_URL = 'https://auth-dev.tofler.app';
export const HOSTED_EXAMPLE_URL = 'https://example-dev.tofler.app';

export default defineConfig({
  testDir: './src',
  testMatch: ['hosted-development.spec.ts'],
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 15 * 60 * 1_000,
  expect: { timeout: 15_000 },
  workers: 2,
  reporter: [['list']],
  use: {
    actionTimeout: 15_000,
    baseURL: HOSTED_EXAMPLE_URL,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'hosted-development-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'hosted-development-webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
