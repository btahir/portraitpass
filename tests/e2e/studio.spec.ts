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
  await expect(page.getByRole('link', { name: 'Leave a tip', exact: false })).toBeVisible();
  await expect(page.getByText('We check sizes and positions. The issuing authority decides acceptance.', { exact: false })).toBeVisible();
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
  // General ID has no background rule, so no "not accepted" warning appears at export.
  await expect(page.getByText(/Background edited — not accepted/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Use light blue background', exact: true }).click();
  await expect.poll(async () => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => [...canvas.getContext('2d')!.getImageData(2, 2, 1, 1).data].slice(0, 3))).toEqual([220, 233, 245]);
  const masked = await saveProject(page);
  expect(masked.background.enabled).toBe(true); expect(masked.background.maskDataUrl).toMatch(/^data:image\/png;base64,/);
  await page.getByLabel('Photo format', { exact: true }).selectOption('us-passport');
  expect((await saveProject(page)).background.enabled).toBe(false);
  // Background replacement is offered for the US passport but is off, with the warning at the toggle.
  await expect(page.getByLabel('Replace background locally', { exact: true })).not.toBeChecked();
  await expect(page.locator('#background-note')).toContainText(/does not accept digitally altered photos/);
  await page.getByLabel('Replace background locally', { exact: true }).click();
  await expect(page.getByLabel('Replace background locally', { exact: true })).toBeChecked();
  await expect(page.getByText('Background edited — not accepted for US passport · print', { exact: false })).toBeVisible();
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
  // The save banner pushes the studio down; scroll the canvas back into view so the real mouse hits it.
  await canvas.scrollIntoViewIfNeeded();
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
  const head = page.locator('[data-check="head"]');
  await expect(head).toContainText('31.5 mm');
  await expect(head).toContainText('Within range');
  await expect(page.getByRole('region', { name: 'Measurements', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.getByAltText('Original source photograph', { exact: true })).toBeVisible();
  await expect(canvas).toBeVisible();
  expect((await saveProject(page)).crop).toEqual(measured.crop);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Single photo', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(original.crop);
});

test('original mode has no background controls; print modes show notes and non-DIY documents', async ({ page }) => {
  await page.goto('/'); await upload(page, await geometryImage());
  // The "can't be made at home" notices sit below the preset details, collapsed until opened.
  const notices = page.locator('details.doc-notices');
  await expect(notices.locator('summary')).toHaveText(/Can’t be made at home \(\d+\)/);
  await expect(notices).not.toHaveAttribute('open', '');
  await expect(notices.getByText('Canadian passport', { exact: false })).toBeHidden();
  const [details, noticesBox] = [await page.locator('#document-preset').boundingBox(), await notices.boundingBox()];
  expect(noticesBox!.y).toBeGreaterThan(details!.y + details!.height + 40);
  expect((await page.locator('.preset-notes').boundingBox())!.y).toBeLessThan(noticesBox!.y);
  await notices.locator('summary').click();
  await expect(notices).toContainText('Canadian passport');
  await expect(notices).toContainText('German passport');
  await expect(notices.getByText('Canadian passport', { exact: false })).toBeVisible();
  await expect(page.locator('.preset-notes')).toContainText('Selfies are not accepted');
  await page.getByLabel('Photo format', { exact: true }).selectOption('au-passport');
  await expect(page.locator('.print-note')).toContainText('photo lab');
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-online');
  await expect(page.getByLabel('Replace background locally', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Measurements', exact: true })).toHaveCount(0);
  // uk-online lists JPEG and PNG only, so it must not offer HEIC either.
  await expect(page.getByLabel('Choose a photo', { exact: true })).not.toHaveAttribute('accept', /hei[cf]/);
  await page.getByLabel('Photo format', { exact: true }).selectOption('us-online');
  await expect(page.getByLabel('Choose a photo', { exact: true })).toHaveAttribute('accept', /image\/heic.*\.heif/);
});

test('the file input lists HEIC only for a document that takes HEIC as-is', async ({ page }) => {
  await page.goto('/');
  // The home upload uses the default print preset. Listing HEIC there makes iOS Safari hand over the
  // original HEIC instead of a JPEG, which would break the main iPhone print flow.
  const input = page.getByLabel('Choose a photo', { exact: true });
  await expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  await upload(page, await geometryImage());
  for (const id of ['us-passport', 'uk-passport', 'general-id', 'uk-online']) {
    await page.getByLabel('Photo format', { exact: true }).selectOption(id);
    await expect(input).not.toHaveAttribute('accept', /hei[cf]/);
  }
  await page.getByLabel('Photo format', { exact: true }).selectOption('us-online');
  await expect(input).toHaveAttribute('accept', /image\/heic,image\/heif,\.heic,\.heif/);
  await page.getByLabel('Photo format', { exact: true }).selectOption('us-passport');
  await expect(input).not.toHaveAttribute('accept', /hei[cf]/);
});

/** Synthetic ISO-BMFF container (ftyp heic, an ispe box, padding above the 54 KB minimum). Not a decodable image. */
function fakeHeic(width = 3024, height = 4032) {
  const ftyp = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(4), Buffer.from('mif1heic')]);
  const ispe = Buffer.alloc(20);
  ispe.writeUInt32BE(20, 0); ispe.write('ispe', 4, 'latin1'); ispe.writeUInt32BE(width, 12); ispe.writeUInt32BE(height, 16);
  return Buffer.concat([ftyp, ispe, Buffer.from(Array.from({ length: 70_000 }, (_, i) => (i * 31 + 7) & 255))]);
}

test('a HEIC dropped on a print preset switches to US renewal original, keeps the bytes and blocks print options', async ({ page }) => {
  await page.goto('/');
  const heic = fakeHeic();
  await page.evaluate(async base64 => {
    const dt = new DataTransfer();
    dt.items.add(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'IMG_0001.HEIC', { type: '' }));
    document.querySelector('.app')!.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, heic.toString('base64'));
  await expect(page.getByRole('region', { name: 'Photo preparation studio', exact: true })).toBeVisible();
  const format = page.getByLabel('Photo format', { exact: true });
  await expect(format).toHaveValue('us-online');
  await expect(page.getByRole('status').filter({ hasText: 'HEIC photos can be used as-is for US online renewal' })).toContainText(/Most Compatible.*Settings › Camera › Formats/);
  // Size comes from the file's ispe box, as it does on the command line.
  await expect(page.getByText('3024 × 4032 px', { exact: true })).toBeVisible();
  // Print and general options are disabled while a HEIC is loaded; only originals that list HEIC stay enabled.
  for (const id of ['us-passport', 'uk-passport', 'au-passport', 'general-id', 'uk-online']) await expect(page.locator(`#document-preset option[value="${id}"]`)).toBeDisabled();
  await expect(page.locator('#document-preset option[value="us-online"]')).toBeEnabled();
  await expect(page.locator('#heic-hint')).toContainText('JPEG');
  await expect(page.getByLabel('Choose a photo', { exact: true })).toHaveAttribute('accept', /heic/);
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('IMG_0001.heic');
  expect((await downloadBytes(download)).equals(heic)).toBe(true);
  // Pasting a HEIC while on a print preset behaves the same way.
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await upload(page, await geometryImage());
  await format.selectOption('us-passport');
  await page.evaluate(async base64 => {
    const dt = new DataTransfer();
    dt.items.add(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'pasted.heic', { type: 'image/heic' }));
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  }, heic.toString('base64'));
  await expect(format).toHaveValue('us-online');
  await expect(page.getByRole('status').filter({ hasText: 'Most Compatible' })).toBeVisible();
});

test('a HEIC opened while on another original that does not list HEIC also moves to US renewal', async ({ page }) => {
  await page.goto('/');
  await upload(page, await geometryImage());
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-online');
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name: 'IMG_9.heic', mimeType: 'image/heic', buffer: fakeHeic() });
  await expect(page.getByLabel('Photo format', { exact: true })).toHaveValue('us-online');
  await expect(page.getByRole('status').filter({ hasText: 'Most Compatible' })).toBeVisible();
});

test('saved projects omit head positions unless the user set them, and reopen without treating defaults as set', async ({ page }) => {
  await page.goto('/'); await upload(page, await geometryImage());
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-passport');
  const untouched = await saveProject(page);
  expect(untouched.landmarks).toBeUndefined();
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'plain.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(untouched)) });
  await expect(page.getByLabel('Photo format', { exact: true })).toHaveValue('uk-passport');
  // Head checks need real positions; with none set they are not shown as measured.
  expect((await saveProject(page)).landmarks).toBeUndefined();
  await page.getByText('Manual head measurements', { exact: true }).click();
  await page.getByLabel('Crown from top', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Fit to these measurements', exact: true }).click();
  const set = await saveProject(page);
  expect(set.landmarks).toBeDefined();
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'set.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(set)) });
  expect((await saveProject(page)).landmarks).toEqual(set.landmarks);
  // Original mode never saves head positions, even after they were set on a print preset.
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-online');
  expect((await saveProject(page)).landmarks).toBeUndefined();
});

test('project import resets custom size and session settings; landmark sliders stay in order', async ({ page }) => {
  await page.goto('/'); await upload(page, await geometryImage());
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-passport');
  const project = await saveProject(page);
  await page.getByLabel('Photo format', { exact: true }).selectOption('general-id');
  await page.getByLabel('Width (mm)', { exact: true }).fill('40');
  await page.getByLabel('Width (mm)', { exact: true }).press('Enter');
  await page.getByLabel('Print resolution', { exact: true }).selectOption('600');
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'uk.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByLabel('Print resolution', { exact: true })).toHaveValue('300');
  await page.getByLabel('Photo format', { exact: true }).selectOption('general-id');
  await expect(page.getByLabel('Width (mm)', { exact: true })).toHaveValue('35');
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-passport');
  await page.getByText('Manual head measurements', { exact: true }).click();
  await page.getByLabel('Crown from top', { exact: true }).fill('40');
  // Eyes were at 36%: they are pushed just below the crown instead of being left above it.
  await expect(page.getByLabel('Eyes from top', { exact: true })).toHaveValue('41');
  await page.getByRole('button', { name: 'Fit to these measurements', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const saved = await saveProject(page);
  expect(saved.landmarks.crownY).toBeLessThan(saved.landmarks.eyesY);
  expect(saved.landmarks.eyesY).toBeLessThan(saved.landmarks.chinY);
});

test('one undo step per slider burst; a second finger zooms without moving the crop', async ({ page }) => {
  await page.goto('/'); await upload(page, await geometryImage());
  await page.getByLabel('Photo format', { exact: true }).selectOption('uk-passport');
  const initial = await saveProject(page);
  const zoom = page.getByLabel('Zoom', { exact: true });
  await zoom.focus();
  for (let i = 0; i < 5; i++) await zoom.press('ArrowRight');
  await page.waitForTimeout(700);
  expect((await saveProject(page)).crop.width).toBeLessThan(initial.crop.width);
  await page.getByRole('button', { name: 'Undo position', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(initial.crop);
  await expect(page.getByRole('button', { name: 'Undo position', exact: true })).toBeDisabled();
  // Two synthetic touches spreading apart zoom in; lifting both leaves one undo step.
  await page.getByRole('img', { name: /^Cropped photo preview/ }).evaluate((canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const fire = (type: string, id: number, x: number, y: number) => canvas.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
    fire('pointerdown', 1, cx - 10, cy); fire('pointerdown', 2, cx + 10, cy);
    fire('pointermove', 1, cx - 40, cy); fire('pointermove', 2, cx + 40, cy);
    fire('pointerup', 1, cx - 40, cy); fire('pointerup', 2, cx + 40, cy);
  });
  const pinched = await saveProject(page);
  expect(pinched.crop.width).toBeLessThan(initial.crop.width);
  await page.getByRole('button', { name: 'Undo position', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(initial.crop);
});

test('legal pages and keyword pages have their own headings and the disclaimer footer', async ({ page }) => {
  for (const [path, heading] of [['/privacy/', /never leaves your device/i], ['/terms/', /provided as is/i], ['/accessibility/', /keyboard/i], ['/us-passport-photo/', /US passport photo/], ['/uk-passport-photo/', /UK passport photo/]] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.getByRole('contentinfo')).toContainText('not affiliated with or endorsed by any government or passport office');
    for (const link of ['Privacy', 'Terms', 'Accessibility']) await expect(page.getByRole('contentinfo').getByRole('link', { name: link, exact: true })).toBeVisible();
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText('Free passport photo maker, sized exactly');
});
