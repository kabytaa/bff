import { defineConfig, devices } from '@playwright/test';
import { TABLECARDS_WEB_URL } from './playwright.config';

export default defineConfig({
  testDir: './src',
  testMatch: '**/test-users.spec.ts',
  outputDir: './test-users/test-results',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 25_000 },
  reporter: [['list']],
  use: {
    baseURL: TABLECARDS_WEB_URL,
    actionTimeout: 20_000,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    { name: 'phone-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
