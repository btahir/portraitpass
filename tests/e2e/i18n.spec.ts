import { expect, test } from '@playwright/test';
import { DOCUMENTS } from '../../src/core/documents';
import { LOCALES, TRANSLATED_LOCALES, type Locale } from '../../src/i18n';
import { BANNED } from '../../src/i18n/localize';

const SITE = 'https://portraitpass.vercel.app';
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** What each translated language must show. Add a row when a language is added. */
// Partial while translators add rows in parallel; the loop below fails for any language without one.
const EXPECT: Partial<Record<Exclude<Locale, 'en'>, {
  usH1: string; docsH1: string; faqStart: RegExp; independence: string; switcherName: string; studioNote: string;
}>> = {
  bn: {
    usH1: 'মার্কিন পাসপোর্টের ছবি: মাপ ও নিয়ম',
    docsH1: 'পাসপোর্ট, ভিসা ও পরিচয়পত্রের ছবির নিয়ম',
    faqStart: /\?$/,
    independence: 'কোনো সরকার বা পাসপোর্ট অফিসের সঙ্গে যুক্ত নয়',
    switcherName: 'বাংলা',
    studioNote: 'স্টুডিও আপাতত শুধু ইংরেজিতে আছে।',
  },
  hi: {
    usH1: 'अमेरिकी पासपोर्ट फोटो: साइज़ और नियम',
    docsH1: 'पासपोर्ट, वीज़ा और आईडी फोटो के नियम',
    faqStart: /\?$/,
    independence: 'किसी भी सरकार या पासपोर्ट कार्यालय से संबद्ध या समर्थित नहीं',
    switcherName: 'हिन्दी',
    studioNote: 'स्टूडियो फ़िलहाल अंग्रेज़ी में है।',
  },
  es: {
    usH1: 'Foto de pasaporte de Estados Unidos: medidas y requisitos',
    docsH1: 'Requisitos de fotos para pasaporte, visa y documentos de identidad',
    faqStart: /^¿/,
    independence: 'sin afiliación ni respaldo de ningún gobierno ni oficina de pasaportes',
    switcherName: 'Español',
    studioNote: 'El editor está en inglés por ahora.',
  },
  pt: {
    usH1: 'Foto de passaporte dos Estados Unidos: medidas e requisitos',
    docsH1: 'Requisitos de fotos para passaporte, visto e documentos de identidade',
    faqStart: /^Qual/,
    independence: 'sem afiliação nem endosso de nenhum governo ou órgão de passaportes',
    switcherName: 'Português',
    studioNote: 'O estúdio está em inglês por enquanto.',
  },
  ur: {
    usH1: 'امریکی پاسپورٹ کی تصویر: سائز اور قواعد',
    docsH1: 'پاسپورٹ، ویزا اور شناختی تصویر کے تقاضے',
    faqStart: /؟$/,
    independence: 'کسی حکومت یا پاسپورٹ آفس سے کوئی وابستگی نہیں',
    switcherName: 'اردو',
    studioNote: 'اسٹوڈیو فی الحال انگریزی میں ہے۔',
  },
  ar: {
    usH1: 'صورة جواز سفر الولايات المتحدة: المقاس والشروط',
    docsH1: 'متطلبات صور جوازات السفر والتأشيرات والهويات',
    faqStart: /^(?:ما|كم|هل|كيف|من)/,
    independence: 'غير تابع لأي حكومة أو مكتب جوازات ولا يحظى بتأييده',
    switcherName: 'العربية',
    studioNote: 'المحرّر متاح بالإنجليزية حاليًا.',
  },
};

const jsonLd = async (page: import('@playwright/test').Page) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).map((b) => JSON.parse(b));
const hreflangs = async (page: import('@playwright/test').Page) => {
  const out: Record<string, string> = {};
  for (const l of await page.locator('link[rel="alternate"][hreflang]').all())
    out[(await l.getAttribute('hreflang'))!] = (await l.getAttribute('href'))!;
  return out;
};

for (const code of TRANSLATED_LOCALES as Exclude<Locale, 'en'>[]) {
  const L = LOCALES[code];
  const want = EXPECT[code]!;
  test(`${code} has an EXPECT row`, () => expect(EXPECT[code], `add an EXPECT row for ${code}`).toBeTruthy());
  const p = (path: string) => `${L.prefix}${path}`;

  test.describe(`${code} pages`, () => {
    test('a document page is localized end to end', async ({ page }) => {
      await page.goto(p('/us-passport-photo/'));
      await expect(page.locator('html')).toHaveAttribute('lang', L.hreflang);
      await expect(page.locator('html')).toHaveAttribute('dir', L.dir);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(want.usH1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}${p('/us-passport-photo/')}`);
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', L.ogLocale);

      // hreflang: every language plus x-default (the English page)
      expect(await hreflangs(page)).toEqual({
        en: `${SITE}/us-passport-photo/`,
        [L.hreflang]: `${SITE}${p('/us-passport-photo/')}`,
        'x-default': `${SITE}/us-passport-photo/`,
      });

      // FAQ JSON-LD parses, is in the page language and matches the visible FAQ
      const blocks = await jsonLd(page);
      const faq = blocks.find((b) => b['@type'] === 'FAQPage');
      expect(faq).toBeTruthy();
      expect(faq.mainEntity).toHaveLength(await page.locator('.pg-faq-item').count());
      expect(faq.mainEntity[0].name).toMatch(want.faqStart);
      const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList');
      expect(crumbs.itemListElement.at(-1).name).toBe('Pasaporte de Estados Unidos');

      // the studio is English for now: link there, and say so
      const studio = page.locator('main a.primary');
      await expect(studio).toHaveAttribute('href', '/studio/?doc=us-passport');
      await expect(page.locator('main')).toContainText(want.studioNote);

      // numbers keep their values in the local format
      await expect(page.locator('main')).toContainText('50,8 × 50,8 mm (2 × 2 in)');
      await expect(page.locator('footer')).toContainText(want.independence);
      const text = await page.locator('main').innerText();
      expect(text).not.toMatch(BANNED[code]!);
      expect(words(text)).toBeGreaterThan(400);
    });

    test('the page comes alive after its language pack loads', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(p('/documents/'));
      // the theme toggle is React-driven: it only flips once the app has mounted with the pack
      const toggle = page.locator('header button.icon-button');
      const before = await toggle.getAttribute('aria-label');
      await toggle.click();
      await expect(toggle).not.toHaveAttribute('aria-label', before!);
      await expect(page.locator('html')).toHaveAttribute('lang', L.hreflang);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(want.docsH1);
      expect(errors).toEqual([]);
      // an English page never asks for the pack
      const requested: string[] = [];
      page.on('request', (r) => requested.push(new URL(r.url()).pathname));
      await page.goto('/2x2-photo/');
      await expect(page.locator('header button.icon-button')).toBeVisible();
      expect(requested.filter((u) => new RegExp(`/assets/${code}-`).test(u))).toEqual([]);
    });

    test('the English page points back with the same alternates', async ({ page }) => {
      await page.goto('/us-passport-photo/');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      expect(await hreflangs(page)).toEqual({
        en: `${SITE}/us-passport-photo/`,
        [L.hreflang]: `${SITE}${p('/us-passport-photo/')}`,
        'x-default': `${SITE}/us-passport-photo/`,
      });
    });

    test('the documents index lists every document, grouped by country', async ({ page }) => {
      await page.goto(p('/documents/'));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(want.docsH1);
      for (const doc of DOCUMENTS)
        await expect(page.locator(`main a[href="${p(`/${doc.id}-photo/`)}"]`).first(), doc.id).toBeVisible();
      await expect(page.locator('section.pg-country')).toHaveCount(new Set(DOCUMENTS.map((d) => d.country)).size);
      // size pages and the print guide are linked in the same language
      for (const path of ['/2x2-photo/', '/35x45-photo/', '/600x600-photo/', '/photo-under-50kb/', '/print-passport-photos/'])
        await expect(page.locator(`section[aria-labelledby="by-size"] a[href="${p(path)}"]`)).toHaveCount(1);
    });

    test('the language switcher links to the twin page', async ({ page }) => {
      const footer = () => page.locator('footer .footer-lang');
      // translated -> English, and English -> translated
      await page.goto(p('/de-passport-photo/'));
      await expect(footer().getByRole('link', { name: 'English' })).toHaveAttribute('href', '/de-passport-photo/');
      await expect(footer().locator('[aria-current="true"]')).toHaveText(want.switcherName);
      await expect(page.locator('header a.lang-link')).toHaveAttribute('href', '/de-passport-photo/');
      await page.goto('/2x2-photo/');
      await expect(footer().getByRole('link', { name: want.switcherName })).toHaveAttribute('href', p('/2x2-photo/'));
      await expect(page.locator('header a.lang-link')).toHaveAttribute('href', p('/2x2-photo/'));
      // pages without a translation offer the documents index instead, never a dead link
      for (const path of ['/', '/about/', '/privacy/', '/studio/']) {
        await page.goto(path);
        await expect(footer().getByRole('link', { name: want.switcherName }), path).toHaveAttribute('href', p('/documents/'));
      }
    });

    test('size pages and the print guide are translated', async ({ page }) => {
      for (const path of ['/2x2-photo/', '/35x45-photo/', '/600x600-photo/', '/photo-under-50kb/', '/passport-photo-print-sheet/', '/print-passport-photos/']) {
        await page.goto(p(path));
        await expect(page.locator('html'), path).toHaveAttribute('lang', L.hreflang);
        const faq = (await jsonLd(page)).find((b) => b['@type'] === 'FAQPage');
        expect(faq.mainEntity.length, path).toBeGreaterThanOrEqual(3);
        expect(faq.mainEntity[0].name, path).toMatch(want.faqStart);
        const text = await page.locator('main').innerText();
        expect(words(text), path).toBeGreaterThan(250);
        expect(text, path).not.toMatch(BANNED[code]!);
        // studio links go to the English studio
        for (const href of await page.locator('main a.primary').evaluateAll((els) => els.map((e) => e.getAttribute('href'))))
          expect(href, path).toMatch(/^\/studio\/\?doc=/);
      }
    });

    test('every localized sitemap URL is a complete, self-canonical page with reciprocal hreflang', async ({ request }) => {
      const sitemap = await (await request.get('/sitemap.xml')).text();
      expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
      const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(SITE.length));
      const local = urls.filter((u) => u.startsWith(`${L.prefix}/`));
      // documents + index + 6 size pages
      expect(local.length).toBe(DOCUMENTS.length + 1 + 6);
      const titles = new Set<string>();
      for (const path of local) {
        expect(sitemap, path).toContain(`<xhtml:link rel="alternate" hreflang="${L.hreflang}" href="${SITE}${path}"/>`);
        expect(sitemap, path).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE}${path.slice(L.prefix.length)}"/>`);
        const res = await request.get(path);
        expect(res.status(), path).toBe(200);
        const html = await res.text();
        expect(html, path).toContain(`<html lang="${L.hreflang}"`);
        expect(html, path).toContain(`<link rel="canonical" href="${SITE}${path}"/>`);
        expect(html, path).toContain(`<link rel="alternate" hreflang="en" href="${SITE}${path.slice(L.prefix.length)}"/>`);
        expect(html, path).toContain(`<link rel="alternate" hreflang="x-default" href="${SITE}${path.slice(L.prefix.length)}"/>`);
        const title = /<title>(.*?)<\/title>/s.exec(html)![1];
        expect(titles.has(title), `duplicate title on ${path}`).toBe(false);
        titles.add(title);
        const description = /<meta name="description" content="([^"]*)"/.exec(html)![1];
        expect(description.length, path).toBeGreaterThanOrEqual(100);
        expect(description.length, path).toBeLessThanOrEqual(170);
        for (const block of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(block[1]);
      }
    });
  });
}
