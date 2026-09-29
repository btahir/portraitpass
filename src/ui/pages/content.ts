// Pure text helpers for the static pages. Every sentence about a document's
// numbers is built here from the dataset, so pages stay in step with the data.
import { DOCUMENTS, type DocumentSpec, type DigitalSpec, type PrintSpec } from "../../core/documents";
import { documentPreset } from "../../core/catalog";
import { layoutSheet } from "../../core/geometry";
import { PAPERS } from "../../core/presets";
import { SITE_URL } from "../../config";

export const CHECK_NOTE =
  "We check sizes and positions; the issuing authority decides acceptance.";
export const RULES_NOTE =
  "Rules change. Check the issuing authority’s current instructions before you apply.";

// ---------------------------------------------------------------- numbers
const trim = (n: number, dp: number) => String(Number(n.toFixed(dp)));
export const fmtMm = (n: number) => trim(n, 1);
export function fmtIn(mm: number): string {
  const x = mm / 25.4;
  const eighths = x * 8;
  if (Math.abs(eighths - Math.round(eighths)) < 0.01) {
    const whole = Math.floor(Math.round(eighths) / 8);
    const rest = Math.round(eighths) % 8;
    if (rest === 0) return String(whole);
    let num = rest;
    let den = 8;
    while (num % 2 === 0) {
      num /= 2;
      den /= 2;
    }
    return whole ? `${whole} ${num}/${den}` : `${num}/${den}`;
  }
  return trim(x, 2);
}
export const mmToPx = (mm: number, dpi = 300) => Math.round((mm * dpi) / 25.4);
const withCommas = (n: number) => n.toLocaleString("en-US");

export function printSize(p: PrintSpec): string {
  return `${fmtMm(p.widthMm)} × ${fmtMm(p.heightMm)} mm (${fmtIn(p.widthMm)} × ${fmtIn(p.heightMm)} in)`;
}
export function printSizeShort(p: PrintSpec): string {
  return `${fmtMm(p.widthMm)} × ${fmtMm(p.heightMm)} mm`;
}
function rangeMm(min?: number, max?: number): string | undefined {
  if (min !== undefined && max !== undefined)
    return `${fmtMm(min)} to ${fmtMm(max)} mm (${fmtIn(min)} to ${fmtIn(max)} in)`;
  if (min !== undefined) return `at least ${fmtMm(min)} mm (${fmtIn(min)} in)`;
  if (max !== undefined) return `at most ${fmtMm(max)} mm (${fmtIn(max)} in)`;
  return undefined;
}
/** Short form for table cells: "25.4 to 34.9 mm". */
export function compactMm(min?: number, max?: number): string | undefined {
  if (min !== undefined && max !== undefined) return `${fmtMm(min)} to ${fmtMm(max)} mm`;
  if (min !== undefined) return `≥ ${fmtMm(min)} mm`;
  if (max !== undefined) return `≤ ${fmtMm(max)} mm`;
  return undefined;
}
export function compactRatio(min?: number, max?: number): string | undefined {
  if (min !== undefined && max !== undefined) return `${pct(min)} to ${pct(max)}`;
  if (min !== undefined) return `≥ ${pct(min)}`;
  if (max !== undefined) return `≤ ${pct(max)}`;
  return undefined;
}
export const headRange = (p: PrintSpec) => rangeMm(p.headMinMm, p.headMaxMm);
export const eyeRange = (p: PrintSpec) => rangeMm(p.eyeMinMm, p.eyeMaxMm);

const pct = (x: number) => `${Math.round(x * 100)}%`;
function ratioRange(min?: number, max?: number): string | undefined {
  if (min !== undefined && max !== undefined)
    return `${pct(min)} to ${pct(max)} of the image height`;
  if (min !== undefined) return `at least ${pct(min)} of the image height`;
  if (max !== undefined) return `at most ${pct(max)} of the image height`;
  return undefined;
}
export const headRatio = (d: DigitalSpec) => ratioRange(d.headRatioMin, d.headRatioMax);
export const eyeRatio = (d: DigitalSpec) => ratioRange(d.eyeRatioMin, d.eyeRatioMax);

function aspectText(a: number): string {
  if (Math.abs(a - 1) < 0.001) return "square (1:1)";
  if (Math.abs(a - 0.75) < 0.001) return "portrait, 3:4";
  return `width to height ratio ${trim(a, 2)}`;
}

export function digitalDims(d: DigitalSpec): string | undefined {
  if (d.originalOnly) {
    const bits: string[] = [];
    if (d.minWidthPx && d.minHeightPx)
      bits.push(`at least ${d.minWidthPx} × ${d.minHeightPx} px`);
    else if (d.minWidthPx) bits.push(`at least ${d.minWidthPx} px wide`);
    return bits.length ? bits.join(", ") : undefined;
  }
  if (d.widthPx && d.heightPx) return `${d.widthPx} × ${d.heightPx} px`;
  const { minWidthPx: a, minHeightPx: b, maxWidthPx: c, maxHeightPx: e } = d;
  if (a && b && c && e) {
    if (a === b && c === e) return `${a} to ${c} px per side, square`;
    return `from ${a} × ${b} px up to ${c} × ${e} px${d.aspect ? `, ${aspectText(d.aspect)}` : ""}`;
  }
  if (a && b)
    return `at least ${a} × ${b} px${d.aspect ? `, ${aspectText(d.aspect)}` : ""}`;
  if (c && e) return `at most ${c} × ${e} px`;
  if (d.aspect) return aspectText(d.aspect);
  return undefined;
}

export function kbRange(d: DigitalSpec): string | undefined {
  const { minKB: lo, maxKB: hi } = d;
  if (lo !== undefined && hi !== undefined) return `${withCommas(lo)} to ${withCommas(hi)} KB`;
  if (hi !== undefined) return `up to ${withCommas(hi)} KB`;
  if (lo !== undefined) return `at least ${withCommas(lo)} KB`;
  return undefined;
}
export function kbDefinition(d: DigitalSpec): string {
  if (d.kbBytes === 1000) return "The source counts 1 KB as 1,000 bytes.";
  if (d.kbBytes === 1024) return "The source counts 1 KB as 1,024 bytes.";
  return "The source does not say how it counts a KB; we assume 1,024 bytes, the safer reading for a maximum.";
}
const FORMAT_NAMES: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};
export const formatNames = (d: DigitalSpec) =>
  d.formats.map((f) => FORMAT_NAMES[f] ?? f.replace("image/", "").toUpperCase());
export function listWords(items: string[], joiner = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${joiner} ${items[items.length - 1]}`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export function checkedDate(doc: DocumentSpec): string {
  const dates = doc.sources.map((s) => s.checkedAt).sort();
  return dates.length ? fmtDate(dates[dates.length - 1]) : "";
}

// ------------------------------------------------------------ document data
/** "US passport" becomes "US passport photo"; names that already end in "photo" stay as they are. */
export const photoName = (doc: DocumentSpec) =>
  /\bphoto$/i.test(doc.name) ? doc.name : `${doc.name} photo`;
export const docPath = (doc: DocumentSpec) => `/${doc.id}-photo/`;
export const studioPath = (doc: DocumentSpec) => `/studio/?doc=${doc.id}`;
export const canMakeAtHome = (doc: DocumentSpec) => doc.diy !== "no";

export function specSummary(doc: DocumentSpec): string {
  const bits: string[] = [];
  if (doc.print) bits.push(printSizeShort(doc.print));
  const d = doc.digital;
  if (d) {
    if (d.originalOnly) {
      bits.push("original file");
      const kb = kbRange(d);
      if (kb) bits.push(kb);
    } else {
      const dims = digitalDims(d);
      const kb = kbRange(d);
      bits.push([dims, kb].filter(Boolean).join(", ") || "digital upload");
    }
  }
  return bits.length ? bits.join("; ") : "no photo to prepare";
}

export const backgroundColors = (doc: DocumentSpec) =>
  listWords(doc.background.colors, "or");

export function backgroundSentence(doc: DocumentSpec): string {
  const colors = doc.background.colors;
  const named = colors.length
    ? `The source asks for a ${listWords(colors, "or")} background.`
    : "The source does not name a background color.";
  return named;
}
export function editingSentence(doc: DocumentSpec): string {
  const captured = doc.diy === "no";
  switch (doc.background.edit) {
    case "forbidden":
      return captured
        ? "The rules do not allow digital changes to the photo, so the background is the photographer’s or booth’s job to get right."
        : "The rules do not allow digital changes to the photo, so the background has to be right when the photo is taken. Retake it against a plain wall instead of editing the background. PortraitPass keeps background replacement off by default for this document.";
    case "allowed":
      return "The source allows the background to be edited. Keep it plain and even, and leave your face and hair untouched.";
    default:
      return captured
        ? "The source does not say whether the background may be edited."
        : "The source does not say whether the background may be edited. The safest route is a plain wall at capture. If you replace a background, check the receiving organization’s rules first.";
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
export function introSentence(doc: DocumentSpec): string {
  const parts: string[] = [];
  const p = doc.print;
  const d = doc.digital;
  if (p) {
    let s = `The printed ${photoName(doc)} is ${printSize(p)}`;
    const h = headRange(p);
    const e = eyeRange(p);
    if (h) s += `, with the head measuring ${h} from crown to chin`;
    if (e) s += `${h ? " and" : ", with"} the eye line ${e} up from the bottom edge`;
    parts.push(`${s}.`);
  }
  if (d) {
    if (d.originalOnly) {
      const kb = kbRange(d);
      parts.push(
        `For the online upload, keep the original, unedited camera file${kb ? ` (${kb})` : ""} as ${listWords(formatNames(d), "or")}.`,
      );
    } else {
      const bits = [digitalDims(d), kbRange(d)].filter(Boolean).join(", ");
      parts.push(
        `The digital photo is ${bits || "an upload with no fixed size"}, as ${listWords(formatNames(d), "or")}.`,
      );
    }
  }
  if (!p && !d)
    parts.push(
      `There is no photo size for you to prepare for the ${doc.name}; the photo is captured for you.`,
    );
  return parts.join(" ");
}

export interface Faq {
  q: string;
  a: string;
}
export function documentFaq(doc: DocumentSpec): Faq[] {
  const faq: Faq[] = [];
  const d = doc.digital;
  const p = doc.print;
  // size
  const sizeParts: string[] = [];
  if (p) sizeParts.push(`The printed photo is ${printSize(p)}.`);
  if (d) {
    const bits = [d.originalOnly ? "the original file" : digitalDims(d), kbRange(d)].filter(Boolean).join(", ");
    sizeParts.push(`The digital upload is ${bits}, as ${listWords(formatNames(d), "or")}.`);
  }
  faq.push({
    q: `What size is a ${photoName(doc)}?`,
    a: sizeParts.length
      ? sizeParts.join(" ")
      : `There is no size to prepare. ${doc.diyNote ?? "The photo is captured for you."}`,
  });
  // home
  const home =
    doc.diy === "no"
      ? "No. "
      : doc.diy === "digital-only"
        ? doc.diyNote ? "Yes. " : "Yes, and nothing is printed; you upload a digital photo. "
        : "Yes. ";
  faq.push({
    q: `Can I take a ${photoName(doc)} at home?`,
    a: `${home}${doc.diyNote ?? (doc.diy === "no" ? "The photo has to be made by the issuing authority or a provider it names." : "The source accepts a photo you prepare yourself.")}`,
  });
  if (backgroundRelevant(doc))
    faq.push({
      q: `What background does a ${photoName(doc)} need?`,
      a: `${backgroundSentence(doc)} ${editingSentence(doc)}`,
    });
  // KB or head position or top rules
  if (d && (d.minKB !== undefined || d.maxKB !== undefined)) {
    faq.push({
      q: `How many KB can a ${photoName(doc)} be?`,
      a: `The file size limit is ${kbRange(d)}. ${kbDefinition(d)}`,
    });
  } else if (p && (p.headMinMm !== undefined || p.headMaxMm !== undefined)) {
    faq.push({
      q: `How big should the head be in a ${photoName(doc)}?`,
      a: `Measured from the crown to the chin, the head should be ${headRange(p)}${eyeRange(p) ? `, and the eye line ${eyeRange(p)} up from the bottom edge` : ""}.`,
    });
  } else if (d && headRatio(d)) {
    faq.push({
      q: `How big should the head be in a ${photoName(doc)}?`,
      a: `The head, from the top of the hair to the chin, should be ${headRatio(d)}.`,
    });
  } else if (doc.rules.length) {
    faq.push({
      q: `What are the main rules for a ${photoName(doc)}?`,
      a: doc.rules.slice(0, 3).join(" "),
    });
  }
  // sources
  const primary = doc.sources.filter((s) => s.kind === "primary").length;
  faq.push({
    q: `Where do the ${doc.name} numbers come from?`,
    a: `From ${primary === doc.sources.length ? "the issuing authority’s own pages" : "the pages listed under Sources"}: ${listWords(doc.sources.map((s) => s.title))}. Last checked ${checkedDate(doc)}.`,
  });
  return faq;
}

// ------------------------------------------------------------------- meta
function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf(" "));
  return `${cut.slice(0, at > 60 ? at : max - 1).replace(/[,.;:]$/, "")}…`;
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
export function documentMeta(doc: DocumentSpec) {
  const short = photoName({ ...doc, name: doc.name.replace(/\s*\([^)]*\)/g, "").trim() });
  const candidates = [
    `${photoName(doc)} size and rules — PortraitPass`,
    `${photoName(doc)} size and rules`,
    `${short} size and rules — PortraitPass`,
    `${short} size and rules`,
    `${short} size`,
  ];
  const title = candidates.find((t) => t.length <= 60) ?? candidates[3];
  const p = doc.print;
  const head = p && compactMm(p.headMinMm, p.headMaxMm);
  const hasSpec = !!(p || doc.digital);
  const home =
    doc.diy === "no"
      ? "Not a home photo: see where to go."
      : "Make it free in your browser.";
  const description = fitDescription(
    [
      hasSpec
        ? `${photoName(doc)}: ${specSummary(doc)}${head ? `, head ${head}` : ""}.`
        : `${photoName(doc)}: there is no size to prepare.`,
      home,
      `Sources checked ${checkedDate(doc)}.`,
    ],
    ["Nothing is uploaded.", "No account or watermark."],
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
export const docsWhere = (pred: (d: DocumentSpec) => boolean) => DOCUMENTS.filter(pred);
