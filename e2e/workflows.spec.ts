import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
const origin = () => process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:5176';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Make your data work for you.' })).toBeVisible();
});
test.afterEach(async ({ page }) => {
  await page.request.delete('/api/session', { headers: { Origin: origin() } });
});
async function sample(page: Page, name = 'sales operations') {
  await page.getByRole('button', { name: 'Explore ' + name, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Know your columns' })).toBeVisible();
}
async function apply(page: Page) {
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Transformation preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Apply transformation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Transformation preview' })).toHaveCount(0);
}
test('profiles and browses a sample without changing its original', async ({ page }) => {
  await sample(page);
  await expect(page.locator('.metric').first()).toContainText('27');
  await page.getByRole('textbox', { name: 'Search columns' }).fill('Unit Price');
  await expect(page.locator('.column-card')).toHaveCount(1);
  await expect(page.locator('.column-card')).toContainText('Mean');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Original dataset' })).toBeVisible();
  await page.getByRole('button', { name: 'Next rows' }).click();
  await expect(page.locator('.pagination')).toContainText(/26.27 of 27/);
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await expect(page.locator('.pagination')).toContainText(/1.25 of 27/);
});
test('uploads CSV, previews cleaning, applies and undoes exact changes', async ({ page }) => {
  await page
    .getByLabel('Upload CSV or Excel file')
    .setInputFiles({
      name: 'messy.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Name,Amount,City\n Ava ,10,Paris\n Ava ,10,Paris\nNoah,,\n'),
    });
  await page.getByRole('button', { name: 'Import dataset', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Know your columns' })).toBeVisible();
  await page.getByRole('button', { name: 'Clean', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Apply transformation', exact: true }),
  ).toBeDisabled();
  await apply(page);
  await expect(page.locator('.metric').first()).toContainText('2');
  await page.getByRole('button', { name: 'Fill numeric values with mean', exact: true }).click();
  await apply(page);
  await page.getByRole('button', { name: 'Fill missing categorical values', exact: true }).click();
  await page.getByRole('combobox', { name: 'Column', exact: true }).selectOption('City');
  await page.getByLabel('Replacement value').fill('Unknown');
  await apply(page);
  await expect(page.locator('.metric').nth(2)).toContainText('0');
  await page.getByRole('button', { name: 'History', exact: false }).click();
  await expect(page.locator('.history li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Undo last step' }).click();
  await expect(page.locator('.history li')).toHaveCount(2);
  await expect(page.locator('.metric').nth(2)).toContainText('1');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.preview-comparison').first()).toContainText(/3 rows . untouched/);
});
test('inspects XLSX worksheets and downloads real CSV and Excel exports', async ({ page }) => {
  await page
    .getByLabel('Upload CSV or Excel file')
    .setInputFiles(path.resolve('samples/inventory-review.xlsx'));
  await page.getByLabel('Worksheet').selectOption('Suppliers');
  await page.getByRole('button', { name: 'Import dataset', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Know your columns' })).toBeVisible();
  await expect(page.locator('.metric').first()).toContainText('2');
  for (const [button, extension] of [
    ['Export CSV', '.csv'],
    ['Export Excel', '.xlsx'],
  ]) {
    const waiting = page.waitForEvent('download');
    await page.getByRole('button', { name: button, exact: true }).click();
    const downloaded = await waiting;
    expect(downloaded.suggestedFilename()).toContain(extension);
    expect(await downloaded.failure()).toBeNull();
  }
});
test('renames, normalizes and converts columns with reset', async ({ page }) => {
  await sample(page, 'inventory review');
  await page.getByRole('button', { name: 'Clean', exact: true }).click();
  await page.getByRole('button', { name: 'Rename a column', exact: true }).click();
  await page.getByRole('combobox', { name: 'Column', exact: true }).selectOption('SKU');
  await page.getByLabel('New column name').fill('Item Code');
  await apply(page);
  await page.getByRole('button', { name: 'Normalize column names', exact: true }).click();
  await apply(page);
  await page.getByRole('button', { name: 'Convert a column type', exact: true }).click();
  await page.getByRole('combobox', { name: 'Column', exact: true }).selectOption('on_hand');
  await page
    .getByRole('combobox', { name: 'Target data type', exact: true })
    .selectOption('decimal');
  await apply(page);
  await page.getByRole('button', { name: 'History', exact: false }).click();
  await expect(page.locator('.history li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Reset to original', exact: true }).click();
  await page.getByRole('button', { name: 'Reset dataset', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A clean starting point' })).toBeVisible();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.locator('.column-card').first()).toContainText('SKU');
});
test('renders chart types and reviews similar values without merging', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Charts', exact: true }).click();
  await expect(page.getByRole('img', { name: /bar chart/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Chart type', exact: true }).selectOption('histogram');
  await expect(page.getByRole('img', { name: /histogram chart/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Chart type', exact: true }).selectOption('line');
  await expect(page.getByRole('img', { name: /line chart/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Chart type', exact: true }).selectOption('scatter');
  await expect(page.getByRole('img', { name: /scatter chart/ })).toBeVisible();
  await page.getByRole('button', { name: 'Import & explore' }).click();
  await sample(page, 'customer directory');
  await page.getByRole('button', { name: 'Clean', exact: true }).click();
  await page.getByRole('combobox', { name: 'Text column', exact: true }).selectOption('Full Name');
  await page.getByRole('button', { name: 'Find similar values' }).click();
  await expect(page.locator('.candidate-list')).toContainText('Ava');
  await expect(page.locator('.metric').first()).toContainText('13');
});
test('rejects malformed imports, protects sessions and deletes private data', async ({
  page,
  browser,
}) => {
  await page
    .getByLabel('Upload CSV or Excel file')
    .setInputFiles({
      name: 'broken.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Name,Amount\nAva,2,extra\n'),
    });
  await page.getByRole('button', { name: 'Import dataset', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await sample(page);
  const response = await page.request.get('/api/datasets');
  const [dataset] = await response.json();
  const stranger = await browser.newContext({ baseURL: origin() });
  await stranger.request.get('/api/session');
  expect((await stranger.request.get('/api/datasets/' + dataset.id)).status()).toBe(404);
  await stranger.request.delete('/api/session', { headers: { Origin: origin() } });
  await stranger.close();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.getByRole('button', { name: 'Delete dataset', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete dataset', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Make your data work for you.' })).toBeVisible();
  await sample(page, 'customer directory');
  await page.getByRole('button', { name: 'Clear workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Delete all datasets' }).click();
  await expect(page.getByRole('heading', { name: 'Make your data work for you.' })).toBeVisible();
  expect(await (await page.request.get('/api/datasets')).json()).toEqual([]);
});
