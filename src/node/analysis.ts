import sharp from "sharp";
import { analyzePhoto } from "../core/analysis.js";
import type { AnalysisBox, AnalysisExpectation, PhotoCheck } from "../core/analysis.js";
import type { Crop } from "../core/index.js";

const MAX_SOURCE_PIXELS = 40_000_000;
const CROP_SIDE = 512;
const MAX_AREA = 1_500_000;
const DETAIL_WIDTH = 228;

export interface AnalyzeFileOptions {
  /** Face box in source pixels (after EXIF orientation). */
  face?: AnalysisBox;
  /** The part of the photo that will be delivered, in source pixels (after EXIF orientation). */
  crop?: Crop;
  expected?: AnalysisExpectation;
}

/**
 * Measure a photo file without editing it. There is no segmentation in Node, so the background is read from a
 * border band (outside the head and shoulders); pass `face` for the best result.
 */
export async function analyzeFile(filePath: string, opts: AnalyzeFileOptions = {}): Promise<PhotoCheck[]> {
  const input = { limitInputPixels: MAX_SOURCE_PIXELS, failOn: "none" as const };
  const meta = await sharp(filePath, input).metadata();
  if (!meta.width || !meta.height) return analyzePhoto({ width: 0, height: 0, rgba: new Uint8Array(0) }, opts.expected);
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width,
    height = swap ? meta.width : meta.height;
  const crop = opts.crop ?? { x: 0, y: 0, width, height };
  const scale = Math.min(1, CROP_SIDE / Math.max(1, Math.max(crop.width, crop.height)), Math.sqrt(MAX_AREA / (width * height)));
  const cw = Math.max(8, Math.round(width * scale)),
    ch = Math.max(8, Math.round(height * scale));
  const { data } = await sharp(filePath, input)
    .rotate()
    .resize(cw, ch, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sx = cw / width,
    sy = ch / height;
  const scaledBox = (b: AnalysisBox): AnalysisBox => ({ x: b.x * sx, y: b.y * sy, width: b.width * sx, height: b.height * sy });
  let faceDetail: { width: number; height: number; rgba: Uint8Array } | undefined;
  const f = opts.face;
  if (f) {
    const left = Math.max(0, Math.round(f.x)),
      top = Math.max(0, Math.round(f.y));
    const w = Math.min(width - left, Math.round(f.width - (left - f.x))),
      h = Math.min(height - top, Math.round(f.height - (top - f.y)));
    if (w > 4 && h > 4) {
      const dh = Math.min(400, Math.max(16, Math.round((DETAIL_WIDTH * h) / w)));
      const detail = await sharp(filePath, input)
        .rotate()
        .extract({ left, top, width: w, height: h })
        .resize(DETAIL_WIDTH, dh, { fit: "fill", kernel: "lanczos3" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      faceDetail = { width: DETAIL_WIDTH, height: dh, rgba: detail.data };
    }
  }
  return analyzePhoto(
    {
      width: cw,
      height: ch,
      rgba: data,
      face: f ? scaledBox(f) : undefined,
      crop: opts.crop ? scaledBox(opts.crop) : undefined,
      faceDetail,
    },
    opts.expected,
  );
}
