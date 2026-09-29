/** Translated user-facing text for one dataset document. Numbers and units stay exactly as in the dataset. */
export interface DocText {
  /** Display name. Start with a common noun ("Pasaporte de ...") so "foto de <name>" reads naturally. */
  name: string;
  diyNote?: string;
  /** Background colour words, in the same order as the dataset (same length). */
  colors?: string[];
  /** Same number of items, in the same order, as the dataset. */
  rules: string[];
  searchTerms: string[];
  paper?: string;
}
export interface LocaleDocs {
  /** English country name (as in the dataset) to the local name. */
  countries: Record<string, string>;
  docs: Record<string, DocText>;
}
