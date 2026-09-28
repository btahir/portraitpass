export type Mode = "print" | "original" | "general";
export interface Preset {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  headMinMm?: number;
  headMaxMm?: number;
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
  mime: "image/jpeg" | "image/png" | "image/webp";
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
