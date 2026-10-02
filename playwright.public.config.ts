import { defineConfig, devices } from '@playwright/test';
if (!process.env.PUBLIC_BASE_URL) throw new Error('Set PUBLIC_BASE_URL to the deployed frontend.');
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 60000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-public-report' }]],
  use: {
    baseURL: process.env.PUBLIC_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
