import { checkRaster } from "./header";
let pdfTools: Promise<typeof import("pdf-lib")> | undefined;
export function warmExportTools() {
  return (pdfTools ??= import("pdf-lib").catch((error) => {
    pdfTools = undefined;
    throw error;
  }));
}
import {
  BACKGROUND_NOTE,
  INDEPENDENCE_NOTE,
  MAX_SOURCE_PIXELS,
  PortraitError,
  cropFromLandmarks,
  cropIssues,
  getPreset,
  guideBands,
  outputSize,
  layoutSheet,
  sheetMm,
  parseProject,
  validateProject,
} from "../core/index";
import {
  digitalTargetBytes,
  fitToFileSize,
  MIN_JPEG_QUALITY,
  MAX_JPEG_QUALITY,
} from "../core/index";
import type {
  Crop,
  DigitalTarget,
  Preset,
  Landmarks,
  SheetLayout,
  SheetOrientation,
  SheetStyle,
} from "../core/index";

export interface LoadedPhoto {
  file: File;
  /** Object URL for previews. Empty string when `bytesOnly` (nothing the browser can show). */
  url: string;
  image: HTMLImageElement;
  /** Pixel size of the source. 0 × 0 when `bytesOnly` and the HEIC header does not state it. */
  width: number;
  height: number;
  name: string;
  isDemo: boolean;
  /** Type found in the file contents. `file.type` is corrected to match (HEIC often arrives as ""). */
  mime: string;
  /**
   * True when this browser cannot decode the file (HEIC/HEIF outside Safari). The bytes are kept so a
   * digital-original export still passes them through unchanged. Previews show a neutral placeholder;
   * every print, background, face-assist and project-save operation throws HEIC_UNSUPPORTED.
   */
  bytesOnly: boolean;
}
export interface RenderOptions {
  paperId?: string;
  sheet?: boolean;
  /** Sheet style. Omitted: edge-to-edge on 4x6, cut marks on A4/Letter. */
  sheetStyle?: SheetStyle;
  /** Sheet paper orientation. Omitted: "auto", whichever direction holds more photos. */
  sheetOrientation?: SheetOrientation;
  /** Draw spec guides: eye band, centre line and head-height guidance (single-photo preview only). */
  guides?: boolean;
  background?: string;
  dpi?: number;
  /** With `guides`, adds crown/eyes/chin lines and a crown band placed from the chin line. */
  landmarks?: Landmarks;
}
export type ExportOptions = RenderOptions & { format: "png" | "jpeg" | "pdf" };
/**
 * Safari (iOS especially) refuses canvases above about 16.7 million pixels. Every canvas this file
 * creates stays under this budget. Raster sheets that would need a bigger canvas are refused with a
 * clear error, and the PDF path never builds one (each photo is placed as its own image).
 */
export const MAX_CANVAS_AREA = 16_000_000;
/** Segmentation and face detection run on a copy at most this big; their models look at ~256 px anyway. */
const ANALYSIS_MAX_AREA = 4_000_000;
export const HEIC_PRINT_MESSAGE =
  "HEIC photos can be used as-is for US online renewal. For prints, use a JPEG: on iPhone, choose ‘Most Compatible’ in Settings › Camera › Formats, or share the photo as JPEG.";
export const HEIC_UNSUPPORTED_MESSAGE =
  "This browser can't read HEIC photos. In Safari it works, or export as JPEG from your Photos app.";
const MAX_BYTES = 20 * 1024 * 1024;
const SUPPORTED_TYPES =
  /^image\/(jpeg|png|webp|heic|heif|heic-sequence|heif-sequence)$/;
/** Segmentation masks, kept at analysis size (or project size). Upscaled only when compositing. */
const masks = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}
/** Setting the size to 0 hands the bitmap memory back at once (Safari holds it otherwise). */
function freeCanvas(c: HTMLCanvasElement) {
  c.width = 0;
  c.height = 0;
}
function context(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Your browser could not open the photo canvas.");
  return ctx;
}
function heicError() {
  return new PortraitError("HEIC_UNSUPPORTED", HEIC_UNSUPPORTED_MESSAGE);
}
/** True for a HEIC/HEIF source, whether or not this browser can decode it. */
export function isHeifPhoto(photo: Pick<LoadedPhoto, "mime">) {
  return photo.mime === "image/heic" || photo.mime === "image/heif";
}
/** One rule: HEIC/HEIF is only for original mode. Anything that edits, prints or saves throws here. */
function assertEditable(photo: LoadedPhoto) {
  if (photo.bytesOnly) throw heicError();
  if (isHeifPhoto(photo))
    throw new PortraitError("HEIC_UNSUPPORTED", HEIC_PRINT_MESSAGE);
}
/** Largest size with the same aspect whose area fits `maxArea`. Never enlarges. */
function fitSize(width: number, height: number, maxArea: number) {
  const scale = Math.min(1, Math.sqrt(maxArea / (width * height)));
  return {
    scale,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
/** The photo itself when it is small enough, else a downscaled copy to analyse. Call release() after. */
function analysisSource(photo: LoadedPhoto) {
  const fit = fitSize(photo.width, photo.height, ANALYSIS_MAX_AREA);
  if (fit.scale === 1)
    return {
      source: photo.image as HTMLImageElement | HTMLCanvasElement,
      scale: 1,
      release() {},
    };
  const c = canvas(fit.width, fit.height);
  context(c).drawImage(photo.image, 0, 0, fit.width, fit.height);
  return {
    source: c as HTMLImageElement | HTMLCanvasElement,
    scale: fit.width / photo.width,
    release: () => freeCanvas(c),
  };
}
export async function loadPhoto(
  file: File,
  isDemo = false,
): Promise<LoadedPhoto> {
  if (file.size > MAX_BYTES)
    throw new Error("Choose a photo smaller than 20 MB.");
  if (file.type && !SUPPORTED_TYPES.test(file.type) && file.type !== "application/octet-stream")
    throw new Error("Choose a JPEG, PNG, WebP or HEIC photo.");
  const info = await checkRaster(file);
  const heif = info.mime === "image/heic" || info.mime === "image/heif";
  const typed =
    file.type === info.mime
      ? file
      : new File([file], file.name, {
          type: info.mime,
          lastModified: file.lastModified,
        });
  const url = URL.createObjectURL(typed),
    image = new Image();
  image.src = url;
  const make = (bytesOnly: boolean): LoadedPhoto => ({
    file: typed,
    url: bytesOnly ? "" : url,
    image,
    // HEIC/HEIF always use the size the file states (ispe), never the browser's decoded size, which
    // Safari may rotate. The command line reads the same box, so both agree.
    width: bytesOnly || (heif && info.width > 0) ? info.width : image.naturalWidth,
    height: bytesOnly || (heif && info.height > 0) ? info.height : image.naturalHeight,
    name: file.name,
    isDemo,
    mime: info.mime,
    bytesOnly,
  });
  try {
    await image.decode();
  } catch (e) {
    URL.revokeObjectURL(url);
    // Chrome and Firefox cannot decode HEIC. Keep the bytes so a digital original still exports.
    if (heif) return make(true);
    throw e instanceof Error ? e : new Error("This photo could not be opened.");
  }
  if (image.naturalWidth * image.naturalHeight > MAX_SOURCE_PIXELS) {
    URL.revokeObjectURL(url);
    throw new Error("Choose a photo under 40 megapixels.");
  }
  return make(false);
}
export async function loadDemo() {
  const response = await fetch("/demo-portrait.png");
  if (!response.ok) throw new Error("The sample could not be loaded.");
  return loadPhoto(
    new File([await response.blob()], "portraitpass-synthetic-demo.png", {
      type: "image/png",
    }),
    true,
  );
}
/** Revoke the object URL, drop the decoded image and free the cached mask canvas. */
export function releasePhoto(p: LoadedPhoto) {
  if (p.url) URL.revokeObjectURL(p.url);
  const mask = masks.get(p.image);
  if (mask) freeCanvas(mask);
  masks.delete(p.image);
  p.image.removeAttribute("src");
}
function backgroundMask(photo: LoadedPhoto, background?: string) {
  if (!background || photo.bytesOnly) return undefined;
  if (!/^#[0-9a-f]{6}$/i.test(background))
    throw new Error("Use a six-digit background colour.");
  return masks.get(photo.image);
}
/**
 * The crop, drawn at w × h with the background replaced. Only the crop is composited, so no canvas
 * ever needs the size of the source photo. The (small) mask is upscaled here by drawImage.
 */
function compositeCrop(
  photo: LoadedPhoto,
  crop: Crop,
  mask: HTMLCanvasElement,
  background: string,
  w: number,
  h: number,
) {
  const c = canvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))),
    ctx = context(c),
    kx = mask.width / photo.width,
    ky = mask.height / photo.height;
  ctx.drawImage(photo.image, crop.x, crop.y, crop.width, crop.height, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(
    mask,
    crop.x * kx,
    crop.y * ky,
    crop.width * kx,
    crop.height * ky,
    0,
    0,
    c.width,
    c.height,
  );
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  return c;
}
const PERSIMMON = "182,74,45",
  SAGE = "63,107,69";
const mmText = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);
interface ChipBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/**
 * A label on a light chip so it reads on light and dark photos. `lu` is the size of one CSS pixel on
 * the canvas, so labels stay about 12 CSS px tall however far the preview is scaled down. A chip that
 * would land on one already drawn moves down (or up, at the bottom edge) until it is clear.
 */
function chip(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  lu: number,
  ink: string,
  placed: ChipBox[],
  height: number,
  alignRight = false,
) {
  ctx.setLineDash([]);
  ctx.font = `${12 * lu}px sans-serif`;
  const w = ctx.measureText(text).width + 8 * lu,
    h = 18 * lu,
    left = Math.max(0, alignRight ? x - w : x),
    hit = (top: number) =>
      placed.some(
        (b) =>
          left < b.right && left + w > b.left && top < b.bottom && top + h > b.top,
      );
  let top = Math.min(Math.max(0, y), Math.max(0, height - h));
  for (let step = 0; step < 12 && hit(top); step++) {
    const down = top + h + 2 * lu;
    top = down + h <= height ? down : Math.max(0, top - (h + 2 * lu));
  }
  placed.push({ left, top, right: left + w, bottom: top + h });
  ctx.fillStyle = "rgba(255,253,246,0.9)";
  ctx.fillRect(left, top, w, h);
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.fillText(text, left + 4 * lu, top + h / 2);
}
function guideLine(
  ctx: CanvasRenderingContext2D,
  rgb: string,
  u: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha = 0.9,
) {
  ctx.setLineDash([5 * u, 4 * u]);
  for (const [style, width] of [
    ["rgba(255,255,255,0.4)", 2.5 * u],
    [`rgba(${rgb},${alpha})`, u],
  ] as const) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
/**
 * Spec guides on the output-size photo: eye band (mm up from the bottom), centre line, and head
 * height. With landmarks the head band is the allowed crown zone above the current chin line; without
 * them a bracket at the right edge shows the minimum and maximum head height to scale.
 */
function drawGuides(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  u: number,
  preset: Preset,
  crop: Crop,
  landmarks?: Landmarks,
  /** Canvas pixels per CSS pixel of the displayed preview (>= 1 when it is shown smaller than drawn). */
  cssScale = 1,
) {
  const lu = u * Math.max(1, cssScale),
    placed: ChipBox[] = [],
    { width: W, height: H } = size,
    // On a small preview the full labels would cover the face; the short ones keep the numbers.
    compact = W / lu < 360,
    perMm = H / preset.heightMm,
    bands = guideBands(preset);
  ctx.save();
  guideLine(ctx, SAGE, u, W / 2, 0, W / 2, H, 0.7);
  if (bands.eyesFromBottom) {
    const { minMm, maxMm } = bands.eyesFromBottom,
      top = H - maxMm * perMm,
      bottom = H - minMm * perMm;
    ctx.fillStyle = `rgba(${SAGE},0.16)`;
    ctx.fillRect(0, top, W, bottom - top);
    guideLine(ctx, SAGE, u, 0, top, W, top);
    guideLine(ctx, SAGE, u, 0, bottom, W, bottom);
    chip(
      ctx,
      compact
        ? `Eyes ${mmText(minMm)}–${mmText(maxMm)} mm`
        : `Eyes ${mmText(minMm)}–${mmText(maxMm)} mm from bottom`,
      6 * u,
      top - 20 * lu < 0 ? bottom + 2 * u : top - 20 * lu,
      lu,
      "#2f5234",
      placed,
      H,
    );
  }
  if (bands.head && landmarks) {
    const chin = ((landmarks.chinY - crop.y) / crop.height) * H,
      upper = chin - bands.head.maxMm * perMm,
      lower = chin - bands.head.minMm * perMm;
    ctx.fillStyle = `rgba(${PERSIMMON},0.16)`;
    ctx.fillRect(0, upper, W, lower - upper);
    guideLine(ctx, PERSIMMON, u, 0, upper, W, upper);
    guideLine(ctx, PERSIMMON, u, 0, lower, W, lower);
    chip(
      ctx,
      compact
        ? `Head ${mmText(bands.head.minMm)}–${mmText(bands.head.maxMm)} mm`
        : `Crown zone · head ${mmText(bands.head.minMm)}–${mmText(bands.head.maxMm)} mm`,
      6 * u,
      lower + 2 * u,
      lu,
      "#8e3820",
      placed,
      H,
    );
  } else if (bands.head) {
    const minPx = bands.head.minMm * perMm,
      maxPx = bands.head.maxMm * perMm,
      x = W - 14 * u,
      base = Math.min(H - 4 * u, Math.max(H * 0.9, maxPx + 8 * u));
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(${PERSIMMON},0.35)`;
    ctx.fillRect(x - 3 * u, base - maxPx, 6 * u, maxPx - minPx);
    ctx.strokeStyle = `rgba(${PERSIMMON},0.9)`;
    ctx.lineWidth = u;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - maxPx);
    for (const y of [base, base - minPx, base - maxPx]) {
      ctx.moveTo(x - 6 * u, y);
      ctx.lineTo(x + 6 * u, y);
    }
    ctx.stroke();
    chip(
      ctx,
      `Head ${mmText(bands.head.minMm)}–${mmText(bands.head.maxMm)} mm`,
      x - 10 * u,
      base - maxPx - 10 * lu,
      lu,
      "#8e3820",
      placed,
      H,
      true,
    );
  }
  if (landmarks) {
    for (const [label, y] of [
      ["Crown", landmarks.crownY],
      ["Eyes", landmarks.eyesY],
      ["Chin", landmarks.chinY],
    ] as const) {
      const py = ((y - crop.y) / crop.height) * H;
      if (py < 0 || py > H) continue;
      guideLine(ctx, PERSIMMON, u, 0, py, W, py, 0.75);
      chip(ctx, label, W - 4 * u, py - 19 * lu, lu, "#8e3820", placed, H, true);
    }
  }
  ctx.restore();
}
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  original: boolean,
) {
  ctx.fillStyle = "#e9e7df";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.fillStyle = "#4b514e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fs = Math.max(14, size.width / 28);
  ctx.font = `${fs}px sans-serif`;
  const lines = original
    ? ["No preview in this browser.", "Your original file downloads unchanged."]
    : ["This browser can't read HEIC photos.", "Try Safari, or export a JPEG."];
  lines.forEach((line, i) =>
    ctx.fillText(line, size.width / 2, size.height / 2 + (i - 0.5) * fs * 1.5),
  );
  ctx.textAlign = "start";
}
export function renderPreview(
  target: HTMLCanvasElement,
  photo: LoadedPhoto,
  preset: Preset,
  crop: Crop,
  options: RenderOptions = {},
) {
  const sheet = options.sheet && preset.mode !== "original";
  const known = photo.width > 0 && photo.height > 0;
  const size =
    preset.mode === "original"
      ? known
        ? { width: photo.width, height: photo.height }
        : {
            width: 800,
            height: Math.round((800 * preset.heightMm) / preset.widthMm),
          }
      : sheet
        ? layoutSheet(
            preset,
            options.paperId ?? "4x6",
            options.dpi ?? 300,
            sheetOptions(options),
          )
        : outputSize(preset, options.dpi ?? 300);
  const ratio = Math.min(1, 1000 / Math.max(size.width, size.height));
  target.width = Math.round(size.width * ratio);
  target.height = Math.round(size.height * ratio);
  const ctx = context(target);
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size.width, size.height);
  if (photo.bytesOnly) {
    drawPlaceholder(ctx, size, preset.mode === "original");
    return;
  }
  // Digital originals are never edited: no crop, no background, no guides.
  if (preset.mode === "original") {
    ctx.drawImage(photo.image, 0, 0, size.width, size.height);
    return;
  }
  const mask = backgroundMask(photo, options.background);
  if (sheet) {
    const layout = layoutSheet(
      preset,
      options.paperId ?? "4x6",
      options.dpi ?? 300,
      sheetOptions(options),
    );
    const first = layout.placements[0],
      composite =
        mask && options.background
          ? compositeCrop(
              photo,
              crop,
              mask,
              options.background,
              first.width * ratio,
              first.height * ratio,
            )
          : undefined;
    for (const p of layout.placements)
      if (composite) ctx.drawImage(composite, p.x, p.y, p.width, p.height);
      else
        ctx.drawImage(
          photo.image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          p.x,
          p.y,
          p.width,
          p.height,
        );
    if (composite) freeCanvas(composite);
    strokeSheetMarks(ctx, layout, "#89918d", "#c8ccc9");
  } else {
    if (mask && options.background) {
      const composite = compositeCrop(
        photo,
        crop,
        mask,
        options.background,
        size.width * ratio,
        size.height * ratio,
      );
      ctx.drawImage(composite, 0, 0, size.width, size.height);
      freeCanvas(composite);
    } else
      ctx.drawImage(
        photo.image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        size.width,
        size.height,
      );
    if (options.guides) {
        // How much smaller than drawn the preview is shown, so labels stay legible.
        const shown = target.getBoundingClientRect().width;
        drawGuides(
          ctx,
          size,
          1 / ratio,
          preset,
          crop,
          options.landmarks,
          shown > 0 ? target.width / shown : 1,
        );
      }
  }
}
function sheetOptions(options: Pick<RenderOptions, "sheetStyle" | "sheetOrientation">) {
  return { style: options.sheetStyle, orientation: options.sheetOrientation };
}
/** Cut marks in a darker grey; edge-to-edge guides in a light hairline that never enters a photo. */
function strokeSheetMarks(
  ctx: CanvasRenderingContext2D,
  layout: SheetLayout,
  marks: string,
  guides: string,
) {
  ctx.strokeStyle = layout.style === "edge-to-edge" ? guides : marks;
  ctx.lineWidth = 1;
  for (const m of layout.cutMarks) {
    ctx.beginPath();
    ctx.moveTo(m.x1, m.y1);
    ctx.lineTo(m.x2, m.y2);
    ctx.stroke();
  }
}
function toBlob(
  c: HTMLCanvasElement,
  type = "image/png",
  quality = 0.96,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("Photo export failed. Try a smaller image.")),
      type,
      quality,
    ),
  );
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length),
    view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
const XMP_HEADER = "http://ns.adobe.com/xap/1.0/\0";
function xmpSegment(note: string) {
  const xml = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description><rdf:Alt><rdf:li xml:lang="x-default">${note}</rdf:li></rdf:Alt></dc:description></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  const payload = new TextEncoder().encode(XMP_HEADER + xml),
    out = new Uint8Array(4 + payload.length);
  out[0] = 0xff;
  out[1] = 0xe1;
  out[2] = (payload.length + 2) >> 8;
  out[3] = (payload.length + 2) & 255;
  out.set(payload, 4);
  return out;
}
/**
 * Add physical density without retaining EXIF or other source metadata. When `note` is given the
 * output also carries it as a description: a PNG tEXt "Description" chunk, or a JPEG XMP APP1 segment.
 */
async function withDensity(blob: Blob, dpi = 300, note?: string): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === "image/png") {
    const phys = new Uint8Array(9),
      view = new DataView(phys.buffer);
    view.setUint32(0, Math.round(dpi / 0.0254));
    view.setUint32(4, Math.round(dpi / 0.0254));
    phys[8] = 1;
    const chunks = [pngChunk("pHYs", phys)];
    if (note)
      chunks.push(
        pngChunk("tEXt", new TextEncoder().encode(`Description\0${note}`)),
      );
    return new Blob([bytes.slice(0, 33), ...chunks, bytes.slice(33)], {
      type: blob.type,
    });
  }
  // JPEG canvas encoders generally write a JFIF segment. Update it or insert one.
  const xmp = note ? [xmpSegment(note)] : [];
  let offset = 2;
  while (offset + 16 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1],
      length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (
      marker === 0xe0 &&
      String.fromCharCode(...bytes.slice(offset + 4, offset + 9)) === "JFIF\0"
    ) {
      bytes[offset + 11] = 1;
      bytes[offset + 12] = dpi >> 8;
      bytes[offset + 13] = dpi & 255;
      bytes[offset + 14] = dpi >> 8;
      bytes[offset + 15] = dpi & 255;
      const end = offset + 2 + length;
      return new Blob([bytes.slice(0, end), ...xmp, bytes.slice(end)], {
        type: blob.type,
      });
    }
    if (marker === 0xda) break;
    offset += 2 + length;
  }
  const jfif = new Uint8Array([
    255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 2, 1,
    dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0,
  ]);
  return new Blob([bytes.slice(0, 2), jfif, ...xmp, bytes.slice(2)], {
    type: blob.type,
  });
}
const ORIGINAL_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
/** A safe download name for an original: no path or control characters, at most 80 long, extension from the sniffed type. */
export function originalFilename(photo: Pick<LoadedPhoto, "name" | "mime">) {
  const leaf = photo.name.split(/[\\/]/).pop() ?? "",
    stem = leaf
      .replace(/\.[^.]*$/, "")
      .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>:"|?*%]/g, "")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 80)
      .replace(/[.\s]+$/, "");
  return `${stem || "photo"}.${ORIGINAL_EXTENSIONS[photo.mime] ?? "jpg"}`;
}
export async function exportPhoto(
  photo: LoadedPhoto,
  preset: Preset,
  crop: Crop,
  options: ExportOptions,
) {
  if (preset.mode === "original") {
    // Digital originals are exact copies. Any background option is ignored: nothing is ever edited.
    if (preset.mimeTypes && !preset.mimeTypes.includes(photo.file.type))
      throw new Error(
        "This application does not accept this file type. Use an original JPEG or PNG.",
      );
    if (
      (preset.minBytes && photo.file.size < preset.minBytes) ||
      (preset.maxBytes && photo.file.size > preset.maxBytes)
    )
      throw new Error(
        "The original file is outside this application’s file-size range. Choose another original photo.",
      );
    // A HEIC this browser cannot decode may not state its size; the receiving service checks it.
    if (
      photo.width > 0 &&
      photo.height > 0 &&
      ((preset.minWidth && photo.width < preset.minWidth) ||
        (preset.minHeight && photo.height < preset.minHeight))
    )
      throw new Error("The original photo is too small for this application.");
    return { blob: photo.file as Blob, filename: originalFilename(photo) };
  }
  assertEditable(photo);
  const dpi = options.dpi ?? 300;
  const issues = cropIssues(crop, photo.width, photo.height, preset, dpi);
  if (issues.length) throw new Error(issues[0].message);
  const size = outputSize(preset, dpi),
    layout = options.sheet
      ? layoutSheet(preset, options.paperId ?? "4x6", dpi, sheetOptions(options))
      : null;
  // Raster sheets are one canvas. Over the budget (600 DPI A4 or Letter, ~34 MP) that fails on iOS
  // Safari, and hand-assembling a PNG or JPEG from strips is not worth the risk. PDF places each photo
  // as its own image, so it works at any size.
  if (layout && options.format !== "pdf" && layout.width * layout.height > MAX_CANVAS_AREA)
    throw new PortraitError(
      "SHEET_TOO_LARGE",
      `This sheet is ${Math.round((layout.width * layout.height) / 1e6)} megapixels, more than phones and tablets can render as one image. Choose PDF, which prints at full quality, or use 300 DPI.`,
    );
  let mask: HTMLCanvasElement | undefined;
  if (options.background) {
    await prepareBackground(photo);
    mask = backgroundMask(photo, options.background);
  }
  const replaced = !!mask && !!options.background;
  const single =
    mask && options.background
      ? compositeCrop(photo, crop, mask, options.background, size.width, size.height)
      : (() => {
          const c = canvas(size.width, size.height);
          context(c).drawImage(
            photo.image,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            size.width,
            size.height,
          );
          return c;
        })();
  const singleContext = context(single);
  if (preset.mode === "print") {
    const rgba = singleContext.getImageData(
      0,
      0,
      single.width,
      single.height,
    ).data;
    for (let i = 3; i < rgba.length; i += 4)
      if (rgba[i] < 255) {
        freeCanvas(single);
        throw new Error(
          "Use an original photo with an opaque, natural background. Transparent cutouts are not supported for passport prints.",
        );
      }
  } else {
    singleContext.globalCompositeOperation = "destination-over";
    singleContext.fillStyle = "#ffffff";
    singleContext.fillRect(0, 0, single.width, single.height);
    singleContext.globalCompositeOperation = "source-over";
  }
  const suffix = options.sheet ? "print-sheet" : "photo";
  if (options.format === "pdf") {
    const { PDFDocument, rgb } = await warmExportTools();
    const doc = await PDFDocument.create();
    doc.setTitle("PortraitPass photo print");
    doc.setCreator(INDEPENDENCE_NOTE);
    doc.setProducer("PortraitPass");
    doc.setSubject(
      `Photo print prepared with ${INDEPENDENCE_NOTE}${replaced ? ` ${BACKGROUND_NOTE}.` : ""}`,
    );
    doc.setKeywords([
      "PortraitPass",
      INDEPENDENCE_NOTE,
      ...(replaced ? [BACKGROUND_NOTE] : []),
    ]);
    const embedded = await doc.embedPng(
      await (await toBlob(single)).arrayBuffer(),
    );
    freeCanvas(single);
    const widthMm = layout?.widthMm ?? preset.widthMm,
      heightMm = layout?.heightMm ?? preset.heightMm;
    const pt = 72 / 25.4,
      page = doc.addPage([widthMm * pt, heightMm * pt]);
    // Millimetre placements at the preset's exact size (edge-to-edge tiles do not overlap).
    const { placements, marks } = layout
      ? sheetMm(layout, preset)
      : {
          placements: [
            { x: 0, y: 0, width: preset.widthMm, height: preset.heightMm },
          ],
          marks: [],
        };
    for (const p of placements)
      page.drawImage(embedded, {
        x: p.x * pt,
        y: (heightMm - p.y - p.height) * pt,
        width: p.width * pt,
        height: p.height * pt,
      });
    for (const m of marks)
      page.drawLine({
        start: { x: m.x1 * pt, y: (heightMm - m.y1) * pt },
        end: { x: m.x2 * pt, y: (heightMm - m.y2) * pt },
        thickness: layout?.style === "edge-to-edge" ? 0.2 : 0.25,
        color:
          layout?.style === "edge-to-edge"
            ? rgb(0.78, 0.78, 0.78)
            : rgb(0.5, 0.5, 0.5),
      });
    return {
      blob: new Blob([new Uint8Array(await doc.save())], {
        type: "application/pdf",
      }),
      filename: `portraitpass-${preset.id}-${suffix}.pdf`,
    };
  }
  let out = single;
  if (layout) {
    out = canvas(layout.width, layout.height);
    const ctx = context(out);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    for (const p of layout.placements) ctx.drawImage(single, p.x, p.y);
    strokeSheetMarks(ctx, layout, "#888", "#c8c8c8");
    freeCanvas(single);
  }
  const encoded = await toBlob(out, `image/${options.format}`);
  freeCanvas(out);
  return {
    blob: await withDensity(encoded, dpi, replaced ? BACKGROUND_NOTE : undefined),
    filename: `portraitpass-${preset.id}-${suffix}.${options.format === "jpeg" ? "jpg" : "png"}`,
  };
}
export interface DigitalExportOptions {
  /** Replacement background colour; needs the mask from prepareBackground. */
  background?: string;
}
export interface DigitalExport {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  bytes: number;
  /** JPEG quality (0–1) of the kept encode. */
  quality: number;
  /** True when a JPEG comment segment was added to reach the minimum size (pixels unchanged). */
  padded: boolean;
  paddedBytes: number;
  encodes: number;
}
async function canvasJpeg(c: HTMLCanvasElement, quality: number, note?: string) {
  const blob = await toBlob(c, "image/jpeg", quality);
  if (blob.type !== "image/jpeg")
    throw new Error("This browser cannot write JPEG files.");
  // Same metadata handling as prints: a JFIF header, and the background note when the background was replaced.
  const out = note ? await withDensity(blob, 72, note) : blob;
  return new Uint8Array(await out.arrayBuffer());
}
/**
 * Exact digital export: crop, scale down to widthPx x heightPx (never up) and search JPEG quality so
 * the file lands inside minKB..maxKB. Uses the same core search as the Node adapter. Throws
 * LOW_RESOLUTION when the crop has fewer pixels than the target, and FILE_SIZE_UNREACHABLE when even
 * the lowest quality is over the maximum (choose fewer pixels).
 */
export async function exportDigital(
  photo: LoadedPhoto,
  preset: Preset,
  crop: Crop,
  target: DigitalTarget,
  options: DigitalExportOptions = {},
): Promise<DigitalExport> {
  if (preset.mode === "original")
    throw new PortraitError(
      "ORIGINAL_ONLY",
      "Digital originals are exported unchanged and are never resized or re-encoded.",
    );
  assertEditable(photo);
  const limits = digitalTargetBytes(target);
  const issues = cropIssues(crop, photo.width, photo.height, preset, 300).filter(
    (i) => i.code === "INVALID_CROP",
  );
  if (issues.length) throw new PortraitError("INVALID_CROP", issues[0].message);
  if (
    Math.abs(crop.width / crop.height - target.widthPx / target.heightPx) /
      (target.widthPx / target.heightPx) >
    0.005
  )
    throw new PortraitError(
      "ASPECT_MISMATCH",
      `The crop is not the same shape as ${target.widthPx} × ${target.heightPx}.`,
    );
  if (
    crop.width + 0.01 < target.widthPx ||
    crop.height + 0.01 < target.heightPx
  )
    throw new PortraitError(
      "LOW_RESOLUTION",
      `The crop holds ${Math.floor(crop.width)} × ${Math.floor(crop.height)} pixels and ${target.widthPx} × ${target.heightPx} were asked for. Photos are never enlarged: choose a smaller size or a photo with more pixels.`,
    );
  let mask: HTMLCanvasElement | undefined;
  if (options.background) {
    await prepareBackground(photo);
    mask = backgroundMask(photo, options.background);
  }
  const replaced = !!mask && !!options.background;
  const c =
    mask && options.background
      ? compositeCrop(photo, crop, mask, options.background, target.widthPx, target.heightPx)
      : (() => {
          const out = canvas(target.widthPx, target.heightPx);
          const ctx = context(out);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            photo.image,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            target.widthPx,
            target.heightPx,
          );
          return out;
        })();
  try {
    // JPEG has no alpha: put the picture on white so nothing turns black.
    const ctx = context(c);
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-over";
    const fit = await fitToFileSize(
      (q) => canvasJpeg(c, q, replaced ? BACKGROUND_NOTE : undefined),
      limits,
      { minQuality: MIN_JPEG_QUALITY, maxQuality: MAX_JPEG_QUALITY, maxIterations: 8 },
    );
    return {
      blob: new Blob([fit.bytes as BlobPart], { type: "image/jpeg" }),
      filename: `portraitpass-${preset.id}-${target.widthPx}x${target.heightPx}.jpg`,
      width: target.widthPx,
      height: target.heightPx,
      bytes: fit.bytes.length,
      quality: fit.quality,
      padded: fit.padded,
      paddedBytes: fit.paddedBytes,
      encodes: fit.iterations,
    };
  } finally {
    freeCanvas(c);
  }
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
let facePromise:
  Promise<import("@mediapipe/tasks-vision").FaceDetector> | undefined;
async function faceDetector() {
  if (!facePromise)
    facePromise = (async () => {
      const { FilesetResolver, FaceDetector } =
        await import("@mediapipe/tasks-vision");
      return FaceDetector.createFromOptions(
        await FilesetResolver.forVisionTasks("/wasm"),
        {
          baseOptions: {
            modelAssetPath: "/models/face.tflite",
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.5,
        },
      );
    })().catch((e) => {
      facePromise = undefined;
      throw e;
    });
  return facePromise;
}
export async function autoCrop(photo: LoadedPhoto, preset: Preset) {
  if (preset.mode === "original")
    throw new Error("Keep this digital original uncropped.");
  assertEditable(photo);
  const detector = await faceDetector();
  const work = analysisSource(photo);
  let detections;
  try {
    ({ detections } = detector.detect(work.source));
  } finally {
    work.release();
  }
  if (detections.length !== 1)
    throw new Error(
      detections.length
        ? "More than one face found. Choose a photo with one person."
        : "No clear face found. Use the manual positioning controls.",
    );
  const raw = detections[0].boundingBox;
  if (!raw) throw new Error("Use manual positioning for this photo.");
  // Bounding boxes come back in pixels of the (possibly downscaled) analysis copy.
  const b = {
    originX: raw.originX / work.scale,
    originY: raw.originY / work.scale,
    width: raw.width / work.scale,
    height: raw.height / work.scale,
  };
  // The detector has no crown landmark. Infer the top of the portrait silhouette,
  // then show all positions for human correction rather than certifying a head size.
  let crownY = Math.max(0, b.originY - b.height * 0.65);
  try {
    await prepareBackground(photo);
    const mask = masks.get(photo.image);
    if (mask) {
      // The mask may be smaller than the photo; scan it in its own pixels.
      const kx = mask.width / photo.width,
        ky = mask.height / photo.height;
      const x = Math.max(0, Math.round(b.originX * kx)),
        w = Math.min(mask.width - x, Math.round(b.width * kx));
      const y0 = Math.max(0, Math.round((b.originY - b.height) * ky)),
        y1 = Math.min(
          mask.height,
          Math.round((b.originY + b.height * 0.25) * ky),
        );
      if (w > 0 && y1 > y0) {
        const data = context(mask).getImageData(x, y0, w, y1 - y0).data;
        for (let y = 0; y < y1 - y0; y++) {
          let count = 0;
          for (let col = 0; col < w; col++)
            if (data[(y * w + col) * 4 + 3] > 200) count++;
          if (count >= Math.max(4, w * 0.1)) {
            crownY = (y + y0) / ky;
            break;
          }
        }
      }
    }
  } catch {
    /* Manual correction remains available even if segmentation cannot initialize. */
  }
  const landmarks = {
    centerX: b.originX + b.width / 2,
    crownY,
    chinY: Math.min(photo.height, b.originY + b.height),
    eyesY:
      ((detections[0].keypoints[0].y + detections[0].keypoints[1].y) / 2) *
      photo.height,
  };
  return {
    crop: cropFromLandmarks(photo.width, photo.height, preset, landmarks),
    landmarks,
    /** The detector's face box (forehead to chin) in source pixels. Kept in memory only, never saved. */
    face: {
      x: b.originX,
      y: b.originY,
      width: b.width,
      height: b.height,
    },
    message: "Position suggested. Check the crown and chin guides yourself.",
  };
}

/** The cached segmentation mask for this photo (alpha = person probability), if segmentation has run. */
export function getBackgroundMask(photo: LoadedPhoto): HTMLCanvasElement | undefined {
  return masks.get(photo.image);
}

let segmentPromise:
  Promise<import("@mediapipe/tasks-vision").ImageSegmenter> | undefined;
export async function prepareBackground(photo: LoadedPhoto): Promise<void> {
  assertEditable(photo);
  if (masks.has(photo.image)) return;
  if (!segmentPromise)
    segmentPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } =
        await import("@mediapipe/tasks-vision");
      return ImageSegmenter.createFromOptions(
        await FilesetResolver.forVisionTasks("/wasm"),
        {
          baseOptions: {
            modelAssetPath: "/models/selfie.tflite",
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        },
      );
    })().catch((e) => {
      segmentPromise = undefined;
      throw e;
    });
  const segmenter = await segmentPromise;
  // Large photos are analysed on a downscaled copy; the mask is stretched back when compositing.
  const work = analysisSource(photo);
  let result;
  try {
    result = segmenter.segment(work.source);
  } finally {
    work.release();
  }
  try {
    const mask = result.confidenceMasks?.[0];
    if (!mask) throw new Error("Background assistance was unavailable.");
    const data = mask.getAsFloat32Array(),
      small = canvas(mask.width, mask.height),
      ctx = context(small),
      rgba = ctx.createImageData(mask.width, mask.height);
    for (let i = 0; i < data.length; i++) {
      rgba.data[i * 4] = rgba.data[i * 4 + 1] = rgba.data[i * 4 + 2] = 255;
      rgba.data[i * 4 + 3] = Math.round(
        Math.max(0, Math.min(1, data[i])) * 255,
      );
    }
    ctx.putImageData(rgba, 0, 0);
    masks.set(photo.image, small);
  } finally {
    result.close();
  }
}
/** The mask as a PNG data URL at source size, as saved projects and the Node adapter require. */
function fullMaskDataUrl(photo: LoadedPhoto, mask: HTMLCanvasElement) {
  if (mask.width === photo.width && mask.height === photo.height)
    return mask.toDataURL("image/png");
  if (photo.width * photo.height > MAX_CANVAS_AREA)
    throw new PortraitError(
      "MASK_TOO_LARGE",
      "This photo is too large to save a background project in this browser. Save without the background, or use a photo under 16 megapixels.",
    );
  const full = canvas(photo.width, photo.height);
  context(full).drawImage(mask, 0, 0, photo.width, photo.height);
  const url = full.toDataURL("image/png");
  freeCanvas(full);
  return url;
}
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not save the project."));
    r.readAsDataURL(blob);
  });
}
export async function saveProject(
  photo: LoadedPhoto,
  preset: Preset,
  crop: Crop,
  options: {
    paperId?: string;
    background?: string;
    customSize?: { widthMm: number; heightMm: number };
    landmarks?: Landmarks;
    format?: "png" | "jpeg" | "pdf";
    dpi?: number;
    sheet?: boolean;
    sheetStyle?: SheetStyle;
    sheetOrientation?: SheetOrientation;
  } = {},
) {
  if (preset.mode !== "original") assertEditable(photo);
  const editing = !!options.background && preset.mode !== "original";
  if (editing) await prepareBackground(photo);
  // The mask is only saved when the background is actually being replaced.
  const mask = editing ? masks.get(photo.image) : undefined;
  const project = {
    version: 1,
    outputKind:
      options.sheet && preset.mode !== "original" ? "sheet" : "single",
    presetId: preset.id,
    source: {
      name: photo.name,
      mime: photo.file.type,
      width: photo.width,
      height: photo.height,
      dataUrl: await dataUrl(photo.file),
    },
    crop,
    dpi: options.dpi ?? 300,
    paperId: options.paperId ?? "4x6",
    format:
      preset.mode === "original" ? "original" : (options.format ?? "jpeg"),
    ...(options.landmarks ? { landmarks: options.landmarks } : {}),
    ...(options.sheetStyle ? { sheetStyle: options.sheetStyle } : {}),
    ...(options.sheetOrientation
      ? { sheetOrientation: options.sheetOrientation }
      : {}),
    background: {
      enabled: editing,
      color: options.background ?? "#ffffff",
      tolerance: 24,
      ...(mask ? { maskDataUrl: fullMaskDataUrl(photo, mask) } : {}),
    },
    ...(preset.id === "general-id"
      ? { customSize: { widthMm: preset.widthMm, heightMm: preset.heightMm } }
      : {}),
  };
  const validated = validateProject(project);
  if (!validated.valid) throw new Error(validated.issues[0].message);
  return new Blob([JSON.stringify(project)], { type: "application/json" });
}
/**
 * Width and height from the PNG IHDR of a data URL, read from its first bytes so nothing large is
 * decoded. Throws for anything that is not a well-formed PNG header.
 */
function pngSizeOfDataUrl(url: string) {
  const prefix = "data:image/png;base64,";
  if (!url.startsWith(prefix))
    throw new PortraitError("INVALID_MASK", "Project mask must be a PNG.");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(url.slice(prefix.length, prefix.length + 48)), (c) =>
      c.charCodeAt(0),
    );
  } catch {
    throw new PortraitError("INVALID_MASK", "Project mask could not be read.");
  }
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    signature.some((v, i) => bytes[i] !== v) ||
    String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR"
  )
    throw new PortraitError("INVALID_MASK", "Project mask could not be read.");
  const view = new DataView(bytes.buffer);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
export async function openProject(
  file: File,
): Promise<{
  photo: LoadedPhoto;
  presetId: string;
  crop: Crop;
  paperId: string;
  background?: string;
  customSize?: { widthMm: number; heightMm: number };
  landmarks?: Landmarks;
  format?: string;
  dpi: number;
  sheet: boolean;
  sheetStyle?: SheetStyle;
  sheetOrientation?: SheetOrientation;
}> {
  if (file.size > 60 * 1024 * 1024) throw new Error("Project is too large.");
  const p = parseProject(await file.text());
  if (!p.source.dataUrl) throw new Error("This project has no embedded photo.");
  const match =
    /^data:(image\/(?:jpeg|png|webp|heic|heif));base64,([A-Za-z0-9+/=]+)$/.exec(
      p.source.dataUrl,
    );
  if (!match) throw new Error("Invalid embedded image.");
  const maskUrl = (p.background as { maskDataUrl?: string }).maskDataUrl;
  if (p.background.enabled && !maskUrl)
    throw new Error(
      "This background project is missing its saved mask. Open the original photo and prepare it again.",
    );
  // Check the mask's PNG header against the stated source size before decoding anything.
  if (maskUrl) {
    const size = pngSizeOfDataUrl(maskUrl);
    if (
      size.width !== p.source.width ||
      size.height !== p.source.height ||
      size.width * size.height > MAX_SOURCE_PIXELS
    )
      throw new Error("Project mask size is invalid.");
  }
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const photo = await loadPhoto(
    new File([bytes], p.source.name, { type: match[1] }),
    p.source.name.includes("synthetic-demo"),
  );
  try {
    if (isHeifPhoto(photo) && getPreset(p.presetId).mode !== "original")
      throw new PortraitError("HEIC_UNSUPPORTED", HEIC_PRINT_MESSAGE);
    if (
      !photo.bytesOnly &&
      (photo.width !== p.source.width || photo.height !== p.source.height)
    )
      throw new Error("The project dimensions do not match its photo.");
    if (photo.bytesOnly && p.background.enabled) throw heicError();
    if (maskUrl && !photo.bytesOnly) {
      const img = new Image();
      img.src = maskUrl;
      await img.decode();
      if (img.width !== photo.width || img.height !== photo.height)
        throw new Error("Project mask size is invalid.");
      // Photos above the canvas budget keep a downscaled mask; compositing stretches it back.
      const fit = fitSize(photo.width, photo.height, MAX_CANVAS_AREA);
      const c = canvas(fit.width, fit.height);
      context(c).drawImage(img, 0, 0, fit.width, fit.height);
      masks.set(photo.image, c);
    }
  } catch (e) {
    releasePhoto(photo);
    throw e instanceof Error ? e : new Error("This project could not be opened.");
  }
  return {
    photo,
    presetId: p.presetId,
    crop: p.crop,
    paperId: p.paperId,
    background: p.background.enabled ? p.background.color : undefined,
    customSize: p.customSize,
    landmarks: p.landmarks,
    format: p.format,
    dpi: p.dpi,
    sheet: p.outputKind === "sheet",
    sheetStyle: p.sheetStyle,
    sheetOrientation: p.sheetOrientation,
  };
}
