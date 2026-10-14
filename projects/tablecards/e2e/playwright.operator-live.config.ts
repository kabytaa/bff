import { defineConfig, devices } from '@playwright/test';
import { TABLECARDS_WEB_URL } from './playwright.config';

if (process.env.TABLECARDS_TEST_LIVE_HELPER !== 'true')
  throw new Error(
    'Live helper checks require TABLECARDS_TEST_LIVE_HELPER=true and explicit provider-spend authority.',
  );

// Never let ordinary CI/regression silently spend provider credits.
export default defineConfig({
  testDir: './src',
  testMatch: '**/operator-live.spec.ts',
  outputDir: './operator-live/test-results',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: TABLECARDS_WEB_URL,
    actionTimeout: 20_000,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
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
