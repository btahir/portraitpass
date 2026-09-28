import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { geometryImage, downloadBytes } from './helpers';

test('4K source crop and export timings meet local budget; EXIF orientation follows decoded pixels', async ({ page }) => {
  await page.goto('/');
  const oriented = await sharp(await geometryImage('jpeg', 1200, 1600)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name: 'rotated.jpg', mimeType: 'image/jpeg', buffer: oriented });
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  const projectDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  const project = JSON.parse((await downloadBytes(await projectDownload)).toString());
  expect([project.source.width, project.source.height]).toEqual([1600, 1200]);
  const input = await geometryImage('jpeg', 3840, 2160);
  await page.getByLabel('Choose a photo', { exact: true }).setInputFiles({ name: '4k.jpg', mimeType: 'image/jpeg', buffer: input });
  await expect(page.getByRole('button', { name: 'Download photo', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const state = window as unknown as { __cropStart: number; __cropMs: number; __exportStart: number; __exportMs: number };
    state.__cropStart = 0; state.__cropMs = 0; state.__exportStart = 0; state.__exportMs = 0;
    document.addEventListener('keydown', event => { if ((event.target as Element).id === 'zoom') state.__cropStart = performance.now(); }, { capture: true });
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const result = (draw as Function).apply(this, args);
      if (state.__cropStart && !state.__cropMs) { state.__cropMs = performance.now() - state.__cropStart; state.__cropStart = 0; }
      return result;
    };
    document.addEventListener('click', event => { if ((event.target as Element).closest('.download-button')) state.__exportStart = performance.now(); }, { capture: true });
    const objectUrl = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      if (state.__exportStart && blob instanceof Blob && blob.type.startsWith('image/')) state.__exportMs = performance.now() - state.__exportStart;
      return objectUrl.call(URL, blob);
    };
  });
  await page.getByLabel('Zoom', { exact: true }).press('ArrowRight');
  await page.waitForFunction(() => (window as unknown as { __cropMs: number }).__cropMs > 0);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download photo', exact: true }).click();
  expect((await downloadBytes(await pending)).length).toBeGreaterThan(0);
  const timings = await page.evaluate(() => {
    const state = window as unknown as { __cropMs: number; __exportMs: number };
    return { cropMs: state.__cropMs, exportMs: state.__exportMs };
  });
  console.log('4K_TIMINGS', JSON.stringify(timings));
  expect(timings.cropMs).toBeLessThan(100);
  expect(timings.exportMs).toBeGreaterThan(0);
  expect(timings.exportMs).toBeLessThan(1500);
});
