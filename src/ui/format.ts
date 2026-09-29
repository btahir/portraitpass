// English number, size and date wording shared by the home page, the studio and the static pages that
// are not localised. (Localised pages use the locale-aware helpers in src/ui/pages/content.ts.)

/** A number with at most `digits` decimals and no trailing zeros: 35.0 -> "35", 25.4 -> "25.4". */
export function trimNumber(n: number, digits = 1): string {
  return String(Number(n.toFixed(digits)));
}

/** A size given in KB: "240 KB", or "1.5 MB" once it reaches one unit of MB. `unit` is how many bytes make a KB. */
export function kbLabel(kb: number, unit: 1000 | 1024 = 1024): string {
  return kb >= unit ? `${trimNumber(kb / unit)} MB` : `${trimNumber(kb, 0)} KB`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-09-28" to "28 Sep 2026", without touching the time zone. */
export function formatChecked(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}
