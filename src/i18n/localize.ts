// localizeDocument(): the dataset entry with its user-facing words in another language.
// The numbers, units, ids, sources and formats are never touched.
import { DOCUMENTS, type DocumentSpec } from "../core/documents";
import type { LocaleDocs } from "./docs/types";
import { getPack, isLoaded } from "./registry";
import { DEFAULT_LOCALE, type Locale } from "./index";

const cache = new Map<string, DocumentSpec>();

export function localizeDocument(doc: DocumentSpec, locale: Locale): DocumentSpec {
  if (locale === DEFAULT_LOCALE) return doc;
  const key = `${locale}:${doc.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const set = getPack(locale).docs;
  const text = set.docs[doc.id];
  if (!text) throw new Error(`No ${locale} translation for document "${doc.id}"`);
  const out: DocumentSpec = {
    ...doc,
    name: text.name,
    country: set.countries[doc.country] ?? doc.country,
    diyNote: text.diyNote ?? doc.diyNote,
    background: { ...doc.background, colors: text.colors ?? doc.background.colors },
    rules: text.rules,
    searchTerms: text.searchTerms,
    ...(doc.print
      ? { print: { ...doc.print, ...(doc.print.paper ? { paper: text.paper ?? doc.print.paper } : {}) } }
      : {}),
  };
  cache.set(key, out);
  return out;
}

/** Country name in a locale (English name in, local name out). */
export function localizeCountry(country: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return country;
  return getPack(locale).docs.countries[country] ?? country;
}

const digits = (s: string) => (s.match(/\d+/g) ?? []).sort().join(",");

/**
 * Problems in a locale's dataset text: a missing document, a different number of rules or colours,
 * a note that appears in one language only, or a translated sentence whose numbers differ from the
 * English one. Returns an empty list when the translation is complete. The prerender script
 * throws on any problem, so a half-translated locale cannot ship.
 */
export function validateDocs(locale: Locale): string[] {
  if (!isLoaded(locale)) return [`Language pack "${locale}" is not loaded`];
  const set: LocaleDocs = getPack(locale).docs;
  const errors: string[] = [];
  const ids = new Set(DOCUMENTS.map((d) => d.id));
  for (const id of Object.keys(set.docs)) if (!ids.has(id)) errors.push(`${id}: not in the dataset`);
  for (const doc of DOCUMENTS) {
    const t = set.docs[doc.id];
    if (!t) {
      errors.push(`${doc.id}: missing`);
      continue;
    }
    if (!set.countries[doc.country]) errors.push(`${doc.id}: country "${doc.country}" has no translation`);
    if (!t.name.trim()) errors.push(`${doc.id}: empty name`);
    if (t.rules.length !== doc.rules.length)
      errors.push(`${doc.id}: ${t.rules.length} rules, dataset has ${doc.rules.length}`);
    else
      doc.rules.forEach((r, i) => {
        if (digits(r) !== digits(t.rules[i]))
          errors.push(`${doc.id}: rule ${i + 1} changes a number ("${r}" vs "${t.rules[i]}")`);
      });
    if (!!doc.diyNote !== !!t.diyNote) errors.push(`${doc.id}: diyNote present in one language only`);
    else if (doc.diyNote && t.diyNote && digits(doc.diyNote) !== digits(t.diyNote))
      errors.push(`${doc.id}: diyNote changes a number`);
    if (doc.background.colors.length !== (t.colors ?? []).length)
      errors.push(`${doc.id}: ${(t.colors ?? []).length} background colours, dataset has ${doc.background.colors.length}`);
    else
      doc.background.colors.forEach((c, i) => {
        if (digits(c) !== digits(t.colors![i])) errors.push(`${doc.id}: colour ${i + 1} changes a number`);
      });
    if (!!doc.print?.paper !== !!t.paper) errors.push(`${doc.id}: paper present in one language only`);
    else if (doc.print?.paper && t.paper && digits(doc.print.paper) !== digits(t.paper))
      errors.push(`${doc.id}: paper changes a number`);
    if (!t.searchTerms.length) errors.push(`${doc.id}: no search terms`);
  }
  return errors;
}

/** Words that must not appear in translated copy (the English rule, in each language). */
export const BANNED: Partial<Record<Locale, RegExp>> = {
  bn: /(?<![\p{L}\p{M}])(অনুমোদ|অ্যাপ্রুভ|মঞ্জুর|নিশ্চয়তা|গ্যারান্টি|গ্যারান্টেড|শতভাগ|যাচাই|ভেরিফাই|প্রমাণিত|অফিসিয়াল|দাপ্তরিক|সরকারিভাবে|কমপ্লায়েন্ট|নিয়মসম্মত|নিয়মানুগ|মানসম্মত|সঙ্গতিপূর্ণ|নিয়ম মেনে চল)/u,
  hi: /(?<![\p{L}\p{M}])(आधिकारिक|अधिकारिक|ऑफ़?िशियल|स्वीकृत|अनुमोदित|अप्रूव|गारंटी|गारण्टी|सत्यापित|सत्यापन|वेरिी?फ़?ाइड|कंप्लायंट|कम्प्लाइंट|अनुपालन|मान्य)/u,
  es: /(?<![\p{L}])(oficial|aprobad|garant|verificad|conforme|homologad)/iu,
  pt: /(?<![\p{L}])(oficia[il]|aprovad|aprovaç|garant|verificad|verificaç|conforme(?![\p{L}])|homologad)/iu,
  ur: /(?<![\p{L}\p{M}])(سرکار|منظور|منظوری|ضمانت|گارنٹی|تصدیق|مصدقہ|مستند|آفیشل|اوفیشل|کمپلائنٹ|اپروو)/u,
  // Arabic has no capitals and glues prefixes (و ف ب ل ك ال) to words, so each stem is matched as a whole word with optional prefixes, endings and tashkeel. "غير رسمي" (unofficial) is allowed; «مضمون» alone is not banned because it also means "content", only «مضمونة» and the ضمان/نضمن family.
  ar: new RegExp(`(?<!غير\\s)(?<![\\p{L}\\p{M}])(?:[وف]?(?:[بلك]?ال|لل|[بلك])?(?:${["رسمي", "أوفيشيال", "معتمد", "مضمونة", "مضمونا", "ضمان", "نضمن", "يضمن", "أضمن", "موثق", "مصدق", "تحققنا", "تم التحقق", "تم التأكد", "متحقق منه", "متحقق منها", "موافق عليه", "موافق عليها"].map((s) => s.split(" ").map((x) => [...x].join("\\p{M}*") + "\\p{M}*").join("\\s+")).join("|")})(?:(?:ة|ا|ين|ون|ات)\\p{M}*)?(?![\\p{L}\\p{M}])|(?:متوافق|مطابق|مستوف)(?:ة|ي|ية)?\\s+(?:مع\\s+(?:ال)?|لل?)(?:مواصفات|معايير|شروط|متطلبات|قواعد|لوائح|اشتراطات|قوانين))`, "u"),
};

