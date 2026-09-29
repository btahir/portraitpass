// Placeholder language data: the English dataset text, used only until a translation lands.
// validateDocs passes on it; the translator replaces docs/<code>.ts wholesale.
import { DOCUMENTS } from "../../core/documents";
import type { LocaleDocs } from "./types";

export function englishDocs(): LocaleDocs {
  const countries: Record<string, string> = {};
  const docs: LocaleDocs["docs"] = {};
  for (const d of DOCUMENTS) {
    countries[d.country] = d.country;
    docs[d.id] = {
      name: d.name,
      diyNote: d.diyNote,
      colors: [...d.background.colors],
      rules: [...d.rules],
      searchTerms: [...d.searchTerms],
      paper: d.print?.paper,
    };
  }
  return { countries, docs };
}
