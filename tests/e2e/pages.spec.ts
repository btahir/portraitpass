import { expect, test } from '@playwright/test';
import { DOCUMENTS } from '../../src/core/documents';

const SITE = 'https://portraitpass.vercel.app';
const docPath = (id: string) => `/${id}-photo/`;

/** Raw HTML head values: what a crawler sees before any script runs. */
function headOf(html: string) {
  const title = /<title>(.*?)<\/title>/s.exec(html)?.[1] ?? '';
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? '';
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
  return { title, description, canonical, ldBlocks };
}

test.describe('static pages', () => {
  test('every sitemap URL returns a prerendered page with a unique title', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
      expect(m[1].startsWith(SITE)).toBe(true);
      return m[1].slice(SITE.length);
    });
    expect(paths.length).toBeGreaterThanOrEqual(DOCUMENTS.length + 10);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of ['/', '/studio/', '/about/', '/support/', '/privacy/', '/terms/', '/accessibility/', '/documents/',
      '/us-passport-photo/', '/uk-passport-photo/', '/35x45-photo/', '/passport-photo-print-sheet/',
      '/2x2-photo/', '/600x600-photo/', '/photo-under-50kb/', '/print-passport-photos/']) {
      expect(paths, path).toContain(path);
    }
    for (const doc of DOCUMENTS) expect(paths, doc.id).toContain(docPath(doc.id));

    const titles = new Map<string, string>();
    const descriptions = new Map<string, string>();
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      const head = headOf(html);
      expect(head.title.length, `${path} title`).toBeGreaterThan(5);
      expect(titles.get(head.title), `duplicate title on ${path}`).toBeUndefined();
      titles.set(head.title, path);
      expect(head.description.length, `${path} description`).toBeGreaterThanOrEqual(100);
      expect(head.description.length, `${path} description`).toBeLessThanOrEqual(170);
      expect(descriptions.get(head.description), `duplicate description on ${path}`).toBeUndefined();
      descriptions.set(head.description, path);
      expect(head.canonical, path).toBe(`${SITE}${path}`);
      expect(html, path).toContain('property="og:title"');
      expect(html, path).toContain('name="twitter:card"');
      if (path !== '/studio/') expect(html, `${path} has an h1`).toContain('<h1');
    }
  });

  test('robots.txt points at the sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  for (const id of ['dv-lottery', 'in-oci', 'schengen-visa', 'ca-passport', 'de-passport']) {
    const doc = DOCUMENTS.find((d) => d.id === id)!;
    test(`${id} page shows its data`, async ({ page }) => {
      await page.goto(docPath(id));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${doc.name} photo: size and rules`);

      // spec table: only for documents that have a size to show
      const tables = page.locator('table.pg-spec');
      if (doc.print || doc.digital) {
        await expect(tables.first()).toBeVisible();
        if (doc.print) await expect(tables.first()).toContainText('Photo size');
        if (doc.digital?.maxKB !== undefined) await expect(page.locator('main')).toContainText('KB');
      } else {
        await expect(tables).toHaveCount(0);
      }

      // rules, sources with title and checked date
      for (const rule of doc.rules.slice(0, 2)) await expect(page.locator('main')).toContainText(rule);
      const sources = page.locator('.pg-sources li');
      await expect(sources).toHaveCount(doc.sources.length);
      await expect(sources.first().getByRole('link', { name: doc.sources[0].title })).toHaveAttribute('href', doc.sources[0].url);
      await expect(sources.first()).toContainText('Checked 28 Sep 2026');

      // studio link only when it can be made at home
      const studio = page.getByRole('link', { name: 'Open the studio for this document' });
      if (doc.diy === 'no') await expect(studio).toHaveCount(0);
      else await expect(studio).toHaveAttribute('href', `/studio/?doc=${id}`);

      // disclaimer sits with the numbers
      if (doc.print || doc.digital)
        await expect(page.locator('main')).toContainText('We check sizes and positions; the issuing authority decides acceptance.');

      // FAQ and JSON-LD
      const faqs = page.locator('.pg-faq-item');
      expect(await faqs.count()).toBeGreaterThanOrEqual(3);
      expect(await faqs.count()).toBeLessThanOrEqual(5);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const parsed = blocks.map((b) => JSON.parse(b));
      const faq = parsed.find((b) => b['@type'] === 'FAQPage');
      expect(faq).toBeTruthy();
      expect(faq.mainEntity).toHaveLength(await faqs.count());
      expect(faq.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(10);

      // real content, not a stub
      const words = (await page.locator('main').innerText()).split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThan(250);
    });
  }

  test('a not-DIY page explains where to go instead', async ({ page }) => {
    await page.goto(docPath('de-passport'));
    const main = page.locator('main');
    await expect(main).toContainText('Can you make it at home?');
    await expect(main).toContainText('No.');
    await expect(main).toContainText('Where to go instead');
    await expect(page.getByRole('link', { name: 'Open the studio for this document' })).toHaveCount(0);
  });

  test('US and UK keyword URLs are the document pages', async ({ page }) => {
    await page.goto('/us-passport-photo/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('US passport photo: size and rules');
    await expect(page.locator('main')).toContainText('50.8 × 50.8 mm (2 × 2 in)');
    await page.goto('/uk-passport-photo/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('UK passport (printed) photo: size and rules');
    await expect(page.locator('main')).toContainText('35 × 45 mm');
  });

  test('the document index lists every document, grouped by country', async ({ page }) => {
    await page.goto('/documents/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const doc of DOCUMENTS) {
      const link = page.locator(`main a[href="${docPath(doc.id)}"]`).first();
      await expect(link, doc.id).toHaveText(doc.name);
    }
    const countries = new Set(DOCUMENTS.map((d) => d.country));
    await expect(page.locator('section.pg-country')).toHaveCount(countries.size);
  });

  for (const [path, needle] of [
    ['/2x2-photo/', 'US passport'],
    ['/35x45-photo/', 'UK passport (printed)'],
    ['/600x600-photo/', 'Diversity Visa (DV) lottery'],
    ['/photo-under-50kb/', 'US visa (DS-160)'],
    ['/print-passport-photos/', 'Australia'],
    ['/passport-photo-print-sheet/', '4×6'],
  ] as const) {
    test(`${path} is generated from the data`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('main')).toContainText(needle);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(blocks.map((b) => JSON.parse(b)).some((b) => b['@type'] === 'FAQPage')).toBe(true);
      const words = (await page.locator('main').innerText()).split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThan(250);
    });
  }

  test('the pages carry the independence footer and no banned claims', async ({ page }) => {
    for (const path of ['/about/', '/dv-lottery-photo/', '/documents/', '/print-passport-photos/']) {
      await page.goto(path);
      await expect(page.locator('footer')).toContainText('not affiliated with or endorsed by any government or passport office');
      const text = await page.locator('main').innerText();
      expect(text, path).not.toMatch(/\b(compliant|approved|guaranteed|verified|official)\b/i);
      expect(text, path).not.toMatch(/\bdonat/i);
    }
  });
});
