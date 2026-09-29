export type Mode = "print" | "original" | "general";
/** What the issuing authority says about editing the background. */
export type BackgroundEditPolicy = "forbidden" | "unspecified" | "allowed";
export interface Preset {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  headMinMm?: number;
  headMaxMm?: number;
  /** Eye line measured up from the bottom edge of the photo, in mm. */
  eyeMinMm?: number;
  eyeMaxMm?: number;
  /** Background editing rule from the published source. Original mode never edits. */
  backgroundEdit: BackgroundEditPolicy;
  /** Short capture/print notes shown beside the preset (plain facts, no guarantees). */
  notes?: string[];
  sourceUrl: string;
  checkedAt: string;
  mode: Mode;
  editingPolicy: string;
  minBytes?: number;
  maxBytes?: number;
  minWidth?: number;
  minHeight?: number;
  mimeTypes?: string[];
}
export interface Paper {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}
export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Landmarks {
  centerX: number;
  crownY: number;
  chinY: number;
  eyesY: number;
}
export interface SourceImage {
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
  width: number;
  height: number;
  dataUrl?: string;
}
export interface Background {
  color: string;
  enabled: boolean;
  tolerance: number;
  maskDataUrl?: string;
}
export type OutputFormat = "jpeg" | "png" | "pdf" | "original";
export interface Project {
  version: 1;
  outputKind?: "single" | "sheet";
  presetId: string;
  source: SourceImage;
  crop: Crop;
  landmarks?: Landmarks;
  dpi: number;
  paperId: string;
  format: OutputFormat;
  background: Background;
  customSize?: { widthMm: number; heightMm: number };
  /** Sheet layout style. Omitted means the default for the paper (edge-to-edge on 4x6, cut marks otherwise). */
  sheetStyle?: SheetStyle;
  /** Sheet paper orientation. Omitted means "auto" (whichever fits more photos). */
  sheetOrientation?: SheetOrientation;
}
/**
 * "cut-marks": 3 mm margins and gaps with corner marks outside every photo (home printer).
 * "edge-to-edge": photos tile the paper with no margins or gaps and thin guides on shared edges (photo-lab print).
 */
export type SheetStyle = "cut-marks" | "edge-to-edge";
export type SheetOrientation = "auto" | "portrait" | "landscape";
export interface SheetOptions {
  style?: SheetStyle;
  orientation?: SheetOrientation;
}
/** Exact digital export: pixel size plus an optional file-size range, JPEG only. */
export interface DigitalTarget {
  widthPx: number;
  heightPx: number;
  minKB?: number;
  maxKB?: number;
  /** Bytes in one "KB" for the min/max: 1024 (default) or 1000. */
  kbBytes?: 1000 | 1024;
  format: "jpeg";
}
export interface CutMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface SheetLayout {
  width: number;
  height: number;
  dpi: number;
  widthMm: number;
  heightMm: number;
  placements: Crop[];
  cutMarks: CutMark[];
  columns: number;
  rows: number;
  /** Resolved paper orientation. width/height/widthMm/heightMm already describe the oriented page. */
  orientation: "portrait" | "landscape";
  /** Resolved style. Edge-to-edge marks are thin guides on shared edges; cut-marks are corner marks. */
  style: SheetStyle;
}
export interface Issue {
  code: string;
  message: string;
}
export class PortraitError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "PortraitError";
  }
}
