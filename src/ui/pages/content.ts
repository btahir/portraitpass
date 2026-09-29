// Pure text helpers for the static pages. Every sentence about a document's numbers is built here
// from the dataset, so pages stay in step with the data. Words come from the language tables in
// src/i18n; every helper takes the locale, and the English output is the default.
import { DOCUMENTS, type DocumentSpec, type DigitalSpec, type PrintSpec } from "../../core/documents";
import { documentPreset } from "../../core/catalog";
import { layoutSheet } from "../../core/geometry";
import { PAPERS } from "../../core/presets";
import { SITE_URL } from "../../config";
import { LOCALES, localizeDigits, withLocale, type Locale } from "../../i18n";
import { localizeDocument } from "../../i18n/localize";
import { strings } from "../../i18n/strings";

const T = (L: Locale) => strings(L);

export const checkNote = (L: Locale = "en") => T(L).fmt.checkNote;
export const rulesNote = (L: Locale = "en") => T(L).fmt.rulesNote;

// ---------------------------------------------------------------- numbers
/**
 * Keeps a measurement such as "35 × 45 mm" or "1 3/8" in one left-to-right run. In a right-to-left
 * paragraph the bidi rules flip the numbers around the "×" (it would read "45 × 35"); a Unicode
 * isolate stops that. A no-op for left-to-right languages, so English output is unchanged.
 */
export const ltr = (text: string, L: Locale = "en") =>
  LOCALES[L].dir === "rtl" ? `\u2066${text}\u2069` : text;

/** Digits in the locale's own script (a no-op except for locales that set `digits`). */
export const nd = (n: number | string, L: Locale = "en") => localizeDigits(String(n), L);
function trim(n: number, dp: number, L: Locale): string {
  const s = String(Number(n.toFixed(dp)));
  const { decimal } = LOCALES[L];
  return nd(decimal === "." ? s : s.replace(".", decimal), L);
}
export const fmtMm = (n: number, L: Locale = "en") => trim(n, 1, L);
export function fmtIn(mm: number, L: Locale = "en"): string {
  const x = mm / 25.4;
  const eighths = x * 8;
  if (Math.abs(eighths - Math.round(eighths)) < 0.01) {
    const whole = Math.floor(Math.round(eighths) / 8);
    const rest = Math.round(eighths) % 8;
    if (rest === 0) return nd(whole, L);
    let num = rest;
    let den = 8;
    while (num % 2 === 0) {
      num /= 2;
      den /= 2;
    }
    return ltr(nd(whole ? `${whole} ${num}/${den}` : `${num}/${den}`, L), L);
  }
  return trim(x, 2, L);
}
export const mmToPx = (mm: number, dpi = 300) => Math.round((mm * dpi) / 25.4);
/** Integer with the locale's thousands separator (Spanish leaves four-digit numbers ungrouped). */
export function withCommas(n: number, L: Locale = "en"): string {
  const { thousands, minGroupDigits } = LOCALES[L];
  const [int, frac] = String(n).split(".");
  const grouped =
    int.replace("-", "").length >= minGroupDigits ? int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) : int;
  return nd(frac ? `${grouped}${LOCALES[L].decimal}${frac}` : grouped, L);
}

export function printSize(p: PrintSpec, L: Locale = "en"): string {
  return `${printSizeShort(p, L)} ${ltr(`(${fmtIn(p.widthMm, L)} × ${fmtIn(p.heightMm, L)} in)`, L)}`;
}
export function printSizeShort(p: PrintSpec, L: Locale = "en"): string {
  return ltr(`${fmtMm(p.widthMm, L)} × ${fmtMm(p.heightMm, L)} mm`, L);
}
function rangeMm(min: number | undefined, max: number | undefined, L: Locale): string | undefined {
  const f = T(L).fmt;
  if (min !== undefined && max !== undefined)
    return `${f.between(fmtMm(min, L), fmtMm(max, L))} mm (${f.between(fmtIn(min, L), fmtIn(max, L))} in)`;
  if (min !== undefined) return f.atLeast(`${fmtMm(min, L)} mm (${fmtIn(min, L)} in)`);
  if (max !== undefined) return f.atMost(`${fmtMm(max, L)} mm (${fmtIn(max, L)} in)`);
  return undefined;
}
/** Short form for table cells: "25.4 to 34.9 mm". */
export function compactMm(min: number | undefined, max: number | undefined, L: Locale = "en"): string | undefined {
  const f = T(L).fmt;
  if (min !== undefined && max !== undefined)
    return `${f.compactBetween(fmtMm(min, L), fmtMm(max, L))} mm`;
  if (min !== undefined) return `${f.compactAtLeast(fmtMm(min, L))} mm`;
  if (max !== undefined) return `${f.compactAtMost(fmtMm(max, L))} mm`;
  return undefined;
}
const pct = (x: number, L: Locale) => nd(T(L).fmt.percent(Math.round(x * 100)), L);
export function compactRatio(min: number | undefined, max: number | undefined, L: Locale = "en"): string | undefined {
  const f = T(L).fmt;
  if (min !== undefined && max !== undefined) return f.compactBetween(pct(min, L), pct(max, L));
  if (min !== undefined) return f.compactAtLeast(pct(min, L));
  if (max !== undefined) return f.compactAtMost(pct(max, L));
  return undefined;
}
export const headRange = (p: PrintSpec, L: Locale = "en") => rangeMm(p.headMinMm, p.headMaxMm, L);
export const eyeRange = (p: PrintSpec, L: Locale = "en") => rangeMm(p.eyeMinMm, p.eyeMaxMm, L);

function ratioRange(min: number | undefined, max: number | undefined, L: Locale): string | undefined {
  const f = T(L).fmt;
  if (min !== undefined && max !== undefined)
    return `${f.between(pct(min, L), pct(max, L))}${f.ofImageHeight}`;
  if (min !== undefined) return `${f.atLeast(pct(min, L))}${f.ofImageHeight}`;
  if (max !== undefined) return `${f.atMost(pct(max, L))}${f.ofImageHeight}`;
  return undefined;
}
export const headRatio = (d: DigitalSpec, L: Locale = "en") => ratioRange(d.headRatioMin, d.headRatioMax, L);
export const eyeRatio = (d: DigitalSpec, L: Locale = "en") => ratioRange(d.eyeRatioMin, d.eyeRatioMax, L);

function aspectText(a: number, L: Locale): string {
  const f = T(L).fmt;
  if (Math.abs(a - 1) < 0.001) return f.aspectSquare;
  if (Math.abs(a - 0.75) < 0.001) return f.aspectPortrait;
  return f.aspectRatio(trim(a, 2, L));
}

export function digitalDims(d: DigitalSpec, L: Locale = "en"): string | undefined {
  const f = T(L).fmt;
  if (d.originalOnly) {
    const bits: string[] = [];
    if (d.minWidthPx && d.minHeightPx)
      bits.push(f.atLeast(ltr(`${nd(d.minWidthPx, L)} × ${nd(d.minHeightPx, L)} px`, L)));
    else if (d.minWidthPx) bits.push(f.atLeastWide(nd(d.minWidthPx, L)));
    return bits.length ? bits.join(f.sep) : undefined;
  }
  if (d.widthPx && d.heightPx) return ltr(`${nd(d.widthPx, L)} × ${nd(d.heightPx, L)} px`, L);
  const { minWidthPx: a, minHeightPx: b, maxWidthPx: c, maxHeightPx: e } = d;
  const withAspect = (dims: string) => (d.aspect ? f.withAspect(dims, aspectText(d.aspect, L)) : dims);
  if (a && b && c && e) {
    if (a === b && c === e) return f.perSideSquare(nd(a, L), nd(c, L));
    return withAspect(f.fromUpTo(nd(a, L), nd(b, L), nd(c, L), nd(e, L)));
  }
  if (a && b) return withAspect(f.atLeast(ltr(`${nd(a, L)} × ${nd(b, L)} px`, L)));
  if (c && e) return f.atMost(ltr(`${nd(c, L)} × ${nd(e, L)} px`, L));
  if (d.aspect) return aspectText(d.aspect, L);
  return undefined;
}

export function kbRange(d: DigitalSpec, L: Locale = "en"): string | undefined {
  const f = T(L).fmt;
  const { minKB: lo, maxKB: hi } = d;
  if (lo !== undefined && hi !== undefined) return `${f.between(withCommas(lo, L), withCommas(hi, L))} KB`;
  if (hi !== undefined) return `${f.upTo(withCommas(hi, L))} KB`;
  if (lo !== undefined) return `${f.atLeast(withCommas(lo, L))} KB`;
  return undefined;
}
export function kbDefinition(d: DigitalSpec, L: Locale = "en"): string {
  const f = T(L).fmt;
  if (d.kbBytes === 1000) return f.kb1000;
  if (d.kbBytes === 1024) return f.kb1024;
  return f.kbUnknown;
}
const FORMAT_NAMES: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};
export const formatNames = (d: DigitalSpec) =>
  d.formats.map((f) => FORMAT_NAMES[f] ?? f.replace("image/", "").toUpperCase());
export function listWords(items: string[], joiner: "and" | "or" = "and", L: Locale = "en"): string {
  return T(L).fmt.list(items, joiner);
}

export function fmtDate(iso: string, L: Locale = "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return nd(T(L).fmt.date(y, m, d), L);
}
export function checkedDate(doc: DocumentSpec, L: Locale = "en"): string {
  const iso = checkedIso(doc);
  return iso ? fmtDate(iso, L) : "";
}
/** The most recent source check for a document, YYYY-MM-DD ("" when it has no sources). */
export function checkedIso(doc: DocumentSpec): string {
  const dates = doc.sources.map((s) => s.checkedAt).sort();
  return dates.length ? dates[dates.length - 1] : "";
}
/** The most recent source check across a set of documents (the sitemap lastmod of a hub page). */
export function latestCheck(docs: DocumentSpec[]): string {
  return docs.map(checkedIso).filter(Boolean).sort().pop() ?? "";
}

// ------------------------------------------------------------ document data
/** "US passport" becomes "US passport photo" (English); Spanish: "foto de pasaporte de ...". */
export const photoName = (doc: DocumentSpec, L: Locale = "en") =>
  T(L).fmt.photoName(localizeDocument(doc, L).name);
/** Path of a document page in a locale. */
export const docPath = (doc: DocumentSpec, L: Locale = "en") => withLocale(`/${doc.id}-photo/`, L);
/** The studio is English-only for now, so every language links to the same URL. */
export const studioPath = (doc: DocumentSpec) => `/studio/?doc=${doc.id}`;
export const canMakeAtHome = (doc: DocumentSpec) => doc.diy !== "no";

export function specSummary(doc: DocumentSpec, L: Locale = "en"): string {
  const f = T(L).fmt;
  const bits: string[] = [];
  if (doc.print) bits.push(printSizeShort(doc.print, L));
  const d = doc.digital;
  if (d) {
    if (d.originalOnly) {
      bits.push(f.originalFile);
      const kb = kbRange(d, L);
      if (kb) bits.push(kb);
    } else {
      const dims = digitalDims(d, L);
      const kb = kbRange(d, L);
      bits.push([dims, kb].filter(Boolean).join(f.sep) || f.digitalUpload);
    }
  }
  return bits.length ? bits.join(f.semi) : f.noPhoto;
}

export const backgroundColors = (doc: DocumentSpec, L: Locale = "en") =>
  listWords(localizeDocument(doc, L).background.colors, "or", L);

export function backgroundSentence(doc: DocumentSpec, L: Locale = "en"): string {
  const s = T(L).sentence;
  return doc.background.colors.length ? s.bgNamed(backgroundColors(doc, L)) : s.bgNone;
}
export function editingSentence(doc: DocumentSpec, L: Locale = "en"): string {
  const s = T(L).sentence;
  const captured = doc.diy === "no";
  switch (doc.background.edit) {
    case "forbidden":
      return captured ? s.editForbiddenCaptured : s.editForbiddenHome;
    case "allowed":
      return s.editAllowed;
    default:
      return captured ? s.editUnspecifiedCaptured : s.editUnspecifiedHome;
  }
}
/** A background section only makes sense when the source says something, or the photo is yours to take. */
export function backgroundRelevant(doc: DocumentSpec): boolean {
  return doc.diy !== "no" || doc.background.colors.length > 0 || doc.background.edit !== "unspecified";
}

/** Documents that are variants of the same thing, e.g. us-passport and us-passport-online. */
export function siblings(doc: DocumentSpec): DocumentSpec[] {
  const base = doc.id.replace(/-online$/, "");
  return DOCUMENTS.filter(
    (d) => d.id !== doc.id && d.id.replace(/-online$/, "") === base,
  );
}
export function related(doc: DocumentSpec, limit = 8): DocumentSpec[] {
  const sib = siblings(doc);
  const rest = DOCUMENTS.filter(
    (d) =>
      d.id !== doc.id &&
      !sib.includes(d) &&
      (d.countryCode === doc.countryCode || d.country === doc.country),
  );
  return [...sib, ...rest].slice(0, limit);
}
export function sameSize(doc: DocumentSpec, limit = 6): DocumentSpec[] {
  const p = doc.print;
  if (!p) return [];
  return DOCUMENTS.filter(
    (d) =>
      d.id !== doc.id &&
      d.country !== doc.country &&
      d.print &&
      Math.abs(d.print.widthMm - p.widthMm) < 0.6 &&
      Math.abs(d.print.heightMm - p.heightMm) < 0.6,
  ).slice(0, limit);
}

// ---------------------------------------------------------------- copy
export function introSentence(doc: DocumentSpec, L: Locale = "en"): string {
  const s = T(L).sentence;
  const f = T(L).fmt;
  const parts: string[] = [];
  const p = doc.print;
  const d = doc.digital;
  // Size only: the head and eye ranges are in the table and the diagram next to it.
  if (p) parts.push(`${s.introPrint(photoName(doc, L), printSize(p, L))}${f.stop}`);
  if (d) {
    if (d.originalOnly) {
      parts.push(s.introOriginal(kbRange(d, L), listWords(formatNames(d), "or", L)));
    } else {
      const bits = [digitalDims(d, L), kbRange(d, L)].filter(Boolean).join(f.sep);
      parts.push(s.introDigital(bits || f.noFixedSize, listWords(formatNames(d), "or", L)));
    }
  }
  if (!p && !d) parts.push(s.introNone(localizeDocument(doc, L).name));
  return parts.join(" ");
}

export interface Faq {
  q: string;
  a: string;
}
export function documentFaq(doc: DocumentSpec, L: Locale = "en"): Faq[] {
  const t = T(L);
  const ld = localizeDocument(doc, L);
  const photo = photoName(doc, L);
  const faq: Faq[] = [];
  const d = doc.digital;
  const p = doc.print;
  // size
  const sizeParts: string[] = [];
  if (p) sizeParts.push(t.faq.sizePrint(printSize(p, L)));
  if (d) {
    // The dimensions only: the file size limit has its own question and the table has the rest.
    const bits = (d.originalOnly ? t.fmt.theOriginalFile : digitalDims(d, L)) || t.fmt.noFixedSize;
    sizeParts.push(t.faq.sizeDigital(bits, listWords(formatNames(d), "or", L)));
  }
  faq.push({
    q: t.faq.sizeQ(photo),
    a: sizeParts.length
      ? sizeParts.join(" ")
      : t.faq.sizeNone(ld.diyNote ?? t.faq.sizeNoneDefault),
  });
  // home
  const home =
    doc.diy === "no"
      ? t.faq.homeNo
      : doc.diy === "digital-only"
        ? ld.diyNote
          ? t.faq.homeYes
          : t.faq.homeYesDigitalNoNote
        : t.faq.homeYes;
  faq.push({
    q: t.faq.homeQ(photo),
    // The document's own note is on the page under "Can you make it at home?"; the answer stays short.
    a: `${home}${doc.diy === "no" ? t.faq.homeNoDefault : t.faq.homeYesDefault}`,
  });
  if (backgroundRelevant(doc))
    faq.push({
      q: t.faq.bgQ(photo),
      a: backgroundSentence(doc, L),
    });
  // KB or head position or top rules
  if (d && (d.minKB !== undefined || d.maxKB !== undefined)) {
    faq.push({ q: t.faq.kbQ(photo), a: t.faq.kbA(kbRange(d, L)!, kbDefinition(d, L)) });
  } else if (p && (p.headMinMm !== undefined || p.headMaxMm !== undefined)) {
    faq.push({ q: t.faq.headQ(photo), a: t.faq.headPrintA(headRange(p, L)!, eyeRange(p, L)) });
  } else if (d && headRatio(d, L)) {
    faq.push({ q: t.faq.headQ(photo), a: t.faq.headRatioA(headRatio(d, L)!) });
  } else if (doc.rules.length) {
    faq.push({ q: t.faq.rulesQ(photo), a: ld.rules.slice(0, 3).join(" ") });
  }
  // sources
  const primary = doc.sources.filter((s) => s.kind === "primary").length;
  faq.push({
    q: t.faq.sourcesQ(ld.name),
    a: t.faq.sourcesA(
      primary === doc.sources.length,
      listWords(doc.sources.map((s) => s.title), "and", L),
      checkedDate(doc, L),
    ),
  });
  return faq;
}

// ------------------------------------------------------------------- meta
function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("। "),
    cut.lastIndexOf("۔ "),
    cut.lastIndexOf(", "),
    cut.lastIndexOf("، "),
    cut.lastIndexOf(" "),
  );
  return `${cut.slice(0, at > 60 ? at : max - 1).replace(/[,.;:،؛।۔]$/, "")}…`;
}
/** Fit a set of clauses into 120 to 160 characters. */
export function fitDescription(clauses: string[], fillers: string[]): string {
  let out = "";
  for (const c of clauses) {
    const next = out ? `${out} ${c}` : c;
    if (next.length <= 160) out = next;
    else if (!out) out = trimTo(c, 160);
  }
  for (const f of fillers) {
    if (out.length >= 120) break;
    if (`${out} ${f}`.length <= 160) out = `${out} ${f}`;
  }
  return out;
}
export function documentMeta(doc: DocumentSpec, L: Locale = "en") {
  const t = T(L);
  const ld = localizeDocument(doc, L);
  const photo = photoName(doc, L);
  const short = t.fmt.photoName(ld.name.replace(/\s*\([^)]*\)/g, "").trim());
  const offer = doc.diy !== "no" ? "maker" : doc.print || doc.digital ? "size" : "none";
  const candidates = t.meta.docTitles(photo, short, t.meta.brand, offer);
  // Nothing fits: take the shortest candidate rather than one that is cut off in results.
  const title =
    candidates.find((c) => [...c].length <= 60) ??
    [...candidates].sort((a, b) => [...a].length - [...b].length)[0];
  const p = doc.print;
  const head = p ? compactMm(p.headMinMm, p.headMaxMm, L) : undefined;
  const hasSpec = !!(p || doc.digital);
  const home = doc.diy === "no" ? t.meta.docNotHome : t.meta.docHome;
  const description = fitDescription(
    [
      hasSpec ? t.meta.docSpec(photo, specSummary(doc, L), head) : t.meta.docNoSize(photo),
      home,
      t.meta.docChecked(checkedDate(doc, L)),
    ],
    t.meta.docFillers,
  );
  return { title, description };
}

// ---------------------------------------------------------- sheet counts
export interface SheetRow {
  doc: DocumentSpec;
  size: string;
  counts: Record<string, number>;
}
/** Photos per sheet for each distinct print size among home-photo documents. */
export function sheetRows(): SheetRow[] {
  const seen = new Map<string, SheetRow>();
  for (const doc of DOCUMENTS) {
    if (doc.diy === "no" || !doc.print) continue;
    const preset = documentPreset(doc);
    if (!preset || preset.mode === "original") continue;
    const key = `${fmtMm(doc.print.widthMm)}x${fmtMm(doc.print.heightMm)}`;
    if (seen.has(key)) continue;
    const counts: Record<string, number> = {};
    for (const paper of PAPERS) {
      try {
        counts[paper.id] = layoutSheet(preset, paper.id).placements.length;
      } catch {
        counts[paper.id] = 0;
      }
    }
    seen.set(key, { doc, size: printSize(doc.print), counts });
  }
  return [...seen.values()].sort((a, b) => a.doc.print!.widthMm - b.doc.print!.widthMm);
}

export const absolute = (path: string) => `${SITE_URL}${path}`;
