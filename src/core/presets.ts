import { PortraitError, type Preset, type Paper } from "./types.js";
const checkedAt = "2026-09-28";
export const PRESETS: Preset[] = [
  {
    id: "us-passport",
    name: "US passport · print",
    country: "United States",
    widthMm: 50.8,
    heightMm: 50.8,
    headMinMm: 25.4,
    headMaxMm: 34.925, // Exact 1 3/8 inches from the official size requirement.
    sourceUrl: "https://travel.state.gov/en/passports/apply/help/photos.html",
    checkedAt,
    mode: "print",
    editingPolicy:
      "Crop and size only. Preserve natural appearance; no retouching or background replacement.",
  },
  {
    id: "uk-passport",
    name: "UK passport · print",
    country: "United Kingdom",
    widthMm: 35,
    heightMm: 45,
    headMinMm: 29,
    headMaxMm: 34,
    sourceUrl: "https://www.gov.uk/photos-for-passports/photo-requirements",
    checkedAt,
    mode: "print",
    editingPolicy:
      "Prepare the printed size only. Do not alter appearance or replace the background. Online applications need the unedited original.",
  },
  {
    id: "au-passport",
    name: "Australia passport · print",
    country: "Australia",
    widthMm: 35,
    heightMm: 45,
    headMinMm: 32,
    headMaxMm: 36,
    sourceUrl: "https://www.passports.gov.au/help/passport-photos",
    checkedAt,
    mode: "print",
    editingPolicy:
      "No retouching. Use dye-sublimation prints on glossy paper at least 200 gsm; inkjet printing is not accepted.",
  },
  {
    id: "general-id",
    name: "General ID · custom",
    country: "Custom",
    widthMm: 35,
    heightMm: 45,
    sourceUrl: "",
    checkedAt,
    mode: "general",
    editingPolicy:
      "For general ID uses only. Check the receiving organisation’s dimensions and editing policy.",
  },
  {
    id: "us-online",
    name: "US renewal · original",
    country: "United States",
    widthMm: 50.8,
    heightMm: 50.8,
    sourceUrl:
      "https://travel.state.gov/en/passports/renew-replace/online/upload-digital-photo.html",
    checkedAt,
    mode: "original",
    editingPolicy:
      "Export original bytes, without cropping or editing. The official application handles positioning.",
    minBytes: 54000,
    maxBytes: 10000000,
    mimeTypes: ["image/jpeg", "image/png"],
  },
  {
    id: "uk-online",
    name: "UK passport · original",
    country: "United Kingdom",
    widthMm: 35,
    heightMm: 45,
    sourceUrl: "https://www.gov.uk/photos-for-passports",
    checkedAt,
    mode: "original",
    editingPolicy:
      "Do not crop. Include head, shoulders and upper body; export the original unchanged.",
    minBytes: 50000,
    maxBytes: 10000000,
    minWidth: 600,
    minHeight: 750,
  },
];
export const PAPERS: Paper[] = [
  { id: "4x6", name: "4 × 6 in", widthMm: 101.6, heightMm: 152.4 },
  { id: "a4", name: "A4", widthMm: 210, heightMm: 297 },
  { id: "letter", name: "US Letter", widthMm: 215.9, heightMm: 279.4 },
];
export function getPreset(id: string): Preset {
  const item = PRESETS.find((p) => p.id === id);
  if (!item)
    throw new PortraitError("INVALID_PRESET", "Unknown document preset.");
  return { ...item };
}
export function getPaper(id: string): Paper {
  const item = PAPERS.find((p) => p.id === id);
  if (!item) throw new PortraitError("INVALID_PAPER", "Unknown paper format.");
  return { ...item };
}
