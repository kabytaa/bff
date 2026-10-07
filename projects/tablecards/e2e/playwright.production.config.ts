import { defineConfig, devices } from '@playwright/test';

// Public production checks must never load development identities or grants.
export default defineConfig({
  testDir: './src',
  testMatch: '**/production-smoke.spec.ts',
  outputDir: './test-results/production',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'https://tablecards.tofler.app',
    actionTimeout: 20_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
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
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
