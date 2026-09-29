import { getPaper } from "./presets.js";
import {
  PortraitError,
  type Crop,
  type Landmarks,
  type Paper,
  type Preset,
  type SheetLayout,
  type Issue,
} from "./types.js";
export function mmToPixels(mm: number, dpi = 300): number {
  return Math.round((mm * dpi) / 25.4);
}
export function mmToPoints(mm: number): number {
  return (mm * 72) / 25.4;
}
function positive(...values: number[]) {
  if (values.some((n) => !Number.isFinite(n) || n <= 0))
    throw new PortraitError(
      "INVALID_DIMENSIONS",
      "Dimensions must be positive finite numbers.",
    );
}
export function outputSize(preset: Preset, dpi = 300) {
  positive(preset.widthMm, preset.heightMm, dpi);
  if (dpi < 72 || dpi > 600 || preset.widthMm > 100 || preset.heightMm > 150)
    throw new PortraitError(
      "INVALID_DIMENSIONS",
      "Use 72–600 DPI and dimensions up to 100 × 150 mm.",
    );
  return {
    width: mmToPixels(preset.widthMm, dpi),
    height: mmToPixels(preset.heightMm, dpi),
    dpi,
  };
}
export function defaultCrop(
  imageWidth: number,
  imageHeight: number,
  preset: Preset,
): Crop {
  positive(imageWidth, imageHeight);
  if (preset.mode === "original")
    return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  const ratio = preset.widthMm / preset.heightMm;
  const width = Math.min(imageWidth, imageHeight * ratio),
    height = width / ratio;
  return {
    x: Math.max(0, (imageWidth - width) / 2),
    y: Math.max(0, (imageHeight - height) / 2),
    width,
    height,
  };
}
export function clampCrop(
  crop: Crop,
  imageWidth: number,
  imageHeight: number,
): Crop {
  positive(imageWidth, imageHeight, crop.width, crop.height);
  if (!Number.isFinite(crop.x) || !Number.isFinite(crop.y))
    throw new PortraitError("INVALID_CROP", "Crop coordinates must be finite.");
  const scale = Math.min(1, imageWidth / crop.width, imageHeight / crop.height);
  const width = crop.width * scale,
    height = crop.height * scale;
  return {
    x: Math.max(0, Math.min(imageWidth - width, crop.x)),
    y: Math.max(0, Math.min(imageHeight - height, crop.y)),
    width,
    height,
  };
}
export function zoomCrop(
  crop: Crop,
  factor: number,
  imageWidth: number,
  imageHeight: number,
): Crop {
  positive(factor);
  const width = crop.width / factor,
    height = crop.height / factor;
  return clampCrop(
    {
      x: crop.x + (crop.width - width) / 2,
      y: crop.y + (crop.height - height) / 2,
      width,
      height,
    },
    imageWidth,
    imageHeight,
  );
}
/** True when the landmarks sit inside the photo with crown < eyes < chin (strict). */
export function landmarksValid(
  landmarks: Landmarks,
  imageWidth: number,
  imageHeight: number,
): boolean {
  const { centerX, crownY, chinY, eyesY } = landmarks;
  return (
    [centerX, crownY, chinY, eyesY].every(Number.isFinite) &&
    centerX >= 0 &&
    centerX <= imageWidth &&
    crownY >= 0 &&
    chinY <= imageHeight &&
    crownY < eyesY &&
    eyesY < chinY
  );
}
export const LANDMARK_ORDER_MESSAGE =
  "Place crown, eyes and chin in that order inside the photo, with the eyes strictly between crown and chin.";
const CENTRE_TOLERANCE_MM = 1.5;
const BAND_EPSILON_MM = 1e-6;
function headRange(preset: Preset): [number, number] {
  return [
    preset.headMinMm ?? preset.heightMm * 0.62,
    preset.headMaxMm ?? preset.heightMm * 0.78,
  ];
}
function eyeBandOf(preset: Preset): [number, number] | null {
  return preset.eyeMinMm !== undefined && preset.eyeMaxMm !== undefined
    ? [preset.eyeMinMm, preset.eyeMaxMm]
    : null;
}
export function cropFromLandmarks(
  imageWidth: number,
  imageHeight: number,
  preset: Preset,
  landmarks: Landmarks,
): Crop {
  positive(imageWidth, imageHeight);
  if (!landmarksValid(landmarks, imageWidth, imageHeight))
    throw new PortraitError("INVALID_LANDMARKS", LANDMARK_ORDER_MESSAGE);
  if (preset.mode === "original")
    return defaultCrop(imageWidth, imageHeight, preset);
  const { centerX, crownY, chinY, eyesY } = landmarks;
  const [headMin, headMax] = headRange(preset);
  const headMid = (headMin + headMax) / 2;
  const headPx = chinY - crownY;
  const eyeBand = eyeBandOf(preset);
  if (!eyeBand) {
    const height = (headPx * preset.heightMm) / headMid,
      width = (height * preset.widthMm) / preset.heightMm;
    return clampCrop(
      {
        x: centerX - width / 2,
        y: crownY - (height - headPx) * 0.4,
        width,
        height,
      },
      imageWidth,
      imageHeight,
    );
  }
  // Head size first: scan head sizes across the allowed range, nearest the midpoint first.
  // For each, put the eyes at the middle of the eye band, then clamp to the source.
  // Prefer a candidate whose eyes land in the band; among those, the head closest to the midpoint.
  const aspect = preset.widthMm / preset.heightMm;
  const maxHeight = Math.min(imageHeight, imageWidth / aspect);
  const eyeMid = (eyeBand[0] + eyeBand[1]) / 2;
  const steps = 20;
  const build = (height: number) => {
    const width = height * aspect;
    const x = Math.max(0, Math.min(imageWidth - width, centerX - width / 2));
    const wanted = eyesY + (eyeMid / preset.heightMm) * height - height;
    const y = Math.max(0, Math.min(imageHeight - height, wanted));
    const eyesMm = ((y + height - eyesY) / height) * preset.heightMm;
    const error =
      eyesMm < eyeBand[0]
        ? eyeBand[0] - eyesMm
        : eyesMm > eyeBand[1]
          ? eyesMm - eyeBand[1]
          : 0;
    return { crop: { x, y, width, height }, error };
  };
  let best: { crop: Crop; error: number; k: number } | undefined;
  for (let k = -steps; k <= steps; k++) {
    const headMm = headMid + (k * (headMax - headMin)) / 2 / steps;
    const height = (headPx * preset.heightMm) / headMm;
    if (height > maxHeight + 1e-9) continue;
    const c = { ...build(height), k: Math.abs(k) };
    const cIn = c.error <= BAND_EPSILON_MM;
    if (!best) {
      best = c;
      continue;
    }
    const bIn = best.error <= BAND_EPSILON_MM;
    const better =
      cIn !== bIn
        ? cIn
        : cIn
          ? c.k < best.k
          : c.error < best.error - BAND_EPSILON_MM ||
            (Math.abs(c.error - best.error) <= BAND_EPSILON_MM && c.k < best.k);
    if (better) best = c;
  }
  // Even the largest allowed head does not fit: use the biggest crop the source allows.
  const chosen = best ?? { ...build(maxHeight), k: 0 };
  return clampCrop(chosen.crop, imageWidth, imageHeight);
}
export function cropIssues(
  crop: Crop,
  width: number,
  height: number,
  preset: Preset,
  dpi = 300,
  landmarks?: Landmarks,
): Issue[] {
  const issues: Issue[] = [];
  if (
    ![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.x + crop.width > width + 0.001 ||
    crop.y + crop.height > height + 0.001
  )
    issues.push({
      code: "INVALID_CROP",
      message: "Crop must remain inside the source photo.",
    });
  if (preset.mode !== "original") {
    if (
      Math.abs(crop.width / crop.height - preset.widthMm / preset.heightMm) >
      0.002
    )
      issues.push({
        code: "ASPECT_MISMATCH",
        message: "Crop proportions do not match this document.",
      });
    const size = outputSize(preset, dpi);
    if (crop.width + 0.01 < size.width || crop.height + 0.01 < size.height)
      issues.push({
        code: "LOW_RESOLUTION",
        message: `Use at least ${size.width} × ${size.height} source pixels inside the crop. We do not upscale.`,
      });
  }
  const eyeBand = eyeBandOf(preset);
  if (
    landmarks &&
    eyeBand &&
    preset.mode !== "original" &&
    crop.height > 0 &&
    [crop.y, crop.height, landmarks.eyesY].every(Number.isFinite)
  ) {
    const eyes = eyesFromBottom(crop, preset, landmarks);
    if (eyes < eyeBand[0] - BAND_EPSILON_MM || eyes > eyeBand[1] + BAND_EPSILON_MM)
      issues.push({
        code: "EYE_LINE",
        message: `Eyes are ${eyes.toFixed(1)} mm above the bottom edge; this document asks for ${eyeBand[0].toFixed(1)}–${eyeBand[1].toFixed(1)} mm.`,
      });
  }
  return issues;
}
function eyesFromBottom(crop: Crop, preset: Preset, landmarks: Landmarks) {
  return ((crop.y + crop.height - landmarks.eyesY) / crop.height) * preset.heightMm;
}
export function headMeasurement(
  crop: Crop,
  preset: Preset,
  landmarks: Landmarks,
) {
  const heightMm =
    ((landmarks.chinY - landmarks.crownY) / crop.height) * preset.heightMm;
  return {
    heightMm,
    inRange:
      preset.headMinMm === undefined || preset.headMaxMm === undefined
        ? null
        : heightMm >= preset.headMinMm && heightMm <= preset.headMaxMm,
    eyesFromBottomMm: eyesFromBottom(crop, preset, landmarks),
  };
}
export interface GuideBands {
  head?: { minMm: number; maxMm: number };
  eyesFromBottom?: { minMm: number; maxMm: number };
}
/** Head and eye-line bands from the preset's own data, for drawing spec guides. */
export function guideBands(preset: Preset): GuideBands {
  const bands: GuideBands = {};
  if (preset.headMinMm !== undefined && preset.headMaxMm !== undefined)
    bands.head = { minMm: preset.headMinMm, maxMm: preset.headMaxMm };
  if (preset.eyeMinMm !== undefined && preset.eyeMaxMm !== undefined)
    bands.eyesFromBottom = { minMm: preset.eyeMinMm, maxMm: preset.eyeMaxMm };
  return bands;
}
export interface MeasurementCheck {
  id: "head" | "eyes" | "centre" | "resolution";
  status: "pass" | "fail" | "unknown";
  valueMm?: number;
  minMm?: number;
  maxMm?: number;
  /** Effective pixels per inch of the source inside the crop (resolution check only). */
  ppi?: number;
  message: string;
}
const mm = (n: number) => `${n.toFixed(1)} mm`;
function rangeCheck(
  id: "head" | "eyes",
  label: string,
  value: number | undefined,
  min: number | undefined,
  max: number | undefined,
): MeasurementCheck {
  if (value === undefined || !Number.isFinite(value))
    return {
      id,
      status: "unknown",
      message: `${label} could not be measured: no face positions are set.`,
    };
  if (min === undefined || max === undefined)
    return {
      id,
      status: "unknown",
      valueMm: value,
      message: `${label} measures ${mm(value)}. This document gives no range for it.`,
    };
  const inside =
    value >= min - BAND_EPSILON_MM && value <= max + BAND_EPSILON_MM;
  return {
    id,
    status: inside ? "pass" : "fail",
    valueMm: value,
    minMm: min,
    maxMm: max,
    message: `${label} measures ${mm(value)}; the range for this document is ${mm(min)} to ${mm(max)}.`,
  };
}
/** Pure measurements of a crop against the preset. Facts only; the issuing authority decides acceptance. */
export function measurementChecks(
  preset: Preset,
  crop: Crop,
  landmarks: Landmarks | undefined,
  source: { width: number; height: number },
  dpi = 300,
): MeasurementCheck[] {
  const checks: MeasurementCheck[] = [];
  const known =
    preset.mode !== "original" &&
    landmarks !== undefined &&
    [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) &&
    crop.width > 0 &&
    crop.height > 0;
  const l = known ? landmarks : undefined;
  const head = l
    ? ((l.chinY - l.crownY) / crop.height) * preset.heightMm
    : undefined;
  const eyes = l ? eyesFromBottom(crop, preset, l) : undefined;
  checks.push(
    rangeCheck("head", "Head height", head, preset.headMinMm, preset.headMaxMm),
    rangeCheck(
      "eyes",
      "Eye line above the bottom edge",
      eyes,
      preset.eyeMinMm,
      preset.eyeMaxMm,
    ),
  );
  if (!l)
    checks.push({
      id: "centre",
      status: "unknown",
      message: "Centring could not be measured: no face positions are set.",
    });
  else {
    const offset = Math.abs(
      ((l.centerX - (crop.x + crop.width / 2)) / crop.width) * preset.widthMm,
    );
    checks.push({
      id: "centre",
      status: offset <= CENTRE_TOLERANCE_MM ? "pass" : "fail",
      valueMm: offset,
      minMm: 0,
      maxMm: CENTRE_TOLERANCE_MM,
      message: `The face centre is ${mm(offset)} from the middle of the photo; the tolerance used here is ${mm(CENTRE_TOLERANCE_MM)}.`,
    });
  }
  if (preset.mode === "original") {
    const { minWidth, minHeight } = preset;
    const has = minWidth !== undefined && minHeight !== undefined;
    checks.push({
      id: "resolution",
      status: !has
        ? "unknown"
        : source.width >= minWidth && source.height >= minHeight
          ? "pass"
          : "fail",
      message: has
        ? `The photo is ${source.width} × ${source.height} pixels; this destination asks for at least ${minWidth} × ${minHeight}.`
        : `The photo is ${source.width} × ${source.height} pixels and is exported unchanged.`,
    });
    return checks;
  }
  const inside =
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.x + crop.width <= source.width + 0.001 &&
    crop.y + crop.height <= source.height + 0.001;
  const ppi = (crop.width * 25.4) / preset.widthMm;
  const enough =
    crop.width + 0.01 >= mmToPixels(preset.widthMm, dpi) &&
    crop.height + 0.01 >= mmToPixels(preset.heightMm, dpi);
  checks.push({
    id: "resolution",
    status: inside && enough ? "pass" : "fail",
    ppi,
    message: !inside
      ? "The crop reaches outside the source photo."
      : enough
        ? `The crop holds ${Math.round(ppi)} pixels per inch at print size; ${dpi} were chosen.`
        : `The crop holds ${Math.round(ppi)} pixels per inch at print size; ${dpi} are needed without enlarging the photo.`,
  });
  return checks;
}
export function layoutSheet(
  preset: Preset,
  paper: Paper | string,
  dpi = 300,
): SheetLayout {
  if (preset.mode === "original")
    throw new PortraitError(
      "ORIGINAL_ONLY",
      "Original digital photos cannot be laid out on a print sheet.",
    );
  const p = typeof paper === "string" ? getPaper(paper) : paper;
  const photo = outputSize(preset, dpi),
    width = mmToPixels(p.widthMm, dpi),
    height = mmToPixels(p.heightMm, dpi),
    margin = mmToPixels(3, dpi),
    gap = mmToPixels(3, dpi);
  const columns = Math.floor((width - 2 * margin + gap) / (photo.width + gap)),
    rows = Math.floor((height - 2 * margin + gap) / (photo.height + gap));
  if (columns < 1 || rows < 1)
    throw new PortraitError(
      "PAPER_TOO_SMALL",
      "This photo does not fit on the selected paper with print margins.",
    );
  const startX = Math.round(
      (width - (columns * photo.width + (columns - 1) * gap)) / 2,
    ),
    startY = Math.round(
      (height - (rows * photo.height + (rows - 1) * gap)) / 2,
    );
  const placements: Crop[] = [],
    cutMarks: SheetLayout["cutMarks"] = [];
  const offset = Math.max(1, mmToPixels(0.3, dpi)),
    length = Math.max(2, mmToPixels(0.9, dpi));
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const x = startX + col * (photo.width + gap),
        y = startY + row * (photo.height + gap);
      placements.push({ x, y, width: photo.width, height: photo.height });
      for (const cornerX of [x, x + photo.width])
        for (const cornerY of [y, y + photo.height]) {
          const sx = cornerX === x ? -1 : 1,
            sy = cornerY === y ? -1 : 1;
          cutMarks.push(
            {
              x1: cornerX + sx * offset,
              y1: cornerY,
              x2: cornerX + sx * (offset + length),
              y2: cornerY,
            },
            {
              x1: cornerX,
              y1: cornerY + sy * offset,
              x2: cornerX,
              y2: cornerY + sy * (offset + length),
            },
          );
        }
    }
  return {
    width,
    height,
    dpi,
    widthMm: p.widthMm,
    heightMm: p.heightMm,
    placements,
    cutMarks,
    columns,
    rows,
  };
}
