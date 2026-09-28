import { getPreset, getPaper } from "./presets.js";
import { cropIssues, defaultCrop } from "./geometry.js";
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
  return preset.mode === "general" && project.customSize
    ? {
        ...preset,
        widthMm: project.customSize.widthMm,
        heightMm: project.customSize.heightMm,
      }
    : preset;
}
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
      !["image/jpeg", "image/png", "image/webp"].includes(s.mime) ||
      ![s.width, s.height].every((n) => Number.isSafeInteger(n) && n > 0) ||
      s.width * s.height > MAX_SOURCE_PIXELS
    )
      fail(
        "INVALID_SOURCE",
        "Source must be a JPEG, PNG or WebP of at most 40 megapixels.",
      );
    if (
      s.dataUrl !== undefined &&
      (typeof s.dataUrl !== "string" ||
        s.dataUrl.length > Math.ceil((MAX_SOURCE_BYTES * 4) / 3) + 100 ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]*={0,2}$/.test(
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
  if (
    p.background?.maskDataUrl !== undefined &&
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
  if (preset && p.background?.enabled && preset.mode !== "general")
    fail(
      "BACKGROUND_FORBIDDEN",
      "Background changes are restricted to General ID.",
    );
  if (p.customSize !== undefined) {
    if (
      preset?.mode !== "general" ||
      !p.customSize ||
      ![p.customSize.widthMm, p.customSize.heightMm].every(
        (n) => Number.isFinite(n) && n >= 10,
      ) ||
      p.customSize.widthMm > 100 ||
      p.customSize.heightMm > 150
    )
      fail(
        "INVALID_CUSTOM_SIZE",
        "Custom dimensions are available only for General ID: 10–100 mm wide and 10–150 mm high.",
      );
    else if (preset)
      preset = {
        ...preset,
        widthMm: p.customSize.widthMm,
        heightMm: p.customSize.heightMm,
      };
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
      !Object.values(l).every(Number.isFinite) ||
      ![l.centerX, l.crownY, l.chinY, l.eyesY].every(Number.isFinite) ||
      l.centerX < 0 ||
      l.centerX > p.source?.width ||
      l.crownY < 0 ||
      l.chinY > p.source?.height ||
      l.crownY >= l.eyesY ||
      l.eyesY >= l.chinY
    )
      fail(
        "INVALID_LANDMARKS",
        "Landmarks must be inside the source, with crown, eyes, chin in order.",
      );
  }
  return {
    valid: issues.length === 0,
    issues,
    ...(issues.length === 0
      ? { project: JSON.parse(JSON.stringify(p)) as Project }
      : {}),
  };
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
export function originalIssues(
  source: { width: number; height: number; mime: string; bytes: number },
  preset: Preset,
): Issue[] {
  const issues: Issue[] = [];
  if (preset.minBytes && source.bytes < preset.minBytes)
    issues.push({
      code: "FILE_TOO_SMALL",
      message: `The official minimum is ${preset.minBytes / 1000} KB. Keep the original capture.`,
    });
  if (preset.maxBytes && source.bytes > preset.maxBytes)
    issues.push({
      code: "FILE_TOO_LARGE",
      message:
        "The official upload limit is 10 MB. Choose a different original capture.",
    });
  if (
    (preset.minWidth && source.width < preset.minWidth) ||
    (preset.minHeight && source.height < preset.minHeight)
  )
    issues.push({
      code: "LOW_RESOLUTION",
      message: `The official minimum is ${preset.minWidth} × ${preset.minHeight} pixels.`,
    });
  if (preset.mimeTypes && !preset.mimeTypes.includes(source.mime))
    issues.push({
      code: "UNSUPPORTED_ORIGINAL",
      message: "This destination needs the original JPEG or PNG capture.",
    });
  return issues;
}
