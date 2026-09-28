import { defineConfig, devices } from '@playwright/test';

export const TABLECARDS_AUTH_URL = 'https://auth-dev.tofler.app';
export const TABLECARDS_WEB_URL = 'https://tablecards-dev.tofler.app';

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 3 * 60 * 1_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    actionTimeout: 20_000,
    baseURL: TABLECARDS_WEB_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
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
