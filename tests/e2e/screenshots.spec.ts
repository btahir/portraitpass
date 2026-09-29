import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const NOTICE_KEY = 'portraitpass:face-notice';

test('capture real product light/dark and mobile review screens', async ({ page }) => {
  test.setTimeout(120_000);
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
  await page.goto('/studio/?doc=us-passport');
  await expect(page.getByRole('heading', { name: 'Add your photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Try a sample', exact: true }).click();
  await expect(page.getByText('Auto-framed. Check the lines.')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Measurements fit', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${folder}/studio-light.png`, fullPage: true });
  await theme('dark');
  await page.screenshot({ path: `${folder}/studio-dark.png`, fullPage: true });
  await theme('light');
  await page.getByRole('button', { name: 'Sheet', exact: true }).click();
  await page.screenshot({ path: `${folder}/print-sheet.png`, fullPage: true });
  await page.getByRole('button', { name: 'Frame', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${folder}/mobile.png`, fullPage: true });
});
