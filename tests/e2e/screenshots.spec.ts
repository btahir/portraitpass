import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const NOTICE_KEY = 'portraitpass:face-notice';
const CAMERA_FILE = process.env.PP_FAKE_CAMERA_Y4M;

// Chrome's fake camera. With PP_FAKE_CAMERA_Y4M (a .y4m made from the synthetic demo portrait) the modal shows
// that portrait; without it Chrome serves its built-in test pattern.
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      ...(CAMERA_FILE ? [`--use-file-for-fake-video-capture=${CAMERA_FILE}`] : []),
    ],
  },
  permissions: ['camera'],
});

test('capture real product light/dark, mobile, documents and camera screens', async ({ page }) => {
  test.setTimeout(180_000);
  const folder = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
  await mkdir(folder, { recursive: true });
  await page.addInitScript(key => localStorage.setItem(key, '1'), NOTICE_KEY);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const theme = async (to: 'light' | 'dark') => {
    const button = page.getByRole('button', { name: `Switch to ${to} theme`, exact: true });
    if (await button.count()) await button.click();
  };
  await page.goto('/');
  await page.screenshot({ path: `${folder}/home-light.png`, fullPage: true });
  await theme('dark');
  await page.screenshot({ path: `${folder}/home-dark.png`, fullPage: true });
  await theme('light');

  // Camera modal (fake stream), opened from the home page.
  await page.getByRole('button', { name: 'Take photo' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Take a photo' });
  await expect(dialog).toBeVisible();
  const turnOn = dialog.getByRole('button', { name: 'Turn on camera' });
  if (await turnOn.isVisible()) await turnOn.click();
  await expect(dialog.getByTestId('camera-video')).toBeVisible();
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return !!v && v.readyState >= 2 && v.videoWidth > 0 && !v.paused;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${folder}/camera-modal.png` });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // Documents index and one document page.
  await page.goto('/documents/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${folder}/documents-index.png`, fullPage: true });
  await page.goto('/dv-lottery-photo/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${folder}/document-page.png`, fullPage: true });

  // Studio: auto-framed with guides and live checks.
  await page.goto('/studio/?doc=us-passport');
  await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Try a sample', exact: true }).click();
  await expect(page.getByText('Auto-framed. Check the lines.')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Measurements fit', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${folder}/studio-light.png`, fullPage: true });
  await sharp(`${folder}/studio-light.png`).resize({ width: 1200 }).webp({ quality: 82 }).toFile(`${folder}/studio-light.webp`);
  await theme('dark');
  await page.screenshot({ path: `${folder}/studio-dark.png`, fullPage: true });
  await theme('light');
  await page.getByRole('button', { name: 'Sheet', exact: true }).click();
  await page.screenshot({ path: `${folder}/print-sheet.png`, fullPage: true });
  await page.getByRole('button', { name: 'Frame', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${folder}/mobile.png`, fullPage: true });
});
