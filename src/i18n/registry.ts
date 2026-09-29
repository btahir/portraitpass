// Language packs (UI strings + dataset text) load on demand. English is always bundled; every
// other language is its own chunk that English pages never fetch. A translated page loads its
// pack before the first render (App.tsx awaits loadLocale); the prerender script loads them all.
// A pack module only exports its tables (src/i18n/locales/<code>.ts); it never imports this file.
import type { Locale } from "./index";
import { DEFAULT_LOCALE, TRANSLATED_LOCALES } from "./index";
import type { LocaleDocs } from "./docs/types";
import type { Strings } from "./strings/en";

export interface LocalePack {
  strings: Strings;
  docs: LocaleDocs;
}
const packs = new Map<Locale, LocalePack>();

/** One dynamic import per translated language (add a line when adding a language). */
const LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: LocalePack }>> = {
  es: () => import("./locales/es"),
  pt: () => import("./locales/pt"),
  hi: () => import("./locales/hi"),
  bn: () => import("./locales/bn"),
  ur: () => import("./locales/ur"),
  ar: () => import("./locales/ar"),
};

export async function loadLocale(locale: Locale): Promise<void> {
  if (locale === DEFAULT_LOCALE || packs.has(locale)) return;
  packs.set(locale, (await LOADERS[locale as Exclude<Locale, "en">]()).default);
}
export const loadAllLocales = () => Promise.all(TRANSLATED_LOCALES.map(loadLocale));

export const isLoaded = (locale: Locale) => locale === DEFAULT_LOCALE || packs.has(locale);
/** Translated locales whose packs are loaded right now. */
export const loadedTranslations = () => TRANSLATED_LOCALES.filter((l) => packs.has(l));

export function getPack(locale: Locale): LocalePack {
  const pack = packs.get(locale);
  if (!pack) throw new Error(`Language pack "${locale}" is not loaded yet; await loadLocale("${locale}") first.`);
  return pack;
}
