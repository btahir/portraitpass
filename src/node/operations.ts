import sharp from "sharp";
import { PDFDocument, rgb } from "pdf-lib";
import {
  readFile,
  stat,
  realpath,
  open,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as core from "../core/index.js";
import {
  MAX_SOURCE_BYTES,
  MAX_PROJECT_BYTES,
  MAX_SOURCE_PIXELS,
  PortraitError,
  createProject,
  getPreset,
  projectPreset,
  validateProject,
  parseProject,
  outputSize,
  layoutSheet,
  cropIssues,
  measurementChecks,
  originalIssues,
  mmToPoints,
  INDEPENDENCE_NOTE,
  BACKGROUND_NOTE,
  type Issue,
  type Preset,
  type Project,
  type SourceImage,
} from "../core/index.js";
const MIME: Record<string, SourceImage["mime"]> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Exit codes, documented in `portraitpass help`. */
export const EXIT_CODES = { INVALID: 2, INPUT: 3, OUTPUT: 4, INTERNAL: 1 };
const OUTPUT_CODES = new Set([
  "OUTPUT_EXISTS",
  "OUTPUT_WRITE",
  "OUTPUT_DIRECTORY",
  "SOURCE_OVERWRITE",
]);
const INPUT_CODES = new Set([
  "INPUT_NOT_FOUND",
  "SOURCE_REQUIRED",
  "INVALID_IMAGE",
  "UNSUPPORTED_IMAGE",
  "INVALID_INPUT",
  "FILE_TOO_LARGE",
  "PROJECT_NOT_FOUND",
  "ORIGINAL_NOT_ACCEPTED",
]);
export function exitCodeFor(code: string) {
  if (code === "INTERNAL_ERROR") return EXIT_CODES.INTERNAL;
  if (OUTPUT_CODES.has(code)) return EXIT_CODES.OUTPUT;
  if (INPUT_CODES.has(code)) return EXIT_CODES.INPUT;
  return EXIT_CODES.INVALID;
}
/** Stable, path-free error payload shared by the CLI and the MCP server. */
export function errorPayload(error: unknown): {
  code: string;
  message: string;
  issues?: Issue[];
} {
  if (error instanceof PortraitError)
    return {
      code: error.code,
      message: error.message,
      ...(error instanceof OriginalNotAcceptedError
        ? { issues: error.issues }
        : {}),
    };
  if (error instanceof SyntaxError)
    return { code: "INVALID_JSON", message: "Argument is not valid JSON." };
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (typeof code === "string" && code.startsWith("ERR_PARSE_ARGS"))
    return {
      code: "INVALID_ARGUMENT",
      message: (error as Error).message.split("\n")[0] ?? "Invalid arguments.",
    };
  return { code: "INTERNAL_ERROR", message: "The operation failed." };
}

/** Digital-original inputs that the browser refuses are refused here too. */
export class OriginalNotAcceptedError extends PortraitError {
  constructor(
    preset: Preset,
    public issues: Issue[],
  ) {
    super(
      "ORIGINAL_NOT_ACCEPTED",
      `This photo does not fit ${preset.name}: ${issues.map((i) => i.message).join(" ")}`,
    );
  }
}
/** Original-file checks with wording that makes no claim about acceptance. */
export function originalChecks(
  source: { width: number; height: number; mime: string; bytes: number },
  preset: Preset,
): Issue[] {
  const accepted = preset.mimeTypes ?? ["image/jpeg", "image/png"];
  return originalIssues(source, preset).map((issue) => {
    const kb = (preset.minBytes ?? 0) / 1000;
    const mb = (preset.maxBytes ?? 0) / 1_000_000;
    const message =
      issue.code === "FILE_TOO_SMALL"
        ? `The file is under the ${kb} KB minimum. Keep the original capture.`
        : issue.code === "FILE_TOO_LARGE"
          ? `The file is over the ${mb} MB upload limit. Choose a different original capture.`
          : issue.code === "LOW_RESOLUTION"
            ? `The photo is under ${preset.minWidth} × ${preset.minHeight} pixels.`
            : issue.code === "UNSUPPORTED_ORIGINAL"
              ? `File type ${source.mime} is not on the accepted list (${accepted.join(", ")}).`
              : issue.message.replace(/\b(official|approved|verified) /gi, "");
    return { code: issue.code, message };
  });
}

const HEIF_MIMES = new Set<string>(["image/heic", "image/heif"]);
/**
 * HEIC/HEIF are only valid for original-mode presets that list them (US online
 * renewal, exact bytes). Print and general presets need decoded pixels, which
 * these files cannot give here. Same rule in the browser.
 */
export function assertHeifAllowed(mime: string, presetId: string) {
  if (!HEIF_MIMES.has(mime)) return;
  let preset: Preset;
  try {
    preset = getPreset(presetId);
  } catch {
    return; // an unknown preset is reported by its own check
  }
  // Original presets check the file type themselves (ORIGINAL_NOT_ACCEPTED lists what they take).
  if (preset.mode === "original") return;
  throw new PortraitError(
    "UNSUPPORTED_IMAGE",
    `HEIC/HEIF photos only work for the US online renewal original. Convert this photo to JPEG first to use ${preset.name}.`,
  );
}
/** Parse a JSON object argument; anything else (null, arrays, numbers) is INVALID_JSON. */
export function parseJsonObject<T extends string>(
  text: string,
  what: string,
  keys: readonly T[],
): Record<T, number> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PortraitError("INVALID_JSON", `${what} is not valid JSON.`);
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !keys.every((k) => Number.isFinite((value as Record<string, unknown>)[k]))
  )
    throw new PortraitError(
      "INVALID_JSON",
      `${what} must be a JSON object with numeric ${keys.join(", ")}.`,
    );
  return value as Record<T, number>;
}
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
]);
/** Identify HEIC/HEIF by its ISO-BMFF `ftyp` box without decoding pixels. */
export function detectHeif(bytes: Uint8Array): SourceImage["mime"] | undefined {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length);
  if (b.length < 16 || b.toString("latin1", 4, 8) !== "ftyp") return undefined;
  const size = b.readUInt32BE(0);
  const end = size >= 16 && size <= b.length ? size : Math.min(b.length, 64);
  const major = b.toString("latin1", 8, 12);
  const brands = new Set([major]);
  for (let i = 16; i + 4 <= end; i += 4)
    brands.add(b.toString("latin1", i, i + 4));
  if (brands.has("avif") || brands.has("avis")) return undefined;
  if ([...brands].some((x) => HEIC_BRANDS.has(x))) return "image/heic";
  if (major === "mif1" || major === "msf1") return "image/heif";
  return undefined;
}
/** Largest `ispe` (image spatial extents) box: the primary image, not a thumbnail. */
function heifDimensions(bytes: Buffer) {
  let best: { width: number; height: number } | undefined;
  for (
    let at = bytes.indexOf("ispe");
    at !== -1;
    at = bytes.indexOf("ispe", at + 4)
  ) {
    if (at < 4 || at + 16 > bytes.length) continue;
    if (bytes.readUInt32BE(at - 4) !== 20 || bytes.readUInt32BE(at + 4) !== 0)
      continue;
    const width = bytes.readUInt32BE(at + 8),
      height = bytes.readUInt32BE(at + 12);
    if (
      width > 0 &&
      height > 0 &&
      (!best || width * height > best.width * best.height)
    )
      best = { width, height };
  }
  return best;
}
export async function readSource(input: string) {
  const info = await stat(input).catch(() => {
    throw new PortraitError(
      "INPUT_NOT_FOUND",
      "Source file could not be read.",
    );
  });
  if (!info.isFile())
    throw new PortraitError("INVALID_INPUT", "Source must be a regular file.");
  if (info.size > MAX_SOURCE_BYTES)
    throw new PortraitError("FILE_TOO_LARGE", "Maximum source size is 20 MiB.");
  const bytes = await readFile(input);
  const source = await inspectBytes(bytes, path.basename(input));
  return { bytes, source };
}
export async function inspectBytes(bytes: Buffer, name = "photo") {
  if (bytes.length > MAX_SOURCE_BYTES)
    throw new PortraitError("FILE_TOO_LARGE", "Maximum source size is 20 MiB.");
  const heif = detectHeif(bytes);
  if (heif) {
    // HEIC/HEIF are passed through untouched; Sharp's prebuilt libvips cannot decode HEVC.
    const size = heifDimensions(bytes);
    if (!size)
      throw new PortraitError(
        "UNSUPPORTED_IMAGE",
        "This HEIC/HEIF file has no readable image size.",
      );
    if (size.width * size.height > MAX_SOURCE_PIXELS)
      throw new PortraitError(
        "INVALID_IMAGE",
        "Image could not be decoded or exceeds 40 megapixels.",
      );
    return { name, mime: heif, ...size };
  }
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes, {
      limitInputPixels: MAX_SOURCE_PIXELS,
      animated: false,
    }).metadata();
  } catch {
    throw new PortraitError(
      "INVALID_IMAGE",
      "Image could not be decoded or exceeds 40 megapixels.",
    );
  }
  if (
    !metadata.format ||
    !MIME[metadata.format] ||
    !metadata.width ||
    !metadata.height ||
    (metadata.pages && metadata.pages > 1)
  )
    throw new PortraitError(
      "UNSUPPORTED_IMAGE",
      "Use a single-frame JPEG, PNG or WebP (HEIC/HEIF only for US digital originals).",
    );
  const rotated = (metadata.orientation ?? 1) >= 5;
  return {
    name,
    mime: MIME[metadata.format],
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
  };
}
export async function inspectFile(input: string, presetId?: string) {
  const { bytes, source } = await readSource(input);
  return {
    ...source,
    bytes: bytes.length,
    ...(presetId
      ? {
          issues: originalChecks(
            { ...source, bytes: bytes.length },
            getPreset(presetId),
          ),
        }
      : {}),
  };
}
export async function saveFile(
  output: string,
  bytes: Uint8Array,
  overwrite = false,
  sourcePath?: string | (string | undefined)[],
) {
  const target = path.resolve(output);
  let parent: string;
  try {
    parent = await realpath(path.dirname(target));
  } catch {
    throw new PortraitError(
      "OUTPUT_DIRECTORY",
      "Output directory must already exist.",
    );
  }
  const finalPath = path.join(parent, path.basename(target));
  for (const source of [sourcePath].flat()) {
    if (!source) continue;
    let realSource: string;
    try {
      realSource = await realpath(source);
    } catch {
      continue;
    }
    let realTarget = finalPath;
    try {
      realTarget = await realpath(finalPath);
    } catch {}
    const [a, b] = await Promise.all([
      stat(realSource).catch(() => undefined),
      stat(finalPath).catch(() => undefined),
    ]);
    const sameFile = Boolean(
      a && b && a.ino !== 0 && a.ino === b.ino && a.dev === b.dev,
    );
    if (realTarget === realSource || sameFile)
      throw new PortraitError(
        "SOURCE_OVERWRITE",
        "The source or project file cannot be overwritten.",
      );
  }
  if (!overwrite) {
    let handle;
    try {
      handle = await open(finalPath, "wx");
      await handle.writeFile(bytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new PortraitError(
          "OUTPUT_EXISTS",
          "Output exists. Choose another path or explicitly allow overwrite.",
        );
      throw new PortraitError("OUTPUT_WRITE", "Could not write the output.");
    } finally {
      await handle?.close();
    }
  } else {
    const temp = path.join(parent, `.portraitpass-${randomUUID()}.tmp`);
    try {
      const handle = await open(temp, "wx");
      try {
        await handle.writeFile(bytes);
      } finally {
        await handle.close();
      }
      await rename(temp, finalPath);
    } catch {
      await unlink(temp).catch(() => {});
      throw new PortraitError("OUTPUT_WRITE", "Could not write the output.");
    }
  }
  return finalPath;
}
export async function loadProject(projectPath: string): Promise<Project> {
  const info = await stat(projectPath).catch(() => {
    throw new PortraitError(
      "PROJECT_NOT_FOUND",
      "Project file could not be read.",
    );
  });
  if (!info.isFile())
    throw new PortraitError(
      "INVALID_PROJECT",
      "Project must be a regular file.",
    );
  if (info.size > MAX_PROJECT_BYTES)
    throw new PortraitError("PROJECT_TOO_LARGE", "Project exceeds 60 MB.");
  const text = await readFile(projectPath, "utf8").catch(() => {
    throw new PortraitError(
      "PROJECT_NOT_FOUND",
      "Project file could not be read.",
    );
  });
  return parseProject(text);
}
export async function sourceForProject(project: Project, input?: string) {
  const result = input
    ? await readSource(input)
    : project.source.dataUrl
      ? {
          bytes: Buffer.from(
            project.source.dataUrl.split(",")[1] ?? "",
            "base64",
          ),
          source: await inspectBytes(
            Buffer.from(project.source.dataUrl.split(",")[1] ?? "", "base64"),
            project.source.name,
          ),
        }
      : undefined;
  if (!result)
    throw new PortraitError(
      "SOURCE_REQUIRED",
      "Provide an input path or an embedded project source.",
    );
  if (
    result.source.width !== project.source.width ||
    result.source.height !== project.source.height ||
    result.source.mime !== project.source.mime
  )
    throw new PortraitError(
      "SOURCE_MISMATCH",
      "Decoded image dimensions/type do not match the project.",
    );
  return result.bytes;
}
const backgroundWarning = (preset: Preset): string =>
  core.backgroundWarning(preset) ?? "";
const xmlEscape = (text: string) =>
  text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
function backgroundXmp(preset: Preset) {
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(`${BACKGROUND_NOTE} (${preset.id})`)}</rdf:li></rdf:Alt></dc:description><xmp:CreatorTool>PortraitPass</xmp:CreatorTool></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
}
export async function renderBuffer(
  bytes: Buffer,
  project: Project,
  sheet = false,
): Promise<{ bytes: Buffer; details: Record<string, unknown> }> {
  // Before validateProject, so the message is the stable, friendly one.
  assertHeifAllowed(project.source.mime, project.presetId);
  const validation = validateProject(project);
  if (validation.issues.length)
    throw new PortraitError(
      validation.issues[0]!.code,
      validation.issues.map((i) => i.message).join(" "),
    );
  const decoded = await inspectBytes(bytes);
  if (
    decoded.width !== project.source.width ||
    decoded.height !== project.source.height ||
    decoded.mime !== project.source.mime
  )
    throw new PortraitError(
      "SOURCE_MISMATCH",
      "Source metadata does not match decoded pixels.",
    );
  const preset = projectPreset(project);
  if (preset.mode === "original") {
    if (sheet)
      throw new PortraitError(
        "ORIGINAL_ONLY",
        "Original images cannot be printed as a sheet.",
      );
    if (project.background.enabled)
      throw new PortraitError(
        "BACKGROUND_FORBIDDEN",
        "Digital originals are exported unchanged; background replacement is not available.",
      );
    const issues = originalChecks({ ...decoded, bytes: bytes.length }, preset);
    if (issues.length) throw new OriginalNotAcceptedError(preset, issues);
    return {
      bytes,
      details: {
        original: true,
        byteLength: bytes.length,
        issues,
        checks: measurementChecks(
          preset,
          project.crop,
          undefined,
          decoded,
          project.dpi,
        ),
        warnings: [] as string[],
      },
    };
  }
  // Same blocking set as the browser's exportPhoto: crop outside the source,
  // aspect mismatch, and not enough pixels. Landmarks are deliberately not passed:
  // head height and eye line are measurements, never blockers.
  const issues = cropIssues(
    project.crop,
    decoded.width,
    decoded.height,
    preset,
    project.dpi,
  );
  if (issues.length)
    throw new PortraitError(
      issues[0]!.code,
      issues.map((i) => i.message).join(" "),
    );
  const checks = measurementChecks(
    preset,
    project.crop,
    project.landmarks,
    decoded,
    project.dpi,
  );
  let renderSource = bytes;
  const backgroundReplaced = project.background.enabled;
  const warnings: string[] = [
    ...(backgroundReplaced && preset.backgroundEdit === "forbidden"
      ? [backgroundWarning(preset)]
      : []),
    ...checks
      .filter((c) => c.status === "fail" && c.id !== "resolution")
      .map((c) => c.message),
  ];
  if (project.background.enabled) {
    if (!project.background.maskDataUrl)
      throw new PortraitError(
        "MASK_REQUIRED",
        "Background replacement needs a saved segmentation mask from the browser.",
      );
    const maskBytes = Buffer.from(
      project.background.maskDataUrl.split(",")[1] ?? "",
      "base64",
    );
    let maskMeta: sharp.Metadata;
    try {
      maskMeta = await sharp(maskBytes, {
        limitInputPixels: MAX_SOURCE_PIXELS,
      }).metadata();
    } catch {
      throw new PortraitError("INVALID_MASK", "Mask could not be decoded.");
    }
    if (
      maskMeta.format !== "png" ||
      maskMeta.width !== decoded.width ||
      maskMeta.height !== decoded.height ||
      !maskMeta.hasAlpha
    )
      throw new PortraitError(
        "INVALID_MASK",
        "Mask must be a PNG with alpha at the oriented source dimensions.",
      );
    const oriented = await sharp(bytes, { limitInputPixels: MAX_SOURCE_PIXELS })
      .rotate()
      .ensureAlpha()
      .png()
      .toBuffer();
    const masked = await sharp(oriented)
      .composite([{ input: maskBytes, blend: "dest-in" }])
      .png()
      .toBuffer();
    renderSource = await sharp(masked)
      .flatten({ background: project.background.color })
      .png()
      .toBuffer();
  }
  const size = outputSize(preset, project.dpi);
  const c = project.crop;
  const x = Math.floor(c.x),
    y = Math.floor(c.y),
    w = Math.min(decoded.width - x, Math.ceil(c.width)),
    h = Math.min(decoded.height - y, Math.ceil(c.height));
  const photo = await sharp(renderSource, {
    limitInputPixels: MAX_SOURCE_PIXELS,
  })
    .rotate()
    .extract({ left: x, top: y, width: w, height: h })
    .resize(size.width, size.height, {
      fit: "cover",
      kernel: "lanczos3",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  if (preset.mode === "print") {
    const stats = await sharp(photo).stats();
    if (stats.channels.length === 4 && stats.channels[3].min < 255)
      throw new PortraitError(
        "TRANSPARENT_PHOTO",
        "Use an original photo with an opaque, natural background.",
      );
  }
  const opaquePhoto = await sharp(photo)
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const layout = sheet
    ? layoutSheet(preset, project.paperId, project.dpi)
    : undefined;
  if (project.format === "pdf") {
    const pdf = await PDFDocument.create();
    pdf.setTitle("PortraitPass photo print");
    pdf.setSubject(INDEPENDENCE_NOTE);
    pdf.setKeywords([
      "PortraitPass",
      "passport photo",
      INDEPENDENCE_NOTE,
      ...(backgroundReplaced ? [BACKGROUND_NOTE] : []),
    ]);
    pdf.setCreator(INDEPENDENCE_NOTE);
    pdf.setProducer("PortraitPass");
    const widthMm = layout?.widthMm ?? preset.widthMm,
      heightMm = layout?.heightMm ?? preset.heightMm;
    const page = pdf.addPage([mmToPoints(widthMm), mmToPoints(heightMm)]),
      image = await pdf.embedPng(opaquePhoto);
    const toPoints = (px: number) => (px * 72) / project.dpi;
    if (layout) {
      for (const p of layout.placements)
        page.drawImage(image, {
          x: toPoints(p.x),
          y: mmToPoints(heightMm) - toPoints(p.y) - mmToPoints(preset.heightMm),
          width: mmToPoints(preset.widthMm),
          height: mmToPoints(preset.heightMm),
        });
      for (const m of layout.cutMarks)
        page.drawLine({
          start: {
            x: toPoints(m.x1),
            y: mmToPoints(heightMm) - toPoints(m.y1),
          },
          end: { x: toPoints(m.x2), y: mmToPoints(heightMm) - toPoints(m.y2) },
          thickness: 0.25,
          color: rgb(0.4, 0.4, 0.4),
        });
    } else
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: mmToPoints(widthMm),
        height: mmToPoints(heightMm),
      });
    return {
      bytes: Buffer.from(await pdf.save()),
      details: {
        format: "pdf",
        widthMm,
        heightMm,
        count: layout?.placements.length ?? 1,
        layout,
        backgroundReplaced,
        checks,
        warnings,
      },
    };
  }
  let pipeline = sharp(opaquePhoto);
  if (layout) {
    const marks = `<svg width="${layout.width}" height="${layout.height}"><g stroke="#777" stroke-width="1">${layout.cutMarks.map((m) => `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}"/>`).join("")}</g></svg>`;
    pipeline = sharp({
      create: {
        width: layout.width,
        height: layout.height,
        channels: 3,
        background: "#ffffff",
      },
    }).composite([
      ...layout.placements.map((p) => ({
        input: opaquePhoto,
        left: p.x,
        top: p.y,
      })),
      { input: Buffer.from(marks), left: 0, top: 0 },
    ]);
  }
  pipeline = pipeline.withMetadata({ density: project.dpi });
  if (backgroundReplaced) pipeline = pipeline.withXmp(backgroundXmp(preset));
  const result =
    project.format === "png"
      ? await pipeline.png().toBuffer()
      : await pipeline
          .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
          .toBuffer();
  return {
    bytes: result,
    details: {
      format: project.format,
      width: layout?.width ?? size.width,
      height: layout?.height ?? size.height,
      dpi: project.dpi,
      count: layout?.placements.length ?? 1,
      layout,
      backgroundReplaced,
      checks,
      warnings,
    },
  };
}
export async function prepareProject(
  input: string,
  presetId = "us-passport",
  embed = false,
) {
  const { bytes, source: decoded } = await readSource(input);
  assertHeifAllowed(decoded.mime, presetId);
  const source: SourceImage = { ...decoded };
  if (embed)
    source.dataUrl = `data:${source.mime};base64,${bytes.toString("base64")}`;
  return createProject(source, presetId);
}
const OUTPUT_EXT_FORMAT: Record<string, Project["format"]> = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".pdf": "pdf",
};
const UNSUPPORTED_OUTPUT_EXT = new Set([
  ".webp",
  ".gif",
  ".tif",
  ".tiff",
  ".bmp",
  ".avif",
  ".heic",
  ".heif",
  ".svg",
]);
const ORIGINAL_EXT: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic", ".heif"],
  "image/heif": [".heic", ".heif"],
};
function extensionMismatch(ext: string, detail: string) {
  return new PortraitError(
    "FORMAT_EXTENSION_MISMATCH",
    `Output extension ${ext} ${detail}`,
  );
}
/** Output format: --format, else the output extension, else the project's own format. */
function resolveFormat(
  project: Project,
  preset: Preset,
  output: string,
  explicit?: Project["format"],
) {
  const ext = path.extname(output).toLowerCase();
  if (preset.mode === "original") {
    // Original bytes are copied unchanged, so the extension must describe them.
    const allowed = ORIGINAL_EXT[project.source.mime] ?? [];
    if (
      ext &&
      (Object.keys(OUTPUT_EXT_FORMAT).includes(ext) ||
        UNSUPPORTED_OUTPUT_EXT.has(ext)) &&
      !allowed.includes(ext)
    )
      throw extensionMismatch(
        ext,
        `does not match the original ${project.source.mime} file that is copied unchanged.`,
      );
    return explicit ?? project.format;
  }
  const inferred = OUTPUT_EXT_FORMAT[ext];
  if (explicit && explicit !== "original" && inferred && explicit !== inferred)
    throw extensionMismatch(
      ext,
      `does not match --format ${explicit}. Use a matching extension or drop --format.`,
    );
  if (!explicit && !inferred && UNSUPPORTED_OUTPUT_EXT.has(ext))
    throw extensionMismatch(
      ext,
      "is not an output format. Use .jpg, .png or .pdf.",
    );
  return explicit ?? inferred ?? project.format;
}
export async function renderFile(args: {
  input?: string;
  projectPath?: string;
  presetId?: string;
  output: string;
  format?: Project["format"];
  paperId?: string;
  dpi?: number;
  crop?: Project["crop"];
  overwrite?: boolean;
  sheet?: boolean;
}) {
  let project = args.projectPath
    ? await loadProject(args.projectPath)
    : args.input
      ? await prepareProject(args.input, args.presetId)
      : undefined;
  if (!project)
    throw new PortraitError("SOURCE_REQUIRED", "Provide --input or --project.");
  if (args.projectPath && args.presetId && args.presetId !== project.presetId)
    throw new PortraitError(
      "PRESET_PROJECT_CONFLICT",
      `--preset ${args.presetId} conflicts with the project's preset ${project.presetId}. Drop --preset or save a new project for that document.`,
    );
  project.format = resolveFormat(
    project,
    projectPreset(project),
    args.output,
    args.format,
  );
  // Argument > project value > default. Only explicit arguments override the project.
  if (args.paperId) project.paperId = args.paperId;
  if (args.dpi !== undefined) project.dpi = args.dpi;
  if (args.crop) project.crop = args.crop;
  const bytes = await sourceForProject(project, args.input);
  const rendered = await renderBuffer(
    bytes,
    project,
    args.sheet ?? project.outputKind === "sheet",
  );
  const output = await saveFile(args.output, rendered.bytes, args.overwrite, [
    args.input,
    args.projectPath,
  ]);
  return { output, byteLength: rendered.bytes.length, ...rendered.details };
}
