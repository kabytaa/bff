import { defineConfig, devices } from '@playwright/test';
import { TABLECARDS_WEB_URL } from './playwright.config';

// Development-only synthetic auth grants must not appear in browser artifacts.
export default defineConfig({
  testDir: './src',
  testMatch: '**/operator-work.spec.ts',
  outputDir: './operator-work/test-results',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
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
