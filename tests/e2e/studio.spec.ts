import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { geometryImage, downloadBytes, assertNoSourcePersistence } from './helpers';

async function upload(page: Page, buffer: Buffer, mimeType = 'image/png', name = 'geometry.png') {
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name, mimeType, buffer });
  await expect(page.getByRole('region', { name: 'Photo preparation studio', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
}
async function saveProject(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  return JSON.parse((await downloadBytes(await pending)).toString());
}

test('UI crop, undo, project settings and PNG/PDF downloads survive a portable handoff', async ({ page }) => {
  await page.goto('/'); await upload(page, await geometryImage());
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-passport');
  await expect(page.getByText('Requirements checked 2026-09-28.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  const initial = await saveProject(page);
  await page.getByLabel('Zoom', { exact: true }).focus();
  await page.getByLabel('Zoom', { exact: true }).press('ArrowRight');
  const zoomed = await saveProject(page);
  expect(zoomed.crop.width).toBeLessThan(initial.crop.width);
  expect(zoomed.format).toBe('png');
  await page.getByRole('button', { name: 'Undo position', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(initial.crop);
  const pendingImage = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download photo', exact: true }).click();
  const metadata = await sharp(await downloadBytes(await pendingImage)).metadata();
  expect([metadata.width, metadata.height, metadata.density]).toEqual([413, 531, 300]);
  await page.getByLabel('Paper size', { exact: true }).selectOption('a4');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const project = await saveProject(page);
  expect(project.paperId).toBe('a4'); expect(project.format).toBe('pdf'); expect(project.outputKind).toBe('sheet');
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'handoff.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByLabel('Photo format', { exact: true })).toHaveValue('uk-passport');
  await expect(page.getByRole('button', { name: 'PDF', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await saveProject(page)).crop).toEqual(project.crop);
  await expect(page.getByRole('button', { name: 'Print sheet', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const pendingPdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download print sheet', exact: true }).click();
  const pdf = await PDFDocument.load(await downloadBytes(await pendingPdf));
  expect(pdf.getPage(0).getWidth()).toBeCloseTo(210 * 72 / 25.4, 4);
  expect(pdf.getPage(0).getHeight()).toBeCloseTo(297 * 72 / 25.4, 4);
  await expect(page.getByRole('link', { name: 'Leave a little thank-you', exact: false })).toBeVisible();
});

test('digital workflow keeps exact original bytes after print edits and works offline without storing photos', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4319') external.push(request.url()); });
  await page.goto('/');
  const original = Buffer.concat([await geometryImage('png', 800, 1000), Buffer.alloc(60_000)]);
  await upload(page, original);
  await page.getByLabel('Zoom', { exact: true }).press('ArrowRight');
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-online');
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Print sheet', exact: true })).toBeDisabled();
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original', exact: true }).click();
  expect((await downloadBytes(await pending)).equals(original)).toBe(true);
  await page.getByLabel('Photo format', { exact: true }).selectOption('us-passport');
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  const offlinePrint = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download photo', exact: true }).click();
  expect((await sharp(await downloadBytes(await offlinePrint)).metadata()).width).toBe(600);
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  await page.getByRole('button', { name: 'Print sheet', exact: true }).click();
  const firstOfflinePdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download print sheet', exact: true }).click();
  const pdf = await PDFDocument.load(await downloadBytes(await firstOfflinePdf));
  expect(pdf.getPage(0).getWidth()).toBeCloseTo(101.6 * 72 / 25.4, 4);
  expect(pdf.getPage(0).getHeight()).toBeCloseTo(152.4 * 72 / 25.4, 4);
  const stored = await assertNoSourcePersistence(page);
  expect(JSON.stringify(stored)).not.toMatch(/data:image|geometry\.png|base64/);
  expect(stored.databases).toEqual([]);
  expect(external).toEqual([]);
});

test('JPEG, PNG, WebP, paste, drop and malformed input are handled', async ({ page }) => {
  await page.goto('/');
  for (const format of ['jpeg', 'png', 'webp'] as const) {
    await upload(page, await geometryImage(format), `image/${format}`, `geometry.${format}`);
    const saved = await saveProject(page);
    expect(saved.source.mime).toBe(`image/${format}`);
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
  }
  const image = (await geometryImage()).toString('base64');
  await page.evaluate(base64 => { const dt = new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(base64), c=>c.charCodeAt(0))], 'pasted.png', { type: 'image/png' }));window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); }, image);
  await expect(page.getByRole('region', { name: 'Photo preparation studio', exact: true })).toBeVisible();
  expect((await saveProject(page)).source.name).toBe('pasted.png');
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.evaluate(base64 => { const dt = new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(base64), c=>c.charCodeAt(0))], 'dropped.png', { type: 'image/png' }));document.querySelector('.app')!.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, image);
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  expect((await saveProject(page)).source.name).toBe('dropped.png');
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":999}') });
  await expect(page.getByRole('alert')).toContainText(/version|project/i);
});

test('loaded light/dark/mobile studio has no serious accessibility violations or horizontal overflow', async ({ page }) => {
  await page.goto('/');
  let report = await new AxeBuilder({ page }).analyze();
  expect(report.violations.filter(x => ['serious', 'critical'].includes(x.impact ?? ''))).toEqual([]);
  await upload(page, await geometryImage());
  for (const theme of ['light', 'dark']) {
    const button = page.getByRole('button', { name: `Switch to ${theme} theme`, exact: true });
    if (await button.count()) await button.click();
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    report = await new AxeBuilder({ page }).analyze();
    expect(report.violations.filter(x => ['serious', 'critical'].includes(x.impact ?? ''))).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  report = await new AxeBuilder({ page }).analyze();
  expect(report.violations.filter(x => ['serious', 'critical'].includes(x.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Download photo', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Download photo', exact: true })).toBeEnabled();
});

test('600 DPI and general-ID local background preview survive saved-project handoff', async ({ page }) => {
  await page.goto('/'); await upload(page, await geometryImage());
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-passport');
  await page.getByLabel('Print resolution', { exact: true }).selectOption('600');
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  const highDpi = await saveProject(page); expect(highDpi.dpi).toBe(600);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download photo', exact: true }).click();
  const metadata = await sharp(await downloadBytes(await pending)).metadata();
  expect([metadata.width, metadata.height, metadata.density]).toEqual([827, 1063, 600]);
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: '600dpi.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(highDpi)) });
  await expect(page.getByLabel('Print resolution', { exact: true })).toHaveValue('600');
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByRole('button', { name: 'Try a sample', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  await page.getByLabel('Photo format', { exact: true }).selectOption('general-id');
  await page.getByLabel('Width (mm)', { exact: true }).fill('40');
  await page.getByLabel('Width (mm)', { exact: true }).press('Enter');
  await page.getByLabel('Width (mm)', { exact: true }).fill('35');
  await page.getByLabel('Width (mm)', { exact: true }).press('Enter');
  await page.getByLabel('Height (mm)', { exact: true }).fill('45');
  await page.getByLabel('Height (mm)', { exact: true }).press('Enter');
  await page.getByLabel('Width (mm)', { exact: true }).fill('');
  await page.getByLabel('Width (mm)', { exact: true }).press('Enter');
  await expect(page.getByLabel('Width (mm)', { exact: true })).toHaveValue('35');
  await expect(page.getByRole('alert')).toContainText('previous size was kept');
  await page.getByLabel('Print resolution', { exact: true }).selectOption('300');
  await page.getByLabel('Replace background locally', { exact: true }).click();
  await expect(page.getByLabel('Replace background locally', { exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Use light blue background', exact: true }).click();
  await expect.poll(async () => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => [...canvas.getContext('2d')!.getImageData(2, 2, 1, 1).data].slice(0, 3))).toEqual([220, 233, 245]);
  const masked = await saveProject(page);
  expect(masked.background.enabled).toBe(true); expect(masked.background.maskDataUrl).toMatch(/^data:image\/png;base64,/);
  await page.getByLabel('Photo format', { exact: true }).selectOption('us-passport');
  expect((await saveProject(page)).background.enabled).toBe(false);
});

test('drag, keyboard, manual measurements, compare and reset retain usable geometry', async ({ page }) => {
  await page.goto('/'); await upload(page, await geometryImage());
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-passport');
  const original = await saveProject(page);
  await page.getByLabel('Zoom', { exact: true }).fill('1.5');
  const positioned = await saveProject(page);
  const canvas = page.getByRole('img', { name: /^Cropped photo preview/ });
  await canvas.focus(); await canvas.press('Shift+ArrowDown');
  const keyed = await saveProject(page);
  expect(keyed.crop.y).not.toBe(positioned.crop.y);
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 5, { steps: 3 }); await page.mouse.up();
  expect((await saveProject(page)).crop.y).not.toBe(keyed.crop.y);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(original.crop);
  await page.getByText('Manual head measurements', { exact: true }).click();
  for (const [label, value] of [['Crown from top', '20'], ['Eyes from top', '35'], ['Chin from top', '60']]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Fit to these measurements', exact: true }).click();
  const measured = await saveProject(page);
  expect(measured.landmarks).toMatchObject({ crownY: 400, eyesY: 700, chinY: 1200 });
  expect((measured.landmarks.chinY - measured.landmarks.crownY) / measured.crop.height * 45).toBeCloseTo(31.5, 5);
  await expect(page.getByText(/Current head: 31.5 mm/)).toBeVisible();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.getByAltText('Original source photograph', { exact: true })).toBeVisible();
  await expect(canvas).toBeVisible();
  expect((await saveProject(page)).crop).toEqual(measured.crop);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Single photo', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(original.crop);
});
