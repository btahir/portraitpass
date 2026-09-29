import { getPreset, getPaper } from "./presets.js";
import {
  cropIssues,
  defaultCrop,
  landmarksValid,
  LANDMARK_ORDER_MESSAGE,
} from "./geometry.js";
import {
  PortraitError,
  type Issue,
  type Project,
  type SourceImage,
  type Preset,
} from "./types.js";
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 60 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 40_000_000;
export function projectPreset(project: Project): Preset {
  const preset = getPreset(project.presetId);
  // Only the two dimensions are ever read from customSize; no other field can reach the preset.
  const size = project.customSize;
  return preset.mode === "general" && size
    ? { ...preset, widthMm: size.widthMm, heightMm: size.heightMm }
    : preset;
}
/** Plain warning when the issuing authority does not accept digitally altered photos. */
export function backgroundWarning(preset: Preset): string | null {
  return preset.backgroundEdit === "forbidden"
    ? "The issuing authority for this document does not accept digitally altered photos. Retake against a plain light wall instead; a replaced background may be refused."
    : null;
}
const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};
const SOURCE_MIMES = Object.keys(MIME_LABELS);
const PASSTHROUGH_MIMES = ["image/heic", "image/heif"];
export function createProject(
  source: SourceImage,
  presetId = "us-passport",
): Project {
  const preset = getPreset(presetId);
  return {
    version: 1,
    presetId,
    source: { ...source },
    crop: defaultCrop(source.width, source.height, preset),
    dpi: 300,
    paperId: "4x6",
    format: preset.mode === "original" ? "original" : "jpeg",
    background: { enabled: false, color: "#ffffff", tolerance: 32 },
  };
}
export function validateProject(value: unknown): {
  valid: boolean;
  issues: Issue[];
  project?: Project;
} {
  const issues: Issue[] = [];
  const fail = (code: string, message: string) =>
    issues.push({ code, message });
  if (!value || typeof value !== "object" || Array.isArray(value))
    return {
      valid: false,
      issues: [
        { code: "INVALID_PROJECT", message: "Expected a project object." },
      ],
    };
  const p = value as Project;
  if (p.outputKind !== undefined && !["single", "sheet"].includes(p.outputKind))
    fail("INVALID_OUTPUT_KIND", "Output kind must be single or sheet.");
  if (p.version !== 1)
    fail(
      "PROJECT_VERSION",
      "Only PortraitPass project version 1 is supported.",
    );
  let preset: Preset | undefined;
  try {
    preset = getPreset(p.presetId);
  } catch {
    fail("INVALID_PRESET", "Unknown document preset.");
  }
  try {
    getPaper(p.paperId);
  } catch {
    fail("INVALID_PAPER", "Unknown paper format.");
  }
  if (!Number.isFinite(p.dpi) || p.dpi < 72 || p.dpi > 600)
    fail("INVALID_DPI", "DPI must be between 72 and 600.");
  if (!["jpeg", "png", "pdf", "original"].includes(p.format))
    fail("INVALID_FORMAT", "Unknown export format.");
  if (!p.source || typeof p.source !== "object")
    fail("INVALID_SOURCE", "Source image is required.");
  else {
    const s = p.source;
    if (
      typeof s.name !== "string" ||
      s.name.length > 255 ||
      !SOURCE_MIMES.includes(s.mime) ||
      ![s.width, s.height].every((n) => Number.isSafeInteger(n) && n > 0) ||
      s.width * s.height > MAX_SOURCE_PIXELS
    )
      fail(
        "INVALID_SOURCE",
        "Source must be a JPEG, PNG or WebP of at most 40 megapixels (HEIC or HEIF for digital originals).",
      );
    else if (
      PASSTHROUGH_MIMES.includes(s.mime) &&
      preset &&
      preset.mode !== "original"
    )
      fail(
        "INVALID_SOURCE",
        "HEIC and HEIF photos can only be used for digital original documents. Convert to JPEG or PNG for print preparation.",
      );
    if (
      s.dataUrl !== undefined &&
      (typeof s.dataUrl !== "string" ||
        s.dataUrl.length > Math.ceil((MAX_SOURCE_BYTES * 4) / 3) + 100 ||
        !/^data:image\/(jpeg|png|webp|heic|heif);base64,[A-Za-z0-9+/]*={0,2}$/.test(
          s.dataUrl,
        ) ||
        !s.dataUrl.startsWith(`data:${s.mime};base64,`))
    )
      fail(
        "INVALID_SOURCE_DATA",
        "Embedded source must be a valid supported base64 image, at most 20 MiB.",
      );
  }
  if (
    !p.background ||
    typeof p.background.enabled !== "boolean" ||
    typeof p.background.color !== "string" ||
    !/^#[0-9a-fA-F]{6}$/.test(p.background.color) ||
    !Number.isFinite(p.background.tolerance) ||
    p.background.tolerance < 0 ||
    p.background.tolerance > 100
  )
    fail("INVALID_BACKGROUND", "Background settings are invalid.");
  // A mask is only kept while background replacement is on; otherwise it is dropped below.
  if (
    p.background?.enabled === true &&
    p.background.maskDataUrl !== undefined &&
    (typeof p.background.maskDataUrl !== "string" ||
      p.background.maskDataUrl.length > 20_000_000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/]*={0,2}$/.test(
        p.background.maskDataUrl,
      ))
  )
    fail(
      "INVALID_MASK",
      "Background mask must be a PNG data URL, at most 15 MB.",
    );
  if (preset && p.background?.enabled === true && preset.mode === "original")
    fail(
      "BACKGROUND_FORBIDDEN",
      "Digital original documents are exported unchanged; the background cannot be replaced.",
    );
  if (p.customSize !== undefined) {
    const c = p.customSize as unknown;
    const keys =
      c && typeof c === "object" && !Array.isArray(c) ? Object.keys(c) : [];
    const size = c as { widthMm: number; heightMm: number };
    if (
      preset?.mode !== "general" ||
      keys.length !== 2 ||
      !keys.includes("widthMm") ||
      !keys.includes("heightMm") ||
      ![size.widthMm, size.heightMm].every(
        (n) => typeof n === "number" && Number.isFinite(n) && n >= 10,
      ) ||
      size.widthMm > 100 ||
      size.heightMm > 150
    )
      fail(
        "INVALID_CUSTOM_SIZE",
        "Custom dimensions are available only for General ID: exactly widthMm and heightMm, 10–100 mm wide and 10–150 mm high.",
      );
    else if (preset)
      preset = { ...preset, widthMm: size.widthMm, heightMm: size.heightMm };
  }
  if (preset?.mode === "original" && p.outputKind === "sheet")
    fail("ORIGINAL_ONLY", "Digital originals cannot be print sheets.");
  if (preset?.mode === "original" && p.format !== "original")
    fail(
      "ORIGINAL_ONLY",
      "Digital original presets export unchanged source bytes only.",
    );
  if (preset?.mode !== "original" && p.format === "original")
    fail("INVALID_FORMAT", "Choose JPEG, PNG or PDF for print preparation.");
  if (!p.crop || typeof p.crop !== "object")
    fail("INVALID_CROP", "Crop is required.");
  else if (
    preset &&
    p.source &&
    Number.isFinite(p.dpi) &&
    p.dpi >= 72 &&
    p.dpi <= 600
  ) {
    try {
      issues.push(
        ...cropIssues(
          p.crop,
          p.source.width,
          p.source.height,
          preset,
          p.dpi,
        ).filter((i) => i.code !== "LOW_RESOLUTION"),
      );
    } catch {
      fail("INVALID_CROP", "Crop dimensions are invalid.");
    }
    if (
      preset.mode === "original" &&
      (p.crop.x !== 0 ||
        p.crop.y !== 0 ||
        p.crop.width !== p.source.width ||
        p.crop.height !== p.source.height)
    )
      fail(
        "ORIGINAL_ONLY",
        "Digital original projects must keep the complete source photo.",
      );
  }
  if (p.landmarks !== undefined) {
    const l = p.landmarks;
    if (
      !l ||
      typeof l !== "object" ||
      !p.source ||
      !landmarksValid(l, p.source.width, p.source.height)
    )
      fail(
        "INVALID_LANDMARKS",
        `Landmarks must be inside the source. ${LANDMARK_ORDER_MESSAGE}`,
      );
  }
  if (issues.length > 0) return { valid: false, issues };
  // Rebuild from known fields only, so nothing unexpected survives in the project.
  const clean: Project = {
    version: 1,
    ...(p.outputKind !== undefined ? { outputKind: p.outputKind } : {}),
    presetId: p.presetId,
    source: {
      name: p.source.name,
      mime: p.source.mime,
      width: p.source.width,
      height: p.source.height,
      ...(p.source.dataUrl !== undefined ? { dataUrl: p.source.dataUrl } : {}),
    },
    crop: {
      x: p.crop.x,
      y: p.crop.y,
      width: p.crop.width,
      height: p.crop.height,
    },
    ...(p.landmarks !== undefined
      ? {
          landmarks: {
            centerX: p.landmarks.centerX,
            crownY: p.landmarks.crownY,
            chinY: p.landmarks.chinY,
            eyesY: p.landmarks.eyesY,
          },
        }
      : {}),
    dpi: p.dpi,
    paperId: p.paperId,
    format: p.format,
    background: {
      color: p.background.color,
      enabled: p.background.enabled,
      tolerance: p.background.tolerance,
      // Segmentation masks are kept only while background replacement is on.
      ...(p.background.enabled && p.background.maskDataUrl !== undefined
        ? { maskDataUrl: p.background.maskDataUrl }
        : {}),
    },
    ...(p.customSize !== undefined
      ? {
          customSize: {
            widthMm: p.customSize.widthMm,
            heightMm: p.customSize.heightMm,
          },
        }
      : {}),
  };
  return { valid: true, issues, project: clean };
}
export function parseProject(text: string): Project {
  if (text.length > MAX_PROJECT_BYTES)
    throw new PortraitError("PROJECT_TOO_LARGE", "Project file exceeds 60 MB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PortraitError("INVALID_PROJECT", "Project is not valid JSON.");
  }
  const result = validateProject(value);
  if (!result.project)
    throw new PortraitError(
      result.issues[0]?.code ?? "INVALID_PROJECT",
      result.issues.map((i) => i.message).join(" "),
    );
  return result.project;
}
function formatBytes(n: number) {
  return n >= 1_000_000 ? `${n / 1_000_000} MB` : `${n / 1000} KB`;
}
export function originalIssues(
  source: { width: number; height: number; mime: string; bytes: number },
  preset: Preset,
): Issue[] {
  const issues: Issue[] = [];
  if (preset.minBytes && source.bytes < preset.minBytes)
    issues.push({
      code: "FILE_TOO_SMALL",
      message: `This destination asks for at least ${formatBytes(preset.minBytes)}. Keep the original capture.`,
    });
  if (preset.maxBytes && source.bytes > preset.maxBytes)
    issues.push({
      code: "FILE_TOO_LARGE",
      message: `This destination accepts files up to ${formatBytes(preset.maxBytes)}. Choose a different original capture.`,
    });
  if (
    (preset.minWidth && source.width < preset.minWidth) ||
    (preset.minHeight && source.height < preset.minHeight)
  )
    issues.push({
      code: "LOW_RESOLUTION",
      message: `This destination asks for at least ${preset.minWidth ?? "any"} × ${preset.minHeight ?? "any"} pixels.`,
    });
  if (preset.mimeTypes && !preset.mimeTypes.includes(source.mime)) {
    const labels = preset.mimeTypes.map((m) => MIME_LABELS[m] ?? m);
    const list =
      labels.length > 1
        ? `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`
        : (labels[0] ?? "");
    issues.push({
      code: "UNSUPPORTED_ORIGINAL",
      message: `This destination accepts ${list} files; this photo is ${MIME_LABELS[source.mime] ?? source.mime}.`,
    });
  }
  return issues;
}
