import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:5176';
fs.mkdirSync('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
for (const mobile of [false, true]) {
  const context = await browser.newContext({
    baseURL: base,
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('heading', { name: 'Make your data work for you.' }).waitFor();
  await page.screenshot({
    path: `docs/screenshots/home-${mobile ? 'mobile' : 'desktop'}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Explore sales operations', exact: true }).click();
  await page.getByRole('heading', { name: 'Know your columns' }).waitFor();
  await page.screenshot({
    path: `docs/screenshots/overview-${mobile ? 'mobile' : 'desktop'}.png`,
    fullPage: true,
  });
  if (!mobile) {
    await page.getByRole('button', { name: 'Clean', exact: true }).click();
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click();
    await page.getByRole('heading', { name: 'Transformation preview' }).waitFor();
    await page.screenshot({ path: 'docs/screenshots/clean-preview-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Apply transformation', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Transformation preview' })
      .waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await page.getByRole('heading', { name: 'Browse all rows' }).waitFor();
    await page.locator('.inline-loading').waitFor({ state: 'hidden' });
    await page.screenshot({ path: 'docs/screenshots/compare-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Charts', exact: true }).click();
    await page.getByRole('combobox', { name: 'Column', exact: true }).selectOption('Region');
    await page.getByRole('img', { name: /bar chart of Region/ }).waitFor();
    await page.screenshot({ path: 'docs/screenshots/chart-desktop.png', fullPage: true });
    await page.getByRole('button', { name: /^History/ }).click();
    await page.locator('.history li').waitFor();
    await page.screenshot({ path: 'docs/screenshots/history-desktop.png', fullPage: true });
  }
  await page.request.delete('/api/session', { headers: { Origin: base } });
  if (errors.length) throw new Error(errors.join('; '));
  await context.close();
}
await browser.close();
console.log('Captured eight real screens without browser errors.');
