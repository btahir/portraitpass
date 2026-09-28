import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('capture real product light/dark and mobile review screens', async ({ page }) => {
  const folder = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
  await mkdir(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/');
  await page.screenshot({ path: `${folder}/home-light.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await page.screenshot({ path: `${folder}/home-dark.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Try a sample', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
  await page.screenshot({ path: `${folder}/studio-light.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await page.screenshot({ path: `${folder}/studio-dark.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Print sheet', exact: true }).click();
  await page.screenshot({ path: `${folder}/print-sheet.png`, fullPage: true });
  await page.getByRole('button', { name: 'Single photo', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${folder}/mobile.png`, fullPage: true });
});
