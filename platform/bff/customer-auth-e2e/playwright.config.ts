import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: ['customer-session.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'cross-site-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://localhost:4410',
      },
    },
    {
      name: 'same-site-webkit',
      use: {
        ...devices['Desktop Safari'],
        baseURL: 'https://127.0.0.1:4410',
      },
    },
  ],
  webServer: {
    command:
      'tsx --tsconfig ../../../tsconfig.base.json src/localHarnessServer.ts',
    url: 'https://localhost:4410',
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
