import { analyzePhoto } from "../core/analysis";
import type { AnalysisBox, AnalysisExpectation, PhotoCheck } from "../core/analysis";
import type { Crop } from "../core/index";

/** The small canvases here never exceed this many pixels (well under any browser canvas limit). */
const MAX_AREA = 1_000_000;
const CROP_SIDE = 512;
const DETAIL_WIDTH = 228; // the sharpness check looks at the inner 70% of the face box: ~160 px

export interface AnalyzeLoadedOptions {
  /**
   * Segmentation mask for the whole photo, in the format the engine keeps: the alpha channel is the person
   * probability (255 = person); RGB is ignored. Any size.
   */
  mask?: ImageData | HTMLCanvasElement;
  /** Face box in source pixels. */
  face?: AnalysisBox;
  /** The part of the photo that will be delivered, in source pixels. */
  crop?: Crop;
  expected?: AnalysisExpectation;
}

function smallCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser could not open the photo canvas.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}
function release(c: HTMLCanvasElement) {
  c.width = 0;
  c.height = 0;
}

/**
 * Measure a decoded photo without editing it. The photo is drawn once onto a canvas of at most 1 MP (the crop
 * gets up to 512 px on its long side), and the face box once more at ~228 px wide for the sharpness check.
 * Nothing leaves the device.
 */
export function analyzeLoadedPhoto(
  image: CanvasImageSource,
  width: number,
  height: number,
  opts: AnalyzeLoadedOptions = {},
): PhotoCheck[] {
  const crop = opts.crop ?? { x: 0, y: 0, width, height };
  const scale = Math.min(
    1,
    CROP_SIDE / Math.max(1, Math.max(crop.width, crop.height)),
    Math.sqrt(MAX_AREA / Math.max(1, width * height)),
  );
  const cw = Math.max(8, Math.round(width * scale)),
    ch = Math.max(8, Math.round(height * scale));
  const main = smallCanvas(cw, ch);
  let detail: ReturnType<typeof smallCanvas> | undefined;
  try {
    main.ctx.drawImage(image, 0, 0, cw, ch);
    const px = main.ctx.getImageData(0, 0, cw, ch);
    const sx = cw / width,
      sy = ch / height;
    const scaledBox = (b: AnalysisBox): AnalysisBox => ({
      x: b.x * sx,
      y: b.y * sy,
      width: b.width * sx,
      height: b.height * sy,
    });
    let mask: { width: number; height: number; alpha: Uint8Array } | undefined;
    if (opts.mask) {
      const data =
        opts.mask instanceof ImageData
          ? opts.mask
          : (() => {
              const m = opts.mask as HTMLCanvasElement;
              return m.width && m.height
                ? m.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, m.width, m.height)
                : undefined;
            })();
      if (data) {
        const alpha = new Uint8Array(data.width * data.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data.data[i * 4 + 3]!;
        mask = { width: data.width, height: data.height, alpha };
      }
    }
    let faceDetail: { width: number; height: number; rgba: Uint8ClampedArray } | undefined;
    const f = opts.face;
    if (f && f.width > 4 && f.height > 4) {
      const x = Math.max(0, f.x),
        y = Math.max(0, f.y),
        w = Math.min(width - x, f.width - (x - f.x)),
        h = Math.min(height - y, f.height - (y - f.y));
      if (w > 4 && h > 4) {
        const dw = DETAIL_WIDTH,
          dh = Math.min(400, Math.max(16, Math.round((DETAIL_WIDTH * h) / w)));
        detail = smallCanvas(dw, dh);
        detail.ctx.drawImage(image, x, y, w, h, 0, 0, dw, dh);
        const d = detail.ctx.getImageData(0, 0, dw, dh);
        // `face` handed to the core stays the clamped box, so the two patches describe the same area.
        faceDetail = { width: dw, height: dh, rgba: d.data };
      }
    }
    return analyzePhoto(
      {
        width: cw,
        height: ch,
        rgba: px.data,
        mask,
        face: f ? scaledBox(f) : undefined,
        crop: opts.crop ? scaledBox(opts.crop) : undefined,
        faceDetail,
      },
      opts.expected,
    );
  } finally {
    release(main.c);
    if (detail) release(detail.c);
  }
}
