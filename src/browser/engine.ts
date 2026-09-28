import { checkRaster } from "./header";
let pdfTools: Promise<typeof import("pdf-lib")> | undefined;
export function warmExportTools() {
  return (pdfTools ??= import("pdf-lib").catch((error) => {
    pdfTools = undefined;
    throw error;
  }));
}
import {
  cropFromLandmarks,
  cropIssues,
  outputSize,
  layoutSheet,
  parseProject,
  validateProject,
} from "../core/index";
import type { Crop, Preset, Project, Landmarks } from "../core/index";

export interface LoadedPhoto {
  file: File;
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  name: string;
  isDemo: boolean;
}
export interface RenderOptions {
  paperId?: string;
  sheet?: boolean;
  guides?: boolean;
  background?: string;
  dpi?: number;
  landmarks?: Landmarks;
}
const MAX_BYTES = 20 * 1024 * 1024;
const masks = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
const backgrounds = new WeakMap<
  HTMLImageElement,
  { color: string; canvas: HTMLCanvasElement }
>();
function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}
function context(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Your browser could not open the photo canvas.");
  return ctx;
}
export async function loadPhoto(
  file: File,
  isDemo = false,
): Promise<LoadedPhoto> {
  if (file.size > MAX_BYTES)
    throw new Error("Choose a photo smaller than 20 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPEG, PNG or WebP photo. HEIC is not supported by this browser studio.",
    );
  await checkRaster(file);
  const url = URL.createObjectURL(file),
    image = new Image();
  image.src = url;
  try {
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 40_000_000)
      throw new Error("Choose a photo under 40 megapixels.");
    return {
      file,
      url,
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      name: file.name,
      isDemo,
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e instanceof Error ? e : new Error("This photo could not be opened.");
  }
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
export function releasePhoto(p: LoadedPhoto) {
  URL.revokeObjectURL(p.url);
}
function pixels(
  photo: LoadedPhoto,
  preset: Preset,
  background?: string,
): CanvasImageSource {
  if (!background || preset.mode !== "general") return photo.image;
  const cached = backgrounds.get(photo.image);
  if (cached?.color === background) return cached.canvas;
  const mask = masks.get(photo.image);
  if (!mask) return photo.image;
  if (!/^#[0-9a-f]{6}$/i.test(background))
    throw new Error("Use a six-digit background colour.");
  const c = canvas(photo.width, photo.height),
    ctx = context(c);
  ctx.drawImage(photo.image, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  backgrounds.set(photo.image, { color: background, canvas: c });
  return c;
}
export function renderPreview(
  target: HTMLCanvasElement,
  photo: LoadedPhoto,
  preset: Preset,
  crop: Crop,
  options: RenderOptions = {},
) {
  const sheet = options.sheet && preset.mode !== "original";
  const size =
    preset.mode === "original"
      ? { width: photo.width, height: photo.height }
      : sheet
        ? layoutSheet(preset, options.paperId ?? "4x6", options.dpi ?? 300)
        : outputSize(preset, options.dpi ?? 300);
  const ratio = Math.min(1, 1000 / Math.max(size.width, size.height));
  target.width = Math.round(size.width * ratio);
  target.height = Math.round(size.height * ratio);
  const ctx = context(target);
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size.width, size.height);
  const source = pixels(photo, preset, options.background);
  if (preset.mode === "original") {
    ctx.drawImage(photo.image, 0, 0, size.width, size.height);
    return;
  }
  if (sheet) {
    const layout = layoutSheet(
      preset,
      options.paperId ?? "4x6",
      options.dpi ?? 300,
    );
    for (const p of layout.placements)
      ctx.drawImage(
        source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        p.x,
        p.y,
        p.width,
        p.height,
      );
    ctx.strokeStyle = "#89918d";
    ctx.lineWidth = 1;
    for (const m of layout.cutMarks) {
      ctx.beginPath();
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
      ctx.stroke();
    }
  } else {
    ctx.drawImage(
      source,
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
      ctx.strokeStyle = "#496f62";
      ctx.lineWidth = 1.5 / ratio;
      ctx.setLineDash([7 / ratio, 5 / ratio]);
      ctx.beginPath();
      ctx.ellipse(
        size.width / 2,
        size.height * 0.43,
        size.width * 0.27,
        size.height * 0.32,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, size.height * 0.4);
      ctx.lineTo(size.width, size.height * 0.4);
      ctx.stroke();
      if (options.landmarks) {
        const l = options.landmarks;
        ctx.setLineDash([4 / ratio, 3 / ratio]);
        ctx.font = `${11 / ratio}px sans-serif`;
        for (const [label, y] of [
          ["Crown", l.crownY],
          ["Eyes", l.eyesY],
          ["Chin", l.chinY],
        ] as const) {
          const py = ((y - crop.y) / crop.height) * size.height;
          if (py < 0 || py > size.height) continue;
          ctx.strokeStyle = "#bd4c29";
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(size.width, py);
          ctx.stroke();
          ctx.fillStyle = "#fffdf6";
          ctx.fillRect(4 / ratio, py - 18 / ratio, 46 / ratio, 16 / ratio);
          ctx.fillStyle = "#76331e";
          ctx.fillText(label, 8 / ratio, py - 6 / ratio);
        }
      }
    }
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
/** Add physical density without retaining EXIF or other source metadata. */
async function withDensity(blob: Blob, dpi = 300): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === "image/png") {
    const chunk = new Uint8Array(21),
      view = new DataView(chunk.buffer);
    view.setUint32(0, 9);
    chunk.set([112, 72, 89, 115], 4);
    view.setUint32(8, Math.round(dpi / 0.0254));
    view.setUint32(12, Math.round(dpi / 0.0254));
    chunk[16] = 1;
    view.setUint32(17, crc32(chunk.subarray(4, 17)));
    return new Blob([bytes.slice(0, 33), chunk, bytes.slice(33)], {
      type: blob.type,
    });
  }
  // JPEG canvas encoders generally write a JFIF segment. Update it or insert one.
  let offset = 2;
  while (offset + 16 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (
      marker === 0xe0 &&
      String.fromCharCode(...bytes.slice(offset + 4, offset + 9)) === "JFIF\0"
    ) {
      bytes[offset + 11] = 1;
      bytes[offset + 12] = dpi >> 8;
      bytes[offset + 13] = dpi & 255;
      bytes[offset + 14] = dpi >> 8;
      bytes[offset + 15] = dpi & 255;
      return new Blob([bytes], { type: blob.type });
    }
    if (marker === 0xda) break;
    offset += 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3]);
  }
  const jfif = new Uint8Array([
    255,
    224,
    0,
    16,
    74,
    70,
    73,
    70,
    0,
    1,
    2,
    1,
    dpi >> 8,
    dpi & 255,
    dpi >> 8,
    dpi & 255,
    0,
    0,
  ]);
  return new Blob([bytes.slice(0, 2), jfif, bytes.slice(2)], {
    type: blob.type,
  });
}
export async function exportPhoto(
  photo: LoadedPhoto,
  preset: Preset,
  crop: Crop,
  options: RenderOptions & { format: "png" | "jpeg" | "pdf" },
) {
  if (preset.mode === "original") {
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
    if (
      (preset.minWidth && photo.width < preset.minWidth) ||
      (preset.minHeight && photo.height < preset.minHeight)
    )
      throw new Error("The original photo is too small for this application.");
    return { blob: photo.file as Blob, filename: photo.name };
  }
  const issues = cropIssues(
    crop,
    photo.width,
    photo.height,
    preset,
    options.dpi ?? 300,
  );
  if (issues.length) throw new Error(issues[0].message);
  if (options.background) {
    if (preset.mode !== "general")
      throw new Error(
        "Background changes are unavailable for passport photos.",
      );
    await prepareBackground(photo);
  }
  const size = outputSize(preset, options.dpi ?? 300),
    single = canvas(size.width, size.height);
  context(single).drawImage(
    pixels(photo, preset, options.background),
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size.width,
    size.height,
  );
  const singleContext = context(single);
  if (preset.mode === "print") {
    const rgba = singleContext.getImageData(
      0,
      0,
      single.width,
      single.height,
    ).data;
    for (let i = 3; i < rgba.length; i += 4)
      if (rgba[i] < 255)
        throw new Error(
          "Use an original photo with an opaque, natural background. Transparent cutouts are not supported for passport prints.",
        );
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
    doc.setCreator("PortraitPass");
    const embedded = await doc.embedPng(
      await (await toBlob(single)).arrayBuffer(),
    );
    const layout = options.sheet
      ? layoutSheet(preset, options.paperId ?? "4x6", options.dpi ?? 300)
      : null;
    const widthMm = layout?.widthMm ?? preset.widthMm,
      heightMm = layout?.heightMm ?? preset.heightMm;
    const pt = 72 / 25.4,
      page = doc.addPage([widthMm * pt, heightMm * pt]);
    const placements = layout?.placements ?? [
      { x: 0, y: 0, width: size.width, height: size.height },
    ];
    for (const p of placements)
      page.drawImage(embedded, {
        x: (p.x * 72) / (options.dpi ?? 300),
        y:
          heightMm * pt -
          (p.y * 72) / (options.dpi ?? 300) -
          preset.heightMm * pt,
        width: preset.widthMm * pt,
        height: preset.heightMm * pt,
      });
    for (const m of layout?.cutMarks ?? [])
      page.drawLine({
        start: {
          x: (m.x1 * 72) / (options.dpi ?? 300),
          y: heightMm * pt - (m.y1 * 72) / (options.dpi ?? 300),
        },
        end: {
          x: (m.x2 * 72) / (options.dpi ?? 300),
          y: heightMm * pt - (m.y2 * 72) / (options.dpi ?? 300),
        },
        thickness: 0.25,
        color: rgb(0.5, 0.5, 0.5),
      });
    return {
      blob: new Blob([new Uint8Array(await doc.save())], {
        type: "application/pdf",
      }),
      filename: `portraitpass-${preset.id}-${suffix}.pdf`,
    };
  }
  let out = single;
  if (options.sheet) {
    const layout = layoutSheet(
      preset,
      options.paperId ?? "4x6",
      options.dpi ?? 300,
    );
    out = canvas(layout.width, layout.height);
    const ctx = context(out);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    for (const p of layout.placements) ctx.drawImage(single, p.x, p.y);
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    for (const m of layout.cutMarks) {
      ctx.beginPath();
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
      ctx.stroke();
    }
  }
  return {
    blob: await withDensity(
      await toBlob(out, `image/${options.format}`),
      options.dpi ?? 300,
    ),
    filename: `portraitpass-${preset.id}-${suffix}.${options.format === "jpeg" ? "jpg" : "png"}`,
  };
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
  const detector = await faceDetector();
  const { detections } = detector.detect(photo.image);
  if (detections.length !== 1)
    throw new Error(
      detections.length
        ? "More than one face found. Choose a photo with one person."
        : "No clear face found. Use the manual positioning controls.",
    );
  const b = detections[0].boundingBox;
  if (!b) throw new Error("Use manual positioning for this photo.");
  // The detector has no crown landmark. Infer the top of the portrait silhouette,
  // then show all positions for human correction rather than certifying a head size.
  let crownY = Math.max(0, b.originY - b.height * 0.65);
  try {
    await prepareBackground(photo);
    const mask = masks.get(photo.image);
    if (mask) {
      const x = Math.max(0, Math.round(b.originX)),
        w = Math.min(photo.width - x, Math.round(b.width));
      const y0 = Math.max(0, Math.round(b.originY - b.height)),
        y1 = Math.min(photo.height, Math.round(b.originY + b.height * 0.25));
      const data = context(mask).getImageData(x, y0, w, y1 - y0).data;
      for (let y = 0; y < y1 - y0; y++) {
        let count = 0;
        for (let col = 0; col < w; col++)
          if (data[(y * w + col) * 4 + 3] > 200) count++;
        if (count >= Math.max(4, w * 0.1)) {
          crownY = y + y0;
          break;
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
    message: "Position suggested. Check the crown and chin guides yourself.",
  };
}

let segmentPromise:
  Promise<import("@mediapipe/tasks-vision").ImageSegmenter> | undefined;
export async function prepareBackground(photo: LoadedPhoto): Promise<void> {
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
  const result = segmenter.segment(photo.image);
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
    const full = canvas(photo.width, photo.height);
    context(full).drawImage(small, 0, 0, photo.width, photo.height);
    masks.set(photo.image, full);
  } finally {
    result.close();
  }
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
  } = {},
) {
  if (options.background && preset.mode === "general")
    await prepareBackground(photo);
  const mask = masks.get(photo.image);
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
    background: {
      enabled: !!options.background && preset.mode === "general",
      color: options.background ?? "#ffffff",
      tolerance: 24,
      ...(mask ? { maskDataUrl: mask.toDataURL("image/png") } : {}),
    },
    ...(preset.id === "general-id"
      ? { customSize: { widthMm: preset.widthMm, heightMm: preset.heightMm } }
      : {}),
  };
  const validated = validateProject(project);
  if (!validated.valid) throw new Error(validated.issues[0].message);
  return new Blob([JSON.stringify(project)], { type: "application/json" });
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
}> {
  if (file.size > 60 * 1024 * 1024) throw new Error("Project is too large.");
  const p = parseProject(await file.text());
  if (!p.source.dataUrl) throw new Error("This project has no embedded photo.");
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
      p.source.dataUrl,
    );
  if (!match) throw new Error("Invalid embedded image.");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const photo = await loadPhoto(
    new File([bytes], p.source.name, { type: match[1] }),
    p.source.name.includes("synthetic-demo"),
  );
  if (photo.width !== p.source.width || photo.height !== p.source.height) {
    releasePhoto(photo);
    throw new Error("The project dimensions do not match its photo.");
  }
  const maskUrl = (p.background as { maskDataUrl?: string }).maskDataUrl;
  if (p.background.enabled && !maskUrl) {
    releasePhoto(photo);
    throw new Error(
      "This background project is missing its saved mask. Open the original photo and prepare it again.",
    );
  }
  if (maskUrl) {
    const img = new Image();
    img.src = maskUrl;
    await img.decode();
    if (img.width !== photo.width || img.height !== photo.height)
      throw new Error("Project mask size is invalid.");
    const c = canvas(photo.width, photo.height);
    context(c).drawImage(img, 0, 0);
    masks.set(photo.image, c);
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
  };
}
