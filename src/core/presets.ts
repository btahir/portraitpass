import {
  PortraitError,
  type DocumentNotice,
  type Preset,
  type Paper,
} from "./types.js";
const checkedAt = "2026-09-28";
export const PRESETS: Preset[] = [
  {
    id: "us-passport",
    name: "US passport · print",
    country: "United States",
    widthMm: 50.8,
    heightMm: 50.8,
    headMinMm: 25.4,
    headMaxMm: 34.925, // Exact 1 3/8 inches from the published size requirement.
    eyeMinMm: 28.575, // 1 1/8 inches from the bottom of the photo.
    eyeMaxMm: 34.925, // 1 3/8 inches from the bottom of the photo.
    backgroundEdit: "forbidden",
    notes: [
      "Someone else takes the photo, or use a tripod. Selfies are not accepted.",
      "Plain white or off-white background. The State Department rejects photos changed with software, filters or AI.",
    ],
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
    backgroundEdit: "forbidden",
    notes: [
      "HM Passport Office asks for photos printed to a professional standard and not cut down from a larger picture. A photo lab or booth is the safer route for paper forms.",
      "Applying online? Use UK passport · original instead and upload the uncropped photo.",
    ],
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
    backgroundEdit: "forbidden",
    notes: [
      "Print at a photo lab: dye-sublimation on glossy paper of at least 200 gsm. Home inkjet prints are not accepted.",
    ],
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
    backgroundEdit: "unspecified",
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
    backgroundEdit: "forbidden",
    notes: [
      "Upload the original, unedited photo. JPEG, PNG, HEIC or HEIF, 54 KB to 10 MB.",
    ],
    sourceUrl:
      "https://travel.state.gov/en/passports/renew-replace/online/upload-digital-photo.html",
    checkedAt,
    mode: "original",
    editingPolicy:
      "Export original bytes, without cropping or editing. The passport application service handles positioning.",
    minBytes: 54000,
    maxBytes: 10000000,
    mimeTypes: ["image/jpeg", "image/png", "image/heic", "image/heif"],
  },
  {
    id: "uk-online",
    name: "UK passport · original",
    country: "United Kingdom",
    widthMm: 35,
    heightMm: 45,
    backgroundEdit: "forbidden",
    notes: ["Do not crop. The online service crops the photo for you."],
    sourceUrl: "https://www.gov.uk/photos-for-passports",
    checkedAt,
    mode: "original",
    editingPolicy:
      "Do not crop. Include head, shoulders and upper body; export the original unchanged.",
    minBytes: 50000,
    maxBytes: 10000000,
    minWidth: 600,
    minHeight: 750,
    // Dimensions must be measured, so only formats every browser can decode.
    mimeTypes: ["image/jpeg", "image/png"],
  },
];
/** Documents that need an approved photographer or provider. Never offered as presets. */
export const DOCUMENT_NOTICES: DocumentNotice[] = [
  {
    id: "ca-passport",
    name: "Canadian passport",
    country: "Canada",
    reason:
      "Canada requires passport photos taken in person by a commercial photographer or photo studio. Photos made with this tool will not be accepted.",
    sourceUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html",
    checkedAt,
  },
  {
    id: "de-passport",
    name: "German passport or ID card",
    country: "Germany",
    reason:
      "Since 1 May 2025 German passport and ID photos must be digital, taken at the authority or by a certified provider. Paper and home photos are not accepted.",
    sourceUrl:
      "https://www.bmi.bund.de/SharedDocs/kurzmeldungen/DE/2025/04/neue-passbilder.html",
    checkedAt,
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
