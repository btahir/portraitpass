// Locale configuration and path helpers. Pure TypeScript (no React), safe to import
// from the prerender script, the app shell and tests alike.
//
// URL scheme: English lives at the site root (unchanged, so existing links and rankings keep
// working); every other locale lives under its own prefix and mirrors the English path:
//   /us-passport-photo/  <->  /es/us-passport-photo/
// Document ids and size-page slugs stay English on purpose: it gives every page a stable
// one-to-one mapping between languages. Titles, headings and copy are localized.
//
// To add a language, see the checklist at the bottom of this file.
import { DOCUMENTS } from "../core/documents";

export type Locale = "en" | "es" | "pt" | "hi" | "bn" | "ur" | "ar";
export type TextDir = "ltr" | "rtl";

export interface LocaleInfo {
  code: Locale;
  /** The language's own name, shown in the language switcher. */
  name: string;
  englishName: string;
  /** Sets <html dir> and the reading direction of the whole page. */
  dir: TextDir;
  /** Value for <html lang>, hreflang and og:locale (BCP 47). */
  hreflang: string;
  ogLocale: string;
  /** "" for the default language, otherwise the first path segment, e.g. "/es". */
  prefix: string;
  /** Decimal and thousands separators used when the pages print numbers. */
  decimal: string;
  thousands: string;
  /** Numbers with fewer digits than this are not grouped (Spanish writes 1000 but 10.000). */
  minGroupDigits: number;
  /**
   * Ten replacement digits (0 to 9) for scripts that do not use ASCII digits in running text,
   * e.g. "٠١٢٣٤٥٦٧٨٩" for Arabic or "०१२३४५६७८९" for Hindi. Leave unset to keep 0-9.
   */
  digits?: string;
  /**
   * Font stack for locales whose script the site fonts (DM Sans, Instrument Serif; Latin only)
   * do not cover. Applied through :lang() rules in src/ui/pages/pages.css and the prerender
   * script. System fonts only until a self-hosted font is added; see the notes in the report.
   */
  fontStack?: string;
}

export const LOCALES: Record<Locale, LocaleInfo> = {
  en: {
    code: "en",
    name: "English",
    englishName: "English",
    dir: "ltr",
    hreflang: "en",
    ogLocale: "en_US",
    prefix: "",
    decimal: ".",
    thousands: ",",
    minGroupDigits: 4,
  },
  es: {
    code: "es",
    name: "Español",
    englishName: "Spanish",
    dir: "ltr",
    hreflang: "es",
    ogLocale: "es_ES",
    prefix: "/es",
    decimal: ",",
    thousands: ".",
    minGroupDigits: 5,
  },
  pt: {
    code: "pt",
    name: "Português",
    englishName: "Portuguese",
    dir: "ltr",
    hreflang: "pt",
    ogLocale: "pt_BR",
    prefix: "/pt",
    decimal: ",",
    thousands: ".",
    minGroupDigits: 4,
  },
  hi: {
    code: "hi",
    name: "हिन्दी",
    englishName: "Hindi",
    dir: "ltr",
    hreflang: "hi",
    ogLocale: "hi_IN",
    prefix: "/hi",
    decimal: ".",
    thousands: ",",
    minGroupDigits: 4,
    fontStack: '"Noto Sans Devanagari", "Kohinoor Devanagari", "Nirmala UI", "Mukta", "Devanagari Sangam MN", sans-serif',
  },
  bn: {
    code: "bn",
    name: "বাংলা",
    englishName: "Bengali",
    dir: "ltr",
    hreflang: "bn",
    ogLocale: "bn_BD",
    prefix: "/bn",
    decimal: ".",
    thousands: ",",
    minGroupDigits: 4,
    fontStack: '"Noto Sans Bengali", "Nirmala UI", "Kohinoor Bangla", "Bangla Sangam MN", "Vrinda", sans-serif',
  },
  ur: {
    code: "ur",
    name: "اردو",
    englishName: "Urdu",
    dir: "rtl",
    hreflang: "ur",
    ogLocale: "ur_PK",
    prefix: "/ur",
    decimal: ".",
    thousands: ",",
    minGroupDigits: 4,
    fontStack:
      '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Urdu Typesetting", "Noto Naskh Arabic", "Geeza Pro", serif',
  },
  ar: {
    code: "ar",
    name: "العربية",
    englishName: "Arabic",
    dir: "rtl",
    hreflang: "ar",
    ogLocale: "ar_AR",
    prefix: "/ar",
    decimal: ".",
    thousands: ",",
    minGroupDigits: 4,
    fontStack: '"Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif',
  },
};

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
/** Locales that get translated static pages (everything except the default). */
export const TRANSLATED_LOCALES = LOCALE_CODES.filter((l) => l !== DEFAULT_LOCALE);

/** Locale of a normalized pathname ("/es/documents/" is Spanish, everything else English). */
export function localeOf(pathname: string): Locale {
  for (const l of TRANSLATED_LOCALES) {
    const p = LOCALES[l].prefix;
    if (pathname === `${p}/` || pathname.startsWith(`${p}/`)) return l;
  }
  return DEFAULT_LOCALE;
}

/** The English path a localized pathname mirrors: "/es/documents/" becomes "/documents/". */
export function toEnglishPath(pathname: string): string {
  const l = localeOf(pathname);
  if (l === DEFAULT_LOCALE) return pathname;
  return pathname.slice(LOCALES[l].prefix.length) || "/";
}

/** The path of an English page in another locale: ("/documents/", "es") gives "/es/documents/". */
export function withLocale(englishPath: string, locale: Locale): string {
  return locale === DEFAULT_LOCALE ? englishPath : `${LOCALES[locale].prefix}${englishPath}`;
}

// ------------------------------------------------------------ translatable pages
/** English static pages that have a translated twin. Document pages are added by id below. */
export const TRANSLATED_STATIC_PATHS: readonly string[] = [
  "/documents/",
  "/2x2-photo/",
  "/35x45-photo/",
  "/600x600-photo/",
  "/photo-under-50kb/",
  "/passport-photo-print-sheet/",
  "/print-passport-photos/",
];

const DOCUMENT_PATHS = new Set(DOCUMENTS.map((d) => `/${d.id}-photo/`));

/** Does this English path have a translated version? */
export function isTranslatable(englishPath: string): boolean {
  return TRANSLATED_STATIC_PATHS.includes(englishPath) || DOCUMENT_PATHS.has(englishPath);
}

export interface Alternate {
  locale: Locale;
  hreflang: string;
  /** Site-relative path. */
  path: string;
}
/**
 * hreflang alternates for a path in any locale: one per language, or none when the page has no
 * translated twin (home, studio, legal pages). The caller adds x-default (the English page).
 */
export function alternatesFor(pathname: string): Alternate[] {
  const en = toEnglishPath(pathname);
  if (!isTranslatable(en)) return [];
  return LOCALE_CODES.map((locale) => ({
    locale,
    hreflang: LOCALES[locale].hreflang,
    path: withLocale(en, locale),
  }));
}

export interface SwitchTarget {
  locale: Locale;
  name: string;
  path: string;
  current: boolean;
  /** True when the page has no twin in that language and the link goes to the documents index. */
  fallback: boolean;
}
/**
 * The language switcher. Each language links to the same page in that language; a page without a
 * translation (home, studio, legal) links to that language's documents index instead.
 */
export function switchTargets(pathname: string): SwitchTarget[] {
  const here = localeOf(pathname);
  const en = toEnglishPath(pathname);
  const twin = isTranslatable(en);
  return LOCALE_CODES.map((locale) => {
    const current = locale === here;
    if (twin) return { locale, name: LOCALES[locale].name, path: withLocale(en, locale), current, fallback: false };
    if (locale === DEFAULT_LOCALE)
      return { locale, name: LOCALES[locale].name, path: en, current, fallback: false };
    return { locale, name: LOCALES[locale].name, path: withLocale("/documents/", locale), current, fallback: true };
  });
}

/** Swap ASCII digits for the locale's own digits (a no-op for locales without `digits`). */
export function localizeDigits(text: string, locale: Locale): string {
  const digits = LOCALES[locale].digits;
  if (!digits) return text;
  return text.replace(/[0-9]/g, (d) => digits[Number(d)]);
}

/*
 * HOW TO ADD A LANGUAGE (for example Portuguese, "pt")
 *  1. Here: add "pt" to `Locale` and to LOCALES (prefix "/pt"; dir "rtl" for ar and ur; number
 *     separators; `digits` and `fontStack` where the script needs them).
 *  2. src/i18n/strings/pt.ts: `export const pt: Strings = { ... }`. Copy src/i18n/strings/es.ts and
 *     translate; `Strings` comes from en.ts, so TypeScript lists every missing key.
 *  3. src/i18n/docs/pt.ts: `export const PT: LocaleDocs = { countries, docs }`, one entry per document
 *     id, copied from docs/es.ts. `pnpm build` fails if a document is missing or a translated rule
 *     loses or changes a number.
 *  4. src/i18n/locales/pt.ts: copy locales/es.ts (it exports the two tables; keep it free of imports
 *     from the main bundle), and add
 *     `pt: () => import("./locales/pt")` to LOADERS in src/i18n/registry.ts. The pack is its own
 *     chunk: English visitors never download it.
 *  5. src/i18n/localize.ts: add a BANNED regex for the language ("official", "approved",
 *     "guaranteed", "verified", "compliant" and their equivalents).
 *  6. tests/e2e/i18n.spec.ts: add a row to EXPECT. Build (prerender adds /pt/... pages, hreflang and
 *     sitemap entries by itself) and run the spec.
 */
