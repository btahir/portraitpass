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
  originalIssues,
  mmToPoints,
  type Project,
  type SourceImage,
} from "../core/index.js";
const MIME: Record<string, SourceImage["mime"]> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
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
      "Use a single-frame JPEG, PNG or WebP.",
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
          issues: originalIssues(
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
  sourcePath?: string,
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
  if (sourcePath) {
    const realSource = await realpath(sourcePath);
    let realTarget = finalPath;
    try {
      realTarget = await realpath(finalPath);
    } catch {}
    if (realTarget === realSource)
      throw new PortraitError(
        "SOURCE_OVERWRITE",
        "The source file cannot be overwritten.",
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
  const info = await stat(projectPath);
  if (info.size > MAX_PROJECT_BYTES)
    throw new PortraitError("PROJECT_TOO_LARGE", "Project exceeds 60 MB.");
  return parseProject(await readFile(projectPath, "utf8"));
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
export async function renderBuffer(
  bytes: Buffer,
  project: Project,
  sheet = false,
): Promise<{ bytes: Buffer; details: Record<string, unknown> }> {
  const validation = validateProject(project);
  if (!validation.valid)
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
    return {
      bytes,
      details: {
        original: true,
        byteLength: bytes.length,
        issues: originalIssues({ ...decoded, bytes: bytes.length }, preset),
      },
    };
  }
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
  let renderSource = bytes;
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
    },
  };
}
export async function prepareProject(
  input: string,
  presetId = "us-passport",
  embed = false,
) {
  const { bytes, source: decoded } = await readSource(input);
  const source: SourceImage = { ...decoded };
  if (embed)
    source.dataUrl = `data:${source.mime};base64,${bytes.toString("base64")}`;
  return createProject(source, presetId);
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
  if (args.format) project.format = args.format;
  if (args.paperId) project.paperId = args.paperId;
  if (args.dpi !== undefined) project.dpi = args.dpi;
  if (args.crop) project.crop = args.crop;
  const bytes = await sourceForProject(project, args.input);
  const rendered = await renderBuffer(
    bytes,
    project,
    args.sheet ?? project.outputKind === "sheet",
  );
  const output = await saveFile(
    args.output,
    rendered.bytes,
    args.overwrite,
    args.input ?? args.projectPath,
  );
  return { output, byteLength: rendered.bytes.length, ...rendered.details };
}
