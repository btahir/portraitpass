import type { MeasurementCheck, Preset } from "../core/index";
import type { PhotoCheck, PhotoCheckId } from "../core/analysis";

export const CHECK_LABELS: Record<MeasurementCheck["id"], string> = {
  head: "Head height",
  eyes: "Eye line above bottom edge",
  centre: "Head centring",
  resolution: "Photo resolution",
};

function mm(value: number) {
  return `${value.toFixed(1)} mm`;
}
/** The measured value, e.g. "31.5 mm" or "290 ppi". Empty when nothing was measured. */
export function checkValue(check: MeasurementCheck): string {
  if (check.id === "resolution")
    return check.ppi !== undefined ? `${Math.round(check.ppi)} ppi` : "";
  return check.valueMm !== undefined ? mm(check.valueMm) : "";
}
/** The allowed range, e.g. "29.0–34.0 mm" or "up to 1.5 mm". Empty when none applies. */
export function checkRange(check: MeasurementCheck): string {
  if (check.id === "resolution") return "";
  const { minMm, maxMm } = check;
  if (minMm === undefined || maxMm === undefined) return "";
  if (minMm === 0) return `up to ${mm(maxMm)}`;
  return `${minMm.toFixed(1)}–${maxMm.toFixed(1)} mm`;
}
/** A short word for the status, so the result never relies on colour alone. */
export function statusWord(check: MeasurementCheck): string {
  if (check.status === "unknown")
    // A value with no range to compare against (e.g. UK/AU eye line) is measured, just not judged.
    return check.valueMm !== undefined || check.ppi !== undefined
      ? "No range given"
      : "Not measured";
  const pass = check.status === "pass";
  if (check.id === "resolution") return pass ? "Enough pixels" : "Too few pixels";
  if (check.id === "centre") return pass ? "Centred" : "Off centre";
  return pass ? "Within range" : "Outside range";
}

/** Named rules link text for each document source. */
export function sourceLabel(preset: Preset): string {
  if (preset.country === "United States") return "Photo rules (travel.state.gov)";
  if (preset.country === "United Kingdom")
    return "Photo rules (gov.uk)";
  if (preset.country === "Australia")
    return "Photo rules (passports.gov.au)";
  return "Photo rules (source)";
}

/** One plain line under each measurement label. */
export const CHECK_HINTS: Record<MeasurementCheck["id"], string> = {
  head: "crown to chin",
  eyes: "measured from the bottom edge",
  centre: "face midline against the photo",
  resolution: "pixels per inch, no enlarging",
};

export const PHOTO_CHECK_LABELS: Record<PhotoCheckId, string> = {
  "background-even": "Even background",
  "background-shadow": "Shadows on the background",
  "background-colour": "Background colour",
  "lighting-even": "Even light on the face",
  exposure: "Exposure",
  sharpness: "Sharpness",
};
export const PHOTO_CHECK_ORDER: PhotoCheckId[] = [
  "background-even",
  "background-shadow",
  "background-colour",
  "lighting-even",
  "exposure",
  "sharpness",
];
export function photoStatusWord(check: PhotoCheck): string {
  return check.status === "pass"
    ? "Looks fine"
    : check.status === "warn"
      ? "Look at this"
      : "Not checked";
}

/** A row the checks panel can show for an original-only document: file type, size and pixels. */
export interface FileCheck {
  id: "type" | "size" | "pixels";
  status: "pass" | "fail" | "unknown";
  label: string;
  value?: string;
  range?: string;
  message: string;
}
const MIME_NAMES: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};
function kb(bytes: number) {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.round(bytes / 1000)} KB`;
}
export function fileChecks(
  preset: Preset,
  photo: {
    file: { type: string; size: number };
    mime: string;
    width: number;
    height: number;
  },
): FileCheck[] {
  const rows: FileCheck[] = [];
  if (preset.mimeTypes) {
    const ok = preset.mimeTypes.includes(photo.file.type);
    const names = preset.mimeTypes.map((m) => MIME_NAMES[m] ?? m);
    rows.push({
      id: "type",
      status: ok ? "pass" : "fail",
      label: "File type",
      value: MIME_NAMES[photo.file.type] ?? photo.file.type,
      range: names.join(", "),
      message: ok
        ? "This file type is accepted."
        : `This application needs ${names.join(" or ")}. Choose an accepted original file.`,
    });
  }
  if (preset.minBytes || preset.maxBytes) {
    const size = photo.file.size;
    const ok =
      (!preset.minBytes || size >= preset.minBytes) &&
      (!preset.maxBytes || size <= preset.maxBytes);
    rows.push({
      id: "size",
      status: ok ? "pass" : "fail",
      label: "File size",
      value: kb(size),
      range: `${preset.minBytes ? kb(preset.minBytes) : "0 KB"} to ${preset.maxBytes ? kb(preset.maxBytes) : "any"}`,
      message: ok
        ? "The file size is inside the accepted range."
        : "The file is outside the accepted size range. Choose another original.",
    });
  }
  if (preset.minWidth || preset.minHeight) {
    const known = photo.width > 0 && photo.height > 0;
    const ok =
      known &&
      (!preset.minWidth || photo.width >= preset.minWidth) &&
      (!preset.minHeight || photo.height >= preset.minHeight);
    rows.push({
      id: "pixels",
      status: !known ? "unknown" : ok ? "pass" : "fail",
      label: "Size in pixels",
      value: known ? `${photo.width} × ${photo.height} px` : undefined,
      range: `at least ${preset.minWidth ?? 0} × ${preset.minHeight ?? 0} px`,
      message: !known
        ? "This browser cannot read the pixel size of this file."
        : ok
          ? "The photo has enough pixels."
          : "The photo has too few pixels for this application.",
    });
  }
  return rows;
}
