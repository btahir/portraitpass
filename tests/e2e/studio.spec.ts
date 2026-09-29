import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { geometryImage, downloadBytes, assertNoSourcePersistence } from './helpers';

const NOTICE_KEY = 'portraitpass:face-notice';

/** Open the studio for a document. By default the face notice has not been seen, so nothing runs a detector. */
async function openStudio(page: Page, doc = 'us-passport', opts: { ack?: boolean } = {}) {
  if (opts.ack) await page.addInitScript(key => localStorage.setItem(key, '1'), NOTICE_KEY);
  await page.goto(`/studio/?doc=${doc}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
async function upload(page: Page, buffer: Buffer, mimeType = 'image/png', name = 'geometry.png') {
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name, mimeType, buffer });
  await expect(page.getByRole('button', { name: 'Start over', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Framed photo|original photo/i })).toBeVisible();
}
async function saveProject(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  return JSON.parse((await downloadBytes(await pending)).toString());
}
const serious = (report: { violations: { impact?: string | null }[] }) => report.violations.filter(x => ['serious', 'critical'].includes(x.impact ?? ''));

test('a ?doc= deep link opens the studio for that document with its numbers, source and checked date', async ({ page }) => {
  await openStudio(page, 'uk-passport');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('UK passport (printed) photo');
  const card = page.getByRole('region', { name: 'Document', exact: true });
  await expect(card).toContainText('35 × 45 mm');
  await expect(card).toContainText('29–34 mm, crown to chin');
  await expect(card).toContainText('Requirements checked 28 Sep 2026');
  await expect(card.getByRole('link').first()).toHaveAttribute('href', /gov\.uk/);
  await expect(page.getByRole('list', { name: 'Steps' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible();
  // Before a photo exists, the right column lists the rules to follow.
  await expect(page.getByText('Before you take the photo')).toBeVisible();
  // Legacy preset ids still open.
  await page.goto('/studio/?doc=us-online');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/US passport/);
});

test('the compact document switcher changes the document and the studio follows the URL', async ({ page }) => {
  await openStudio(page, 'us-passport');
  await upload(page, await geometryImage());
  const before = (await saveProject(page)).crop;
  await page.getByText('Change document', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Document or country' }).fill('UK passport');
  await page.getByRole('option', { name: /^UK passport/ }).first().click();
  await expect(page).toHaveURL(/doc=uk-passport$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('UK passport (printed) photo');
  const after = await saveProject(page);
  expect(after.presetId).toBe('uk-passport');
  // 35 x 45 is a different shape from 2 x 2, so the crop was rebuilt.
  expect(after.crop.width / after.crop.height).toBeCloseTo(35 / 45, 3);
  expect(after.crop.width / after.crop.height).not.toBeCloseTo(before.width / before.height, 2);
});

test('a documented not-DIY document shows the explainer instead of the canvas', async ({ page }) => {
  await openStudio(page, 'ca-passport');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Canada passport photo');
  await expect(page.getByText(/can’t be made at home/i).first()).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Upload a photo', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Document or country' })).toBeVisible();
  // Choosing a document that can be made at home opens the studio for it.
  await page.getByRole('combobox', { name: 'Document or country' }).fill('US passport');
  await page.getByRole('option', { name: /^US passport/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible();
});

test('auto-frame on the demo sample places the head so every US measurement passes, and the analysis checks appear', async ({ page }) => {
  test.setTimeout(90_000);
  await openStudio(page, 'us-passport');
  await page.getByRole('button', { name: 'Try a sample', exact: true }).click();
  // The one-line face notice comes first; nothing runs until it is confirmed.
  const notice = page.getByRole('region', { name: 'Face detection' });
  await expect(notice).toContainText('Face detection runs only in your browser. We never receive your photo or face data.');
  await notice.getByRole('button', { name: 'Auto-frame my photo' }).click();
  await expect(page.getByText('Auto-framed. Check the lines.')).toBeVisible({ timeout: 60_000 });
  for (const id of ['head', 'eyes', 'centre', 'resolution']) {
    const row = page.locator(`[data-check="${id}"]`);
    await expect(row).toHaveClass(/pass/);
  }
  await expect(page.locator('[data-check="head"]')).toContainText('Within range');
  await expect(page.locator('[data-check="head"]')).toContainText('allowed 25.4–34.9 mm');
  await expect(page.locator('[data-check="eyes"]')).toContainText('allowed 28.6–34.9 mm');
  await expect(page.getByText('Measurements fit', { exact: true })).toBeVisible();
  await expect(page.getByText(/approved|guaranteed|compliant/i)).toHaveCount(0);
  // Analysis checks from the photo pixels.
  const photoChecks = page.getByRole('region', { name: 'Photo checks' });
  for (const id of ['background-even', 'background-colour', 'lighting-even', 'exposure', 'sharpness']) await expect(photoChecks.locator(`[data-check="${id}"]`)).toBeVisible();
  await expect(page.getByText('You check', { exact: true })).toBeVisible();
  // The head positions the detector found sit near the reference measured by hand (1024 x 1536 demo).
  const project = await saveProject(page);
  expect(Math.abs(project.landmarks.crownY - 428)).toBeLessThan(55);
  expect(Math.abs(project.landmarks.eyesY - 716)).toBeLessThan(45);
  expect(Math.abs(project.landmarks.chinY - 1003)).toBeLessThan(55);
  // From now on a new photo is framed without asking again.
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByRole('button', { name: 'Try a sample', exact: true }).click();
  await expect(page.getByText('Auto-framed. Check the lines.')).toBeVisible({ timeout: 60_000 });
  expect(await page.evaluate(key => localStorage.getItem(key), NOTICE_KEY)).toBe('1');
});

test('a photo with no face falls back to manual framing with guidance', async ({ page }) => {
  test.setTimeout(90_000);
  await openStudio(page, 'us-passport', { ack: true });
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name: 'geometry.png', mimeType: 'image/png', buffer: await geometryImage() });
  await expect(page.getByText(/No clear face found/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Drag the photo to line the head up/)).toBeVisible();
  await expect(page.getByText('Not measured yet', { exact: true })).toBeVisible();
  await expect(page.locator('[data-check="head"]')).toContainText('Not measured');
});

test('drag, wheel, keyboard, zoom, undo and Adjust precisely keep usable geometry', async ({ page }) => {
  await openStudio(page, 'uk-passport');
  await upload(page, await geometryImage());
  const original = await saveProject(page);
  const canvas = page.getByRole('img', { name: /^Framed photo with the size guides/ });
  // Zoom control, then Undo returns the crop.
  await page.getByLabel('Zoom', { exact: true }).focus();
  await page.getByLabel('Zoom', { exact: true }).press('ArrowRight');
  const zoomed = await saveProject(page);
  expect(zoomed.crop.width).toBeLessThan(original.crop.width);
  await page.getByRole('button', { name: 'Undo position', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(original.crop);
  // Arrow keys nudge by 0.1 mm, Shift by 1 mm; the photo follows the arrow.
  await page.getByLabel('Zoom', { exact: true }).fill('1.6');
  const base = await saveProject(page);
  await canvas.focus();
  await canvas.press('Shift+ArrowDown');
  const keyed = await saveProject(page);
  const perMm = base.crop.width / 35;
  expect(base.crop.y - keyed.crop.y).toBeCloseTo(perMm, 0);
  // Drag with a real mouse.
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 12, { steps: 4 });
  await page.mouse.up();
  const dragged = await saveProject(page);
  expect(dragged.crop.y).not.toBe(keyed.crop.y);
  // Wheel zoom in around the pointer.
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => (await saveProject(page)).crop.width).toBeLessThan(dragged.crop.width);
  // Only the canvas takes over touch gestures.
  expect(await canvas.evaluate(el => getComputedStyle(el).touchAction)).toBe('none');
  expect(await page.getByLabel('Zoom', { exact: true }).evaluate(el => getComputedStyle(el).touchAction)).not.toBe('none');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(original.crop);
  // Sliders live inside Adjust precisely.
  await expect(page.getByLabel('Crown from top', { exact: true })).toBeHidden();
  await page.getByText('Adjust precisely', { exact: true }).click();
  for (const [label, value] of [['Crown from top', '20'], ['Eyes from top', '35'], ['Chin from top', '60']]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Fit to these measurements', exact: true }).click();
  const measured = await saveProject(page);
  expect(measured.landmarks).toMatchObject({ crownY: 400, eyesY: 700, chinY: 1200 });
  expect((measured.landmarks.chinY - measured.landmarks.crownY) / measured.crop.height * 45).toBeCloseTo(31.5, 5);
  const head = page.locator('[data-check="head"]');
  await expect(head).toContainText('31.5 mm');
  await expect(head).toContainText('Within range');
  await expect(page.getByRole('region', { name: 'Measurements', exact: true })).toBeVisible();
  // Before / after keeps the crop.
  await page.getByRole('button', { name: 'Before / after', exact: true }).click();
  await expect(page.getByAltText('Original source photograph', { exact: true })).toBeVisible();
  expect((await saveProject(page)).crop).toEqual(measured.crop);
  await page.getByRole('button', { name: 'Sheet', exact: true }).click();
  await expect(page.getByText(/sheet · \d+ photos/)).toBeVisible();
});

test('a second finger zooms without moving the crop, as one undo step', async ({ page }) => {
  await openStudio(page, 'uk-passport');
  await upload(page, await geometryImage());
  const initial = await saveProject(page);
  await page.getByRole('img', { name: /^Framed photo with the size guides/ }).evaluate((canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const fire = (type: string, id: number, x: number, y: number) => canvas.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
    fire('pointerdown', 1, cx - 10, cy); fire('pointerdown', 2, cx + 10, cy);
    fire('pointermove', 1, cx - 40, cy); fire('pointermove', 2, cx + 40, cy);
    fire('pointerup', 1, cx - 40, cy); fire('pointerup', 2, cx + 40, cy);
  });
  expect((await saveProject(page)).crop.width).toBeLessThan(initial.crop.width);
  await page.getByRole('button', { name: 'Undo position', exact: true }).click();
  expect((await saveProject(page)).crop).toEqual(initial.crop);
  await expect(page.getByRole('button', { name: 'Undo position', exact: true })).toBeDisabled();
});

test('projects save and reopen with the document, crop and head positions the person set', async ({ page }) => {
  await openStudio(page, 'uk-passport');
  await upload(page, await geometryImage());
  const untouched = await saveProject(page);
  expect(untouched.landmarks).toBeUndefined();
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'plain.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(untouched)) });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('UK passport (printed) photo');
  expect((await saveProject(page)).landmarks).toBeUndefined();
  await page.getByText('Adjust precisely', { exact: true }).click();
  await page.getByLabel('Crown from top', { exact: true }).fill('40');
  // Eyes were at 36%: they are pushed just below the crown instead of being left above it.
  await expect(page.getByLabel('Eyes from top', { exact: true })).toHaveValue('41');
  await page.getByRole('button', { name: 'Fit to these measurements', exact: true }).click();
  const set = await saveProject(page);
  expect(set.landmarks.crownY).toBeLessThan(set.landmarks.eyesY);
  expect(set.landmarks.eyesY).toBeLessThan(set.landmarks.chinY);
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'set.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(set)) });
  const reopened = await saveProject(page);
  expect(reopened.landmarks).toEqual(set.landmarks);
  expect(reopened.crop).toEqual(set.crop);
  // A project opened from a fresh studio, with no document in the URL, restores its own document.
  await page.goto('/studio/');
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'set.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(set)) });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('UK passport (printed) photo');
  await expect(page).toHaveURL(/doc=uk-passport$/);
});

test('JPEG, PNG, WebP, paste, drop and malformed input are handled', async ({ page }) => {
  await openStudio(page);
  for (const format of ['jpeg', 'png', 'webp'] as const) {
    await upload(page, await geometryImage(format), `image/${format}`, `geometry.${format}`);
    expect((await saveProject(page)).source.mime).toBe(`image/${format}`);
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
  }
  const image = (await geometryImage()).toString('base64');
  const send = (kind: 'paste' | 'drop', name: string) => page.evaluate(({ base64, kind, name }) => {
    const dt = new DataTransfer();
    dt.items.add(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], name, { type: 'image/png' }));
    if (kind === 'paste') window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    else document.querySelector('.studio-page')!.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, { base64: image, kind, name });
  await send('paste', 'pasted.png');
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  expect((await saveProject(page)).source.name).toBe('pasted.png');
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await send('drop', 'dropped.png');
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  expect((await saveProject(page)).source.name).toBe('dropped.png');
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Open a PortraitPass project', { exact: true }).setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":999}') });
  await expect(page.getByRole('alert')).toContainText(/version|project/i);
});

test('original-only documents have no crop, zoom or background controls, and check the file itself', async ({ page }) => {
  await openStudio(page, 'uk-passport-online');
  const input = page.getByLabel('Choose a photo', { exact: true });
  await expect(input).not.toHaveAttribute('accept', /hei[cf]/);
  await upload(page, await geometryImage('png', 800, 1000), 'image/png', 'orig.png');
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Replace background locally', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Adjust precisely', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'File checks' })).toBeVisible();
  await expect(page.locator('[data-check="pixels"]')).toContainText('800 × 1000 px');
  // Below the 50 KB minimum: a fail with plain words, not silence.
  await expect(page.locator('[data-check="size"]')).toHaveClass(/fail/);
  await expect(page.getByText('1 thing to look at', { exact: false }).first()).toBeVisible();
  await page.goto('/studio/?doc=us-passport-online');
  await expect(page.getByLabel('Choose a photo', { exact: true })).toHaveAttribute('accept', /image\/heic.*\.heif/);
  await page.goto('/studio/?doc=us-passport');
  await expect(page.getByLabel('Choose a photo', { exact: true })).not.toHaveAttribute('accept', /hei[cf]/);
});

/** Synthetic ISO-BMFF container (ftyp heic, an ispe box, padding above the 54 KB minimum). Not a decodable image. */
function fakeHeic(width = 3024, height = 4032) {
  const ftyp = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(4), Buffer.from('mif1heic')]);
  const ispe = Buffer.alloc(20);
  ispe.writeUInt32BE(20, 0); ispe.write('ispe', 4, 'latin1'); ispe.writeUInt32BE(width, 12); ispe.writeUInt32BE(height, 16);
  return Buffer.concat([ftyp, ispe, Buffer.from(Array.from({ length: 70_000 }, (_, i) => (i * 31 + 7) & 255))]);
}

test('a HEIC on a print document switches to the US renewal original and downloads the exact bytes', async ({ page }) => {
  await openStudio(page, 'us-passport');
  const heic = fakeHeic();
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name: 'IMG_0001.HEIC', mimeType: 'image/heic', buffer: heic });
  await expect(page).toHaveURL(/doc=us-passport-online$/);
  await expect(page.getByRole('status').filter({ hasText: 'HEIC photos can be used as-is for US online renewal' })).toContainText(/Most Compatible.*Settings › Camera › Formats/);
  await expect(page.getByLabel('Choose a photo', { exact: true })).toHaveAttribute('accept', /heic/);
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveCount(0);
  await expect(page.locator('#heic-hint')).toContainText('JPEG');
  await expect(page.getByText('3024 × 4032 px', { exact: false }).first()).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('IMG_0001.heic');
  expect((await downloadBytes(download)).equals(heic)).toBe(true);
  // Switching to a print document is refused while a HEIC is loaded.
  await page.getByText('Change document', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Document or country' }).fill('UK passport');
  await page.getByRole('option', { name: /^UK passport/ }).first().click();
  await expect(page.getByRole('alert')).toContainText('JPEG');
  await expect(page).toHaveURL(/doc=us-passport-online$/);
});

test('background replacement keeps its policy: off by default, a warning at the toggle, another at export', async ({ page }) => {
  test.setTimeout(90_000);
  await openStudio(page, 'general-id');
  await page.getByRole('button', { name: 'Try a sample', exact: true }).click();
  await expect(page.getByRole('img', { name: /Framed photo/ })).toBeVisible();
  // Custom size: bad input keeps the previous size.
  await page.getByLabel('Width (mm)', { exact: true }).fill('40');
  await page.getByLabel('Width (mm)', { exact: true }).press('Enter');
  await page.getByLabel('Width (mm)', { exact: true }).fill('35');
  await page.getByLabel('Width (mm)', { exact: true }).press('Enter');
  await page.getByLabel('Width (mm)', { exact: true }).fill('');
  await page.getByLabel('Width (mm)', { exact: true }).press('Enter');
  await expect(page.getByLabel('Width (mm)', { exact: true })).toHaveValue('35');
  await expect(page.getByRole('alert')).toContainText('previous size was kept');
  // General ID has no background rule, so no "not accepted" warning.
  await expect(page.getByLabel('Replace background locally', { exact: true })).not.toBeChecked();
  await page.getByLabel('Replace background locally', { exact: true }).click();
  await expect(page.getByLabel('Replace background locally', { exact: true })).toBeChecked();
  await expect(page.getByText(/Background edited — not accepted/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Use light blue background', exact: true }).click();
  await expect.poll(async () => page.locator('canvas').first().evaluate((canvas: HTMLCanvasElement) => [...canvas.getContext('2d')!.getImageData(2, 2, 1, 1).data].slice(0, 3))).toEqual([220, 233, 245]);
  const masked = await saveProject(page);
  expect(masked.background.enabled).toBe(true);
  expect(masked.background.maskDataUrl).toMatch(/^data:image\/png;base64,/);
  // The US passport forbids altered photos: off after switching, warned at the toggle and once on.
  await page.getByText('Change document', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Document or country' }).fill('US passport');
  await page.getByRole('option', { name: /^US passport/ }).first().click();
  await expect(page.getByLabel('Replace background locally', { exact: true })).not.toBeChecked();
  await expect(page.locator('#background-note')).toContainText(/does not accept digitally altered photos/);
  await page.getByLabel('Replace background locally', { exact: true }).click();
  await expect(page.getByText('Background edited — not accepted for US passport', { exact: false })).toBeVisible();
});

test('a download shows the tips ask, and Tips never unlock anything', async ({ page }) => {
  await openStudio(page, 'us-passport');
  await page.getByRole('button', { name: 'Try a sample', exact: true }).click();
  await expect(page.getByRole('tablist', { name: 'Download type' })).toBeVisible();
  await expect(page.getByText('We check sizes and positions. The issuing authority decides acceptance.', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Leave a tip/ })).toHaveCount(0);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download print sheet', exact: true }).click();
  await downloadBytes(await pending);
  await expect(page.getByRole('link', { name: /Leave a tip/ })).toHaveAttribute('href', '/support/');
  await expect(page.getByText(/donat/i)).toHaveCount(0);
});

test('nothing leaves the device, works offline and stores no photo', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4319') external.push(request.url()); });
  await openStudio(page, 'uk-passport-online');
  const original = Buffer.concat([await geometryImage('png', 800, 1000), Buffer.alloc(60_000)]);
  await upload(page, original);
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original', exact: true }).click();
  expect((await downloadBytes(await pending)).equals(original)).toBe(true);
  const stored = await assertNoSourcePersistence(page);
  expect(JSON.stringify(stored)).not.toMatch(/data:image|geometry\.png|base64/);
  expect(stored.databases).toEqual([]);
  expect(external).toEqual([]);
});

test('empty, loaded, light, dark and mobile studios have no serious accessibility violations or horizontal overflow', async ({ page }) => {
  await openStudio(page);
  expect(serious(await new AxeBuilder({ page }).analyze())).toEqual([]);
  await upload(page, await geometryImage());
  for (const theme of ['light', 'dark']) {
    const button = page.getByRole('button', { name: `Switch to ${theme} theme`, exact: true });
    if (await button.count()) await button.click();
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    expect(serious(await new AxeBuilder({ page }).analyze())).toEqual([]);
  }
  for (const size of [{ width: 390, height: 844 }, { width: 820, height: 1000 }, { width: 1024, height: 800 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(serious(await new AxeBuilder({ page }).analyze())).toEqual([]);
  // Mobile order: the photo, then the checks, then the downloads.
  const y = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!.y;
  const canvasY = await y(page.getByRole('img', { name: /^Framed photo/ }));
  const checksY = await y(page.getByRole('region', { name: 'Checks', exact: true }));
  const outputY = await y(page.getByRole('region', { name: 'Download', exact: true }));
  expect(canvasY).toBeLessThan(checksY);
  expect(checksY).toBeLessThan(outputY);
  await page.getByRole('button', { name: 'Download print sheet', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Download print sheet', exact: true })).toBeEnabled();
  // The empty studio on a phone does not scroll sideways either.
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Take photo opens the camera dialog from the studio', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['camera'] });
  const page = await context.newPage();
  await page.goto('/studio/?doc=us-passport');
  await page.getByRole('button', { name: 'Take photo', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await context.close();
});

test('home hands a photo, the sample and a chosen document to the studio', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample', exact: false }).first().click();
  await expect(page).toHaveURL(/\/studio\//);
  await expect(page.getByRole('img', { name: /Framed photo/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('contentinfo')).toContainText('not affiliated with or endorsed by any government or passport office');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Privacy', exact: true })).toBeVisible();
});
