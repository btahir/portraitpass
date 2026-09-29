import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { downloadBytes } from './helpers';

const DISCLAIMER = 'We check sizes and positions. The issuing authority decides acceptance.';

/** Open the studio for a document through the deep link and the sample photo. */
async function openWithSample(page: Page, docId: string) {
  await page.goto(`/studio/?doc=${docId}`);
  const panel = page.getByRole('region', { name: 'Download', exact: true });
  const sample = page.getByRole('button', { name: /try a sample/i }).first();
  await expect(panel.or(sample)).toBeVisible();
  if (await sample.isVisible()) await sample.click();
  await expect(panel).toBeVisible({ timeout: 20_000 });
}
async function download(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return downloadBytes(await pending);
}
/** Mean absolute difference between two same-sized raw buffers. */
const meanDiff = (a: Buffer, b: Buffer) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
};

test('US passport prints six photos on one 4x6 edge-to-edge JPEG', async ({ page }) => {
  await openWithSample(page, 'us-passport');
  await expect(page.getByRole('tab', { name: 'Print sheet' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('6 photos on one 4 × 6 in sheet')).toBeVisible();
  await expect(page.getByLabel('Layout')).toHaveValue('edge-to-edge');
  await expect(page.getByText(DISCLAIMER, { exact: false }).first()).toBeVisible();
  const bytes = await download(page, 'Download print sheet');
  const image = sharp(bytes);
  const meta = await image.metadata();
  expect([meta.format, meta.width, meta.height, meta.density]).toEqual(['jpeg', 1200, 1800, 300]);
  // Two columns by three rows of 600 px photos: every cell holds the same picture.
  const cell = async (col: number, row: number) =>
    sharp(bytes).extract({ left: col * 600, top: row * 600, width: 600, height: 600 }).raw().toBuffer();
  const first = await cell(0, 0);
  const stats = await sharp(bytes).extract({ left: 150, top: 150, width: 300, height: 300 }).stats();
  expect(stats.channels[0].stdev).toBeGreaterThan(3);
  for (const [col, row] of [[1, 0], [0, 1], [1, 1], [0, 2], [1, 2]])
    expect(meanDiff(first, await cell(col, row))).toBeLessThan(8);
  // The print guide follows a sheet export.
  await expect(page.getByRole('heading', { name: 'Print for about 40¢' })).toBeVisible();
  await expect(page.getByRole('link', { name: /printing passport photos/i })).toHaveAttribute('href', '/print-passport-photos/');
});

test('paper choice changes the layout style and photo count', async ({ page }) => {
  await openWithSample(page, 'us-passport');
  await page.getByLabel('Paper size').selectOption('a4');
  await expect(page.getByLabel('Layout')).toHaveValue('cut-marks');
  await expect(page.getByRole('button', { name: 'PDF', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/\d+ photos on one A4 sheet/)).toBeVisible();
  await page.getByLabel('Paper size').selectOption('4x6');
  await expect(page.getByLabel('Layout')).toHaveValue('edge-to-edge');
});

test('DV lottery exports a 600 x 600 JPEG under 240 KB and shows the result', async ({ page }) => {
  await openWithSample(page, 'dv-lottery');
  // A single output is not a one-tab tablist.
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByText('600 × 600 px · up to 240 KB')).toBeVisible();
  await expect(page.getByText(DISCLAIMER, { exact: false }).first()).toBeVisible();
  const bytes = await download(page, 'Download digital photo');
  const meta = await sharp(bytes).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 600, 600]);
  expect(bytes.length).toBeLessThanOrEqual(240_000);
  await expect(page.getByText(/600×600 px · \d+ KB \(quality \d+\)/)).toBeVisible();
});

test('UK printed passport fits eight photos on a landscape 4x6', async ({ page }) => {
  await openWithSample(page, 'uk-passport');
  await expect(page.getByText('8 photos on one 4 × 6 in sheet')).toBeVisible();
  await expect(page.getByText(/professionally printed/i).first()).toBeVisible();
  const bytes = await download(page, 'Download print sheet');
  const meta = await sharp(bytes).metadata();
  expect([meta.width, meta.height]).toEqual([1800, 1200]);
  await expect(page.getByText(/UK paper forms/)).toBeVisible();
});

test('single photo tab downloads a PNG at the print size', async ({ page }) => {
  await openWithSample(page, 'uk-passport');
  await page.getByRole('tab', { name: 'Single photo' }).click();
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  const bytes = await download(page, 'Download photo');
  const meta = await sharp(bytes).metadata();
  expect([meta.format, meta.width, meta.height, meta.density]).toEqual(['png', 413, 531, 300]);
});

test('US online renewal offers only the unchanged original', async ({ page }) => {
  await openWithSample(page, 'us-passport-online');
  // One output is a heading and a button, not a tablist with a single tab.
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Download', exact: true })).toBeVisible();
  await expect(page.getByText('Accepted', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Paper size')).toHaveCount(0);
  await expect(page.getByText(DISCLAIMER, { exact: false }).first()).toBeVisible();
  const bytes = await download(page, 'Download original');
  const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));
  const samples = await Promise.all(['demo-portrait.png', 'demo-portrait-2.png', 'demo-shadow.png'].map(f => readFile(publicDir + f)));
  expect(samples.some(sample => sample.equals(bytes))).toBe(true);
});

test('output tabs follow the tablist keyboard pattern', async ({ page }) => {
  await openWithSample(page, 'us-passport');
  const sheet = page.getByRole('tab', { name: 'Print sheet' });
  const single = page.getByRole('tab', { name: 'Single photo' });
  await expect(sheet).toHaveAttribute('tabindex', '0');
  await expect(single).toHaveAttribute('tabindex', '-1');
  await sheet.focus();
  await page.keyboard.press('ArrowRight');
  await expect(single).toBeFocused();
  await expect(single).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(sheet).toBeFocused();
  await expect(page.getByRole('tabpanel')).toBeVisible();
});
