// Bridges the photo-spec dataset (documents.ts) to the geometry engine:
// every DIY document becomes a Preset the studio can frame, plus an
// optional DigitalTarget for exact pixel/KB uploads.
import { DOCUMENTS, type DocumentSpec } from "./documents.js";
import { PRESETS } from "./presets.js";
import type { DigitalTarget, Preset } from "./types.js";

/** Digital-only documents are framed on a virtual canvas at this density. */
const DIGITAL_DPI = 300;
const pxToMm = (px: number) => (px / DIGITAL_DPI) * 25.4;
/** Pick a sensible upload size when a source gives only a range. */
const PREFERRED_DIGITAL_SIDE = 600;

/** Legacy preset ids kept for saved projects and the CLI. */
const LEGACY_TO_DOCUMENT: Record<string, string> = {
  "us-online": "us-passport-online",
  "uk-online": "uk-passport-online",
};

export function getDocumentById(id: string): DocumentSpec | undefined {
  return DOCUMENTS.find((d) => d.id === (LEGACY_TO_DOCUMENT[id] ?? id));
}

function editingPolicy(doc: DocumentSpec): string {
  if (doc.digital?.originalOnly)
    return "Upload the original, unedited file. No cropping or editing.";
  return doc.background.edit === "forbidden"
    ? "Crop and size only. Preserve natural appearance; no retouching or background replacement."
    : "Crop and size to the published dimensions. Check the receiving organisation’s rules on editing.";
}

function digitalSize(doc: DocumentSpec): { width: number; height: number } | undefined {
  const d = doc.digital;
  if (!d) return undefined;
  const aspect =
    d.aspect ??
    (d.widthPx && d.heightPx
      ? d.widthPx / d.heightPx
      : d.minWidthPx && d.minHeightPx
        ? d.minWidthPx / d.minHeightPx
        : doc.print
          ? doc.print.widthMm / doc.print.heightMm
          : undefined);
  let width = d.widthPx;
  if (!width) {
    const lo = d.minWidthPx ?? 0;
    const hi = d.maxWidthPx ?? Infinity;
    width = Math.min(hi, Math.max(lo, PREFERRED_DIGITAL_SIDE));
  }
  let height = d.heightPx;
  if (!height) {
    if (aspect) height = Math.round(width / aspect);
    else {
      const lo = d.minHeightPx ?? 0;
      const hi = d.maxHeightPx ?? Infinity;
      height = Math.min(hi, Math.max(lo, PREFERRED_DIGITAL_SIDE));
    }
  }
  if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * The frame the studio should use for a document: its print size when it has
 * one, otherwise its digital shape. Undefined for documents that can't be
 * made at home.
 */
export function documentPreset(doc: DocumentSpec): Preset | undefined {
  if (doc.diy === "no") return undefined;
  const source = doc.sources[0];
  const base = {
    id: doc.id,
    name: doc.name,
    country: doc.country,
    backgroundEdit: doc.background.edit,
    notes: doc.diyNote ? [doc.diyNote] : undefined,
    sourceUrl: source?.url ?? "",
    checkedAt: source?.checkedAt ?? "",
    editingPolicy: editingPolicy(doc),
  };
  const d = doc.digital;
  if (d?.originalOnly) {
    const kb = d.kbBytes ?? 1024;
    return {
      ...base,
      widthMm: doc.print?.widthMm ?? 35,
      heightMm: doc.print?.heightMm ?? 45,
      mode: "original",
      minBytes: d.minKB !== undefined ? Math.round(d.minKB * kb) : undefined,
      maxBytes: d.maxKB !== undefined ? Math.round(d.maxKB * kb) : undefined,
      minWidth: d.minWidthPx,
      minHeight: d.minHeightPx,
      mimeTypes: d.formats,
    };
  }
  if (doc.print) {
    const p = doc.print;
    return {
      ...base,
      widthMm: p.widthMm,
      heightMm: p.heightMm,
      headMinMm: p.headMinMm,
      headMaxMm: p.headMaxMm,
      eyeMinMm: p.eyeMinMm,
      eyeMaxMm: p.eyeMaxMm,
      mode: "print",
    };
  }
  const size = digitalSize(doc);
  if (!d || !size) return undefined;
  const widthMm = pxToMm(size.width);
  const heightMm = pxToMm(size.height);
  const scale = (ratio: number | undefined) =>
    ratio === undefined ? undefined : ratio * heightMm;
  return {
    ...base,
    widthMm,
    heightMm,
    headMinMm: scale(d.headRatioMin),
    headMaxMm: scale(d.headRatioMax),
    eyeMinMm: scale(d.eyeRatioMin),
    eyeMaxMm: scale(d.eyeRatioMax),
    mode: "print",
  };
}

/** Exact upload target for documents with a digital spec (not original-only). */
export function documentDigitalTarget(
  doc: DocumentSpec,
): DigitalTarget | undefined {
  const d = doc.digital;
  if (!d || d.originalOnly) return undefined;
  if (!d.formats.includes("image/jpeg")) return undefined;
  const size = digitalSize(doc);
  if (!size) return undefined;
  return {
    widthPx: size.width,
    heightPx: size.height,
    minKB: d.minKB,
    maxKB: d.maxKB,
    kbBytes: d.kbBytes,
    format: "jpeg",
  };
}

/** Case-insensitive search over name, country, code and search terms. */
export function searchDocuments(query: string, limit = 8): DocumentSpec[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const scored = DOCUMENTS.map((doc) => {
    const name = doc.name.toLowerCase();
    const hay = [
      name,
      doc.country.toLowerCase(),
      doc.countryCode.toLowerCase(),
      doc.kind,
      ...doc.searchTerms.map((t) => t.toLowerCase()),
    ].join(" | ");
    let score = 0;
    for (const t of tokens) {
      if (!hay.includes(t)) return { doc, score: -1 };
      score += name.includes(t) ? 3 : 1;
    }
    if (doc.diy === "no") score -= 0.5;
    return { doc, score };
  }).filter((s) => s.score >= 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.doc);
}

/** Chips on the home page, in order, when present in the dataset. */
export const POPULAR_DOCUMENT_IDS = [
  "us-passport",
  "uk-passport",
  "in-oci",
  "schengen-visa",
  "us-visa",
  "dv-lottery",
  "cn-visa",
  "au-passport",
];

export function popularDocuments(): DocumentSpec[] {
  return POPULAR_DOCUMENT_IDS.map((id) => getDocumentById(id)).filter(
    (d): d is DocumentSpec => !!d,
  );
}

/** Legacy PRESETS stay authoritative for their ids (saved projects, CLI). */
export function presetForId(id: string): Preset | undefined {
  const legacy = PRESETS.find((p) => p.id === id);
  if (legacy) return { ...legacy };
  const doc = getDocumentById(id);
  return doc ? documentPreset(doc) : undefined;
}
