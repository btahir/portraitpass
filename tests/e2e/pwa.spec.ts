import { expect, test } from '@playwright/test';

// Runs against the production build: the service worker registers only there.
test.describe('installable and offline', () => {
  test('manifest is reachable, valid and its icons load', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBe('/manifest.webmanifest');
    const res = await request.get(href!);
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.name).toBe('PortraitPass');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
    for (const icon of manifest.icons) {
      const r = await request.get(icon.src);
      expect(r.ok(), icon.src).toBe(true);
      expect(r.headers()['content-type']).toContain('image/png');
    }
    const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await request.get(touch!)).ok()).toBe(true);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  });

  test('service worker takes control and the site works offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    // A first visit is enough to cache the shell, but the worker controls pages from the next load.
    await page.goto('/privacy/');
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.evaluate(() => navigator.serviceWorker.ready);

    // Warm the caches for a page and the studio, then go offline.
    await page.goto('/studio/?doc=us-passport');
    await expect(page.locator('#root')).not.toBeEmpty();
    await page.goto('/');
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page).toHaveTitle(/PortraitPass/);
      await expect(page.locator('h1').first()).toBeVisible();

      await page.goto('/studio/?doc=us-passport');
      await expect(page).toHaveTitle(/PortraitPass/);
      await expect(page.locator('#root')).not.toBeEmpty();
      // The studio chunk itself must have loaded from the cache, not just the shell.
      await expect(page.locator('input[type="file"]').first()).toBeAttached();

      await page.goto('/privacy/');
      await expect(page.locator('[data-pp-page]').first()).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test('worker only stores this site and ignores POST and cross-origin', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    const stored = await page.evaluate(async () => {
      const out: string[] = [];
      for (const name of await caches.keys()) {
        for (const req of await (await caches.open(name)).keys()) out.push(req.url);
      }
      return out;
    });
    expect(stored.length).toBeGreaterThan(0);
    for (const url of stored) expect(new URL(url).origin).toBe(new URL(page.url()).origin);
    // No photo-like blobs or data URLs are ever stored.
    expect(stored.some((u) => u.startsWith('blob:') || u.startsWith('data:'))).toBe(false);
  });
});
