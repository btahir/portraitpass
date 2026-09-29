import type { DocumentSpec } from "../../core/documents";
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

const HOME_LABEL = { yes: "Yes", "digital-only": "Yes, upload only", no: "No" } as const;

export type Col = "size" | "print" | "digital" | "head" | "eye" | "kb" | "bg" | "home" | "country";
const HEAD: Record<Col, string> = {
  size: "Photo",
  print: "Print size",
  digital: "Upload size",
  head: "Head",
  eye: "Eye line",
  kb: "File size",
  bg: "Background",
  home: "At home?",
  country: "Country",
};
function cell(doc: DocumentSpec, col: Col): string {
  const p = doc.print;
  const d = doc.digital;
  switch (col) {
    case "size":
      return specSummary(doc);
    case "print":
      return p ? printSizeShort(p) : "—";
    case "digital":
      return d ? (d.originalOnly ? "Original file" : (digitalDims(d) ?? "—")) : "—";
    case "head":
      return (p && compactMm(p.headMinMm, p.headMaxMm)) || (d && compactRatio(d.headRatioMin, d.headRatioMax)) || "—";
    case "eye":
      return (p && compactMm(p.eyeMinMm, p.eyeMaxMm)) || (d && compactRatio(d.eyeRatioMin, d.eyeRatioMax)) || "—";
    case "kb":
      return (d && kbRange(d)) || "—";
    case "bg":
      return doc.background.colors.length ? backgroundColors(doc) : "Not named";
    case "home":
      return HOME_LABEL[doc.diy];
    case "country":
      return doc.country;
  }
}

/** Table of documents: the first column links to the document page. */
export function DocTable({
  caption,
  docs,
  cols,
}: {
  caption: string;
  docs: DocumentSpec[];
  cols: Col[];
}) {
  return (
    <div className="pg-table-wrap">
      <table className="pg-table pg-list">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Document</th>
            {cols.map((c) => (
              <th scope="col" key={c}>
                {HEAD[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <th scope="row">
                <a href={docPath(d)}>{d.name}</a>
                {!canMakeAtHome(d) && <em className="pg-tag">Not at home</em>}
              </th>
              {cols.map((c) => (
                <td key={c}>{cell(d, c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
