import type { DocumentSpec } from "../../core/documents";
import type { Locale } from "../../i18n";
import { localizeDocument } from "../../i18n/localize";
import { strings } from "../../i18n/strings";
import {
  backgroundColors,
  canMakeAtHome,
  digitalDims,
  docPath,
  compactMm,
  compactRatio,
  kbRange,
  printSizeShort,
  specSummary,
} from "./content";

export type Col = "size" | "print" | "digital" | "head" | "eye" | "kb" | "bg" | "home" | "country";
function cell(doc: DocumentSpec, col: Col, L: Locale): string {
  const t = strings(L).table;
  const p = doc.print;
  const d = doc.digital;
  switch (col) {
    case "size":
      return specSummary(doc, L);
    case "print":
      return p ? printSizeShort(p, L) : "—";
    case "digital":
      return d ? (d.originalOnly ? t.originalFile : (digitalDims(d, L) ?? "—")) : "—";
    case "head":
      return (p && compactMm(p.headMinMm, p.headMaxMm, L)) || (d && compactRatio(d.headRatioMin, d.headRatioMax, L)) || "—";
    case "eye":
      return (p && compactMm(p.eyeMinMm, p.eyeMaxMm, L)) || (d && compactRatio(d.eyeRatioMin, d.eyeRatioMax, L)) || "—";
    case "kb":
      return (d && kbRange(d, L)) || "—";
    case "bg":
      return doc.background.colors.length ? backgroundColors(doc, L) : t.bgNone;
    case "home":
      return { yes: t.homeYes, "digital-only": t.homeDigital, no: t.homeNo }[doc.diy];
    case "country":
      return localizeDocument(doc, L).country;
  }
}

/** Table of documents: the first column links to the document page. */
export function DocTable({
  caption,
  docs,
  cols,
  locale = "en",
}: {
  caption: string;
  docs: DocumentSpec[];
  cols: Col[];
  locale?: Locale;
}) {
  const t = strings(locale).table;
  return (
    <div className="pg-table-wrap">
      <table className="pg-table pg-list">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.document}</th>
            {cols.map((c) => (
              <th scope="col" key={c}>
                {t.head[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <th scope="row">
                <a href={docPath(d, locale)}>{localizeDocument(d, locale).name}</a>
                {/* A column already says "not at home" when the table has one; the tag is for tables without it. */}
                {!canMakeAtHome(d) && !cols.includes("home") && (
                  <em className="pg-tag">{strings(locale).fmt.notAtHome}</em>
                )}
              </th>
              {cols.map((c) => (
                <td key={c}>{cell(d, c, locale)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
