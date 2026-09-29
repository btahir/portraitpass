import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const NOT_DIY = /Can.t be made at home/;
const search = (page: Page) => page.getByRole('combobox', { name: 'Document or country' });

async function seriousViolations(page: Page) {
  // A theme change starts colour transitions; measure contrast once they have finished.
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))); });
  const report = await new AxeBuilder({ page }).analyze();
  return report.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
}

test.describe('home document picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('measured to the millimetre');
  });

  test('searching "oci" lists India OCI, and the keyboard selects it', async ({ page }) => {
    const box = search(page);
    await box.fill('oci');
    await expect(box).toHaveAttribute('aria-expanded', 'true');
    const option = page.getByRole('option', { name: /India OCI/ });
    await expect(option).toBeVisible();
    await expect(option).toContainText('India');
    await expect(option).toContainText(/px|KB/);

    // Arrow keys move the active option; Enter chooses it.
    await box.fill('india');
    await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    const first = await page.getByRole('option').first().getAttribute('id');
    await expect(box).toHaveAttribute('aria-activedescendant', first!);
    await box.press('ArrowDown');
    const second = await page.getByRole('option').nth(1).getAttribute('id');
    await expect(box).toHaveAttribute('aria-activedescendant', second!);
    await box.press('ArrowUp');
    await expect(box).toHaveAttribute('aria-activedescendant', first!);

    await box.fill('oci');
    await box.press('ArrowDown');
    await box.press('ArrowUp');
    await box.press('Enter');
    await expect(box).toHaveValue(/India OCI/);
    await expect(box).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Rules and sources' })).toHaveAttribute('href', '/in-oci-photo/');
  });

  test('Escape closes the list without choosing', async ({ page }) => {
    const box = search(page);
    await box.fill('schengen');
    await expect(page.getByRole('option', { name: /Schengen/ })).toBeVisible();
    await box.press('Escape');
    await expect(box).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('link', { name: 'Rules and sources' })).toHaveCount(0);
  });

  test('popular chips choose a document', async ({ page }) => {
    const chips = page.getByRole('group', { name: 'Popular documents' }).getByRole('button');
    expect(await chips.count()).toBeGreaterThanOrEqual(4);
    const us = chips.filter({ hasText: 'US passport' }).first();
    await expect(us).toHaveAttribute('aria-pressed', 'false');
    await us.click();
    await expect(us).toHaveAttribute('aria-pressed', 'true');
    await expect(search(page)).toHaveValue('US passport');
    await expect(page.getByRole('button', { name: 'Take photo', exact: true })).toBeVisible();
  });

  test('photo input takes JPG, PNG and WebP but not HEIC', async ({ page }) => {
    const input = page.getByLabel('Upload a photo file', { exact: true });
    const accept = (await input.getAttribute('accept')) ?? '';
    expect(accept).toContain('image/jpeg');
    expect(accept).toContain('image/png');
    expect(accept).not.toMatch(/heic|heif/i);
    await expect(page.getByRole('button', { name: 'Take photo', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload a photo', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try a sample', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open a project', exact: true })).toBeVisible();
  });

  test('a document that cannot be made at home is tagged and explained', async ({ page }) => {
    const box = search(page);
    await box.fill('canada passport');
    const option = page.getByRole('option', { name: /Canada passport/ });
    await expect(option).toContainText(NOT_DIY);
    await box.press('Enter');
    const explainer = page.getByRole('region', { name: /Canada passport can.t be made at home/ });
    await expect(explainer).toBeVisible();
    await expect(explainer.getByRole('link', { name: 'Rules and sources' })).toHaveAttribute('href', '/ca-passport-photo/');
    await expect(page.getByRole('button', { name: 'Take photo', exact: true })).toHaveCount(0);
    await explainer.getByRole('button', { name: 'Pick another document', exact: true }).click();
    await expect(explainer).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Take photo', exact: true })).toBeVisible();
  });

  test('sections and links to document pages are present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read the printing guide' })).toHaveAttribute('href', '/print-passport-photos/');
    await expect(page.getByRole('link', { name: 'US passport', exact: true }).first()).toHaveAttribute('href', '/us-passport-photo/');
    const nodiy = page.getByRole('region', { name: NOT_DIY });
    await expect(nodiy.getByRole('link', { name: /Canada passport/ })).toHaveAttribute('href', '/ca-passport-photo/');
    await expect(page.getByRole('img', { name: /4 by 6 inch print sheet/ })).toBeVisible();
    await expect(page.getByText('Synthetic demo portrait')).toBeVisible();
    const text = await page.locator('.hm').innerText();
    expect(text).not.toMatch(/\b(compliant|approved|guaranteed|verified|official|donat)/i);
  });
});

test('home has no serious accessibility violations in light, dark or mobile, and never scrolls sideways', async ({ page }) => {
  await page.goto('/');
  await search(page).fill('canada');
  expect(await seriousViolations(page)).toEqual([]);
  await search(page).press('Escape');

  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await seriousViolations(page)).toEqual([]);
  await page.emulateMedia({ colorScheme: 'light' });

  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await seriousViolations(page)).toEqual([]);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await seriousViolations(page)).toEqual([]);
});
