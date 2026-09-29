// Small formatting helpers shared by the home page, the picker and the
// not-DIY explainer. Everything is derived from the dataset; nothing here
// invents a number.
import type { DocumentSpec } from "../../core/index";

const MM_PER_INCH = 25.4;

function trim(n: number, digits = 1): string {
  return String(Number(n.toFixed(digits)));
}

/** "2 × 2 in" for inch-based sizes, otherwise "35 × 45 mm". */
export function printSizeLabel(w: number, h: number): string {
  const inW = w / MM_PER_INCH;
  const inH = h / MM_PER_INCH;
  const nearQuarter = (v: number) => Math.abs(v * 4 - Math.round(v * 4)) < 0.03;
  if (nearQuarter(inW) && nearQuarter(inH) && Math.abs(w - Math.round(w)) > 0.05) {
    return `${trim(inW, 2)} × ${trim(inH, 2)} in`;
  }
  return `${trim(w)} × ${trim(h)} mm`;
}

function kbLabel(kb: number, unit: 1000 | 1024 = 1024): string {
  return kb >= unit ? `${trim(kb / unit)} MB` : `${trim(kb, 0)} KB`;
}

/** Digital-upload size in a few words: "600 × 600 px, ≤ 240 KB". */
export function digitalLabel(doc: DocumentSpec): string | undefined {
  const d = doc.digital;
  if (!d) return undefined;
  const parts: string[] = [];
  if (d.originalOnly) parts.push("original file");
  else if (d.widthPx && d.heightPx) parts.push(`${d.widthPx} × ${d.heightPx} px`);
  else if (d.minWidthPx && d.maxWidthPx)
    parts.push(`${d.minWidthPx}–${d.maxWidthPx} px`);
  else if (d.minWidthPx) parts.push(`≥ ${d.minWidthPx} px`);
  const unit = d.kbBytes ?? 1024;
  if (d.maxKB !== undefined) {
    parts.push(
      d.minKB !== undefined
        ? `${kbLabel(d.minKB, unit)} to ${kbLabel(d.maxKB, unit)}`
        : `≤ ${kbLabel(d.maxKB, unit)}`,
    );
  }
  return parts.length ? parts.join(", ") : undefined;
}

/** The number a person looks for first: print size, else the upload size. */
export function keySize(doc: DocumentSpec): string {
  const p = doc.print;
  const digital = digitalLabel(doc);
  if (p && doc.diy !== "digital-only") {
    const size = printSizeLabel(p.widthMm, p.heightMm);
    return doc.diy === "yes" && digital && !doc.digital?.originalOnly
      ? `${size} · upload ${digital}`
      : size;
  }
  return digital ?? "Rules on the source page";
}

/** Shorter still, for chips. */
export function chipSize(doc: DocumentSpec): string {
  const p = doc.print;
  if (p && doc.diy !== "digital-only") return printSizeLabel(p.widthMm, p.heightMm);
  const d = doc.digital;
  if (d?.widthPx && d.heightPx) return `${d.widthPx} px`;
  if (d?.minWidthPx) return `≥ ${d.minWidthPx} px`;
  return "upload";
}

/** "2026-09-28" to "28 Sep 2026", without touching the time zone. */
export function formatChecked(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

export function notDiy(doc: DocumentSpec): boolean {
  return doc.diy === "no";
}

/** Where the static page for a document lives. */
export function docPagePath(doc: Pick<DocumentSpec, "id">): string {
  return `/${doc.id}-photo/`;
}

/** First sentence of a note, for lists. */
export function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return m ? m[1] : text.trim();
}
