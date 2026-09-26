import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/index.e2e.html',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'phone-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command:
      'node ../../../node_modules/vite/bin/vite.js --config ../backoffice/vite.e2e.config.ts',
    url: 'http://127.0.0.1:4174/index.e2e.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
