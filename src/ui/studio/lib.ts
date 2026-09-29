import {
  documentPreset,
  getDocumentById,
  presetForId,
  type DocumentSpec,
  type Landmarks,
  type Preset,
} from "../../core/index";

/** Only width and height ever come from the custom size. */
export function withCustomSize(
  p: Preset,
  size: { widthMm: number; heightMm: number },
): Preset {
  return p.mode === "general"
    ? { ...p, widthMm: size.widthMm, heightMm: size.heightMm }
    : p;
}

export interface Resolved {
  doc?: DocumentSpec;
  /** Undefined when the document can't be made at home. */
  preset?: Preset;
  notDiy: boolean;
}

/** A document id (or a legacy preset id) to the document and the frame the studio uses for it. */
export function resolveDocument(id: string): Resolved {
  const doc = getDocumentById(id);
  if (doc) {
    const preset = doc.diy === "no" ? undefined : documentPreset(doc);
    return { doc, preset, notDiy: !preset };
  }
  const preset = presetForId(id);
  if (preset) return { preset, notDiy: false };
  return resolveDocument("us-passport");
}

/** Saved projects only know the classic preset ids; map document ids back to them. */
const PROJECT_ID: Record<string, string> = {
  "us-passport-online": "us-online",
  "uk-passport-online": "uk-online",
};
export const projectPreset = (preset: Preset): Preset =>
  PROJECT_ID[preset.id] ? { ...preset, id: PROJECT_ID[preset.id]! } : preset;

export function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try another photo.";
}

/** Keep crown < eyes < chin, at least 1% of the photo apart, inside the photo. `moved` wins. */
export function orderLandmarks(
  l: Landmarks,
  height: number,
  moved: "crownY" | "eyesY" | "chinY" | null = null,
): Landmarks {
  const gap = height * 0.01;
  let { crownY, eyesY, chinY } = l;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  if (moved === "crownY") {
    crownY = clamp(crownY, 0, height - 2 * gap);
    eyesY = Math.max(eyesY, crownY + gap);
    chinY = Math.max(chinY, eyesY + gap);
  } else if (moved === "chinY") {
    chinY = clamp(chinY, 2 * gap, height);
    eyesY = Math.min(eyesY, chinY - gap);
    crownY = Math.min(crownY, eyesY - gap);
  }
  eyesY = clamp(eyesY, gap, height - gap);
  crownY = clamp(Math.min(crownY, eyesY - gap), 0, height);
  chinY = clamp(Math.max(chinY, eyesY + gap), 0, height);
  return { ...l, crownY, eyesY, chinY };
}

/** Rough head positions for a photo nobody has measured. Never shown as measurements. */
export function roughLandmarks(width: number, height: number): Landmarks {
  return {
    centerX: width / 2,
    crownY: height * 0.18,
    eyesY: height * 0.36,
    chinY: height * 0.63,
  };
}

const NOTICE_KEY = "portraitpass:face-notice";
/** Whether this browser has already shown the one-line face detection notice. */
export function faceNoticeSeen(): boolean {
  try {
    return window.localStorage.getItem(NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}
export function rememberFaceNotice() {
  try {
    window.localStorage.setItem(NOTICE_KEY, "1");
  } catch {
    /* Storage is blocked: the notice shows again next time, which is fine. */
  }
}

/** "2026-09-28" to "28 Sep 2026". */
export function checkedOn(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

export const sameCrop = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
