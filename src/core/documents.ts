// Open photo-spec dataset. Every number comes from a primary source (the
// issuing authority's own page or form) with the date it was checked.
// Regional files in ./data hold the entries; this module types and merges them.
import { US_DOCUMENTS } from "./data/us.js";
import { SOUTH_ASIA_DOCUMENTS } from "./data/south-asia.js";
import { EUROPE_DOCUMENTS } from "./data/europe.js";
import { WORLD_DOCUMENTS } from "./data/world.js";

export type DocumentKind =
  | "passport"
  | "visa"
  | "id-card"
  | "residence"
  | "citizenship"
  | "lottery"
  | "exam-form"
  | "other";

/** Can people make this photo themselves? */
export type DiyStatus =
  | "yes" // home photo accepted (printed and/or uploaded)
  | "digital-only" // only an uploaded digital photo; print rules don't apply
  | "no"; // photographer, booth, certified provider or taken at the office

export interface PrintSpec {
  widthMm: number;
  heightMm: number;
  /** Crown (top of head) to chin. */
  headMinMm?: number;
  headMaxMm?: number;
  /** Eye line measured up from the bottom edge. */
  eyeMinMm?: number;
  eyeMaxMm?: number;
  /** Photos required, if the rules say. */
  copies?: number;
  /** e.g. "matte or glossy photo paper", "dye-sublimation, 200 gsm+" */
  paper?: string;
}

export interface DigitalSpec {
  /** Exact size, when required. */
  widthPx?: number;
  heightPx?: number;
  minWidthPx?: number;
  minHeightPx?: number;
  maxWidthPx?: number;
  maxHeightPx?: number;
  /** width / height when a ratio rather than a size is required, e.g. 1 for square. */
  aspect?: number;
  minKB?: number;
  maxKB?: number;
  /** Whether the source means 1 KB = 1000 or 1024 bytes. Default 1024 when unsure (safer for max limits). */
  kbBytes?: 1000 | 1024;
  /** MIME types accepted, e.g. ["image/jpeg"]. */
  formats: string[];
  /** Head height as a fraction of image height (crown to chin), when given. */
  headRatioMin?: number;
  headRatioMax?: number;
  /** Eye line as a fraction of image height measured up from the bottom, when given. */
  eyeRatioMin?: number;
  eyeRatioMax?: number;
  /** Upload the untouched camera file; never crop or resize. */
  originalOnly?: boolean;
}

export interface SourceRef {
  url: string;
  title: string;
  /** YYYY-MM-DD */
  checkedAt: string;
  /** "primary" = issuing authority; "secondary" only when the primary page was unreachable. */
  kind: "primary" | "secondary";
}

export interface DocumentSpec {
  /** kebab-case, stable: "us-passport", "in-oci", "dv-lottery" */
  id: string;
  /** Short display name: "US passport", "India OCI card" */
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2, or "EU"/"XX" for multi-country or generic. */
  countryCode: string;
  kind: DocumentKind;
  diy: DiyStatus;
  /** Why not DIY, or DIY caveats (selfies not accepted, lab print). */
  diyNote?: string;
  print?: PrintSpec;
  digital?: DigitalSpec;
  background: {
    /** Plain words: "white", "off-white", "light grey", "cream" */
    colors: string[];
    edit: "forbidden" | "unspecified" | "allowed";
  };
  /** Short plain facts from the source: glasses, expression, recency, head coverings. */
  rules: string[];
  sources: SourceRef[];
  /** Phrases people search for; used for page titles and matching. */
  searchTerms: string[];
}

export const DOCUMENTS: DocumentSpec[] = [
  ...US_DOCUMENTS,
  ...SOUTH_ASIA_DOCUMENTS,
  ...EUROPE_DOCUMENTS,
  ...WORLD_DOCUMENTS,
];

export function getDocument(id: string): DocumentSpec | undefined {
  return DOCUMENTS.find((d) => d.id === id);
}
