import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5186',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'tablet', use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    {
      command:
        process.platform === 'win32'
          ? '.venv/Scripts/python.exe -m uvicorn e2e_server:app --app-dir backend/tests --host 127.0.0.1 --port 8005 --limit-concurrency 20'
          : 'python -m uvicorn e2e_server:app --app-dir backend/tests --host 127.0.0.1 --port 8005 --limit-concurrency 20',
      url: 'http://127.0.0.1:8005/api/health',
      env: { PYTHONPATH: 'backend', APP_ORIGIN: 'http://127.0.0.1:5186', ENVIRONMENT: 'test' },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5186',
      url: 'http://127.0.0.1:5186',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:8005' },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
