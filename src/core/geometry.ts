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
export function cropFromLandmarks(
  imageWidth: number,
  imageHeight: number,
  preset: Preset,
  landmarks: Landmarks,
): Crop {
  positive(imageWidth, imageHeight);
  const { centerX, crownY, chinY, eyesY } = landmarks;
  if (
    ![centerX, crownY, chinY, eyesY].every(Number.isFinite) ||
    centerX < 0 ||
    centerX > imageWidth ||
    crownY < 0 ||
    chinY > imageHeight ||
    chinY <= crownY ||
    eyesY < crownY ||
    eyesY > chinY
  )
    throw new PortraitError(
      "INVALID_LANDMARKS",
      "Place crown, eyes and chin in that order inside the photo.",
    );
  if (preset.mode === "original")
    return defaultCrop(imageWidth, imageHeight, preset);
  const headMm =
    ((preset.headMinMm ?? preset.heightMm * 0.62) +
      (preset.headMaxMm ?? preset.heightMm * 0.78)) /
    2;
  const height = ((chinY - crownY) * preset.heightMm) / headMm,
    width = (height * preset.widthMm) / preset.heightMm;
  return clampCrop(
    {
      x: centerX - width / 2,
      y: crownY - (height - (chinY - crownY)) * 0.4,
      width,
      height,
    },
    imageWidth,
    imageHeight,
  );
}
export function cropIssues(
  crop: Crop,
  width: number,
  height: number,
  preset: Preset,
  dpi = 300,
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
  return issues;
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
    eyesFromBottomMm:
      ((crop.y + crop.height - landmarks.eyesY) / crop.height) *
      preset.heightMm,
  };
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
