import type { Crop } from "./types.js";

/**
 * Measure-only photo analysis: background evenness, shadow, colour, face lighting, exposure and sharpness.
 * Pure and DOM-free: callers hand over RGBA pixels (and optionally a segmentation mask and a face box).
 * Nothing here edits a photo. Messages are plain measurements plus a tip; the issuing authority decides acceptance.
 *
 * All luminance numbers are "luma" (Rec. 709 weights on gamma-encoded sRGB, 0-255) shown as a percent of white.
 */
export type PhotoCheckId =
  | "background-even"
  | "background-shadow"
  | "background-colour"
  | "lighting-even"
  | "exposure"
  | "sharpness";

export interface PhotoCheck {
  id: PhotoCheckId;
  status: "pass" | "warn" | "unknown";
  /**
   * The headline number. Units by check: background-even, background-shadow and lighting-even are a percent
   * difference; background-colour is the colour distance (CIELAB, lightness down-weighted) to the nearest
   * expected colour; exposure is mean face brightness as a percent of white; sharpness is the Laplacian variance.
   */
  value?: number;
  message: string;
  tip?: string;
  /** background-colour only: the measured background colour. */
  rgb?: [number, number, number];
}

export interface AnalysisBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AnalysisMask {
  width: number;
  height: number;
  /** Foreground probability 0-255 (255 = person). Any resolution; it covers the whole source photo. */
  alpha: Uint8ClampedArray | Uint8Array;
}
export interface AnalysisInput {
  width: number;
  height: number;
  rgba: Uint8ClampedArray | Uint8Array;
  mask?: AnalysisMask;
  /** Face box in source pixels. */
  face?: AnalysisBox;
  /** The part of the photo that will be delivered; defaults to the whole photo. */
  crop?: Crop;
  /**
   * Optional pixels of just the face box, taken at higher detail than `rgba` (a big photo is analysed at
   * <= 512 px, which hides blur). Used for the sharpness check only.
   */
  faceDetail?: { width: number; height: number; rgba: Uint8ClampedArray | Uint8Array };
}
export interface AnalysisExpectation {
  /** Colour names ("white", "off-white", "light grey", "cream", "light blue") or #rrggbb values. */
  backgroundColors?: string[];
}

/**
 * Thresholds. They are conservative: a check only warns on a clear difference, because real photos carry
 * natural variation (skin tone, hair, wall texture). Chosen from the synthetic fixtures in tests/core/analysis.test.ts
 * and from typical indoor lighting:
 * - evenSpread: spread of 4x4 cell means across the background. A plain wall under one soft light stays under
 *   ~8% (20 levels); a window gradient or a hard shadow reaches 15-40%.
 * - evenStd: pixel std-dev inside the background; catches posters, doors and busy patterns that average out per cell.
 * - shadowHorizontal / shadowVertical: left-vs-right and top-vs-bottom background brightness difference. A one-sided
 *   window or lamp gives 10-30%. Vertical is looser because ceiling light naturally falls off.
 * - colourDeltaE: distance to the nearest expected colour. A dim white wall (L*~82) sits ~12 away; a beige wall
 *   (222,205,170) sits ~21 from off-white; blue or grey walls sit 25+.
 * - lightingRatio: darker half of the face over the lighter half. 0.75 in gamma-encoded luma is about 0.9 stop,
 *   more than natural nose/cheek shading and clearly a side light.
 * - darkMean / brightMean / clippedShare: mean face luma 0-255. Dark skin in good light still averages 60-90, so
 *   "too dark" starts at 45; "too bright" at 215 or when 8% of the face is at pure white.
 * - sharpnessVariance: variance of the 4-neighbour Laplacian of the face measured at a fixed print-like size
 *   (160 px wide). On public/demo-portrait.png (1024 px wide, face ~360 px) the sharp original measures ~160, a gaussian
 *   blur of sigma 1.5 px ~29, sigma 2.5 px ~7.5 and sigma 4 px ~2.6, so "soft" starts at 8 (about sigma 2.5 at that size).
 */
export const ANALYSIS_THRESHOLDS = {
  maxSide: 512,
  maskBackgroundBelow: 40,
  maskForegroundAtLeast: 128,
  borderBand: 0.08,
  minBackgroundShare: 0.03,
  evenSpread: 0.12,
  evenStd: 0.08,
  shadowHorizontal: 0.1,
  shadowVertical: 0.12,
  colourDeltaE: 15,
  colourLightnessWeight: 0.7,
  lightingRatio: 0.75,
  darkMean: 45,
  brightMean: 215,
  clippedLuma: 250,
  clippedShare: 0.08,
  sharpnessWidth: 160,
  sharpnessVariance: 8,
} as const;
const T = ANALYSIS_THRESHOLDS;

type Pixels = Uint8ClampedArray | Uint8Array;
interface Grid {
  w: number;
  h: number;
  r: Uint8Array;
  g: Uint8Array;
  b: Uint8Array;
  y: Float32Array;
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const luma = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;
const pct = (n: number) => `${Math.round(n)}%`;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Average `k*k` point taps per output pixel (nearest); or bilinear taps when upscaling. Reads only what it needs. */
function sampleGrid(
  src: { width: number; height: number; rgba: Pixels },
  box: Rect,
  ow: number,
  oh: number,
  smooth = false,
): Grid {
  const { width, height, rgba } = src;
  const n = ow * oh;
  const out: Grid = {
    w: ow,
    h: oh,
    r: new Uint8Array(n),
    g: new Uint8Array(n),
    b: new Uint8Array(n),
    y: new Float32Array(n),
  };
  const stepX = box.w / ow,
    stepY = box.h / oh;
  const k = smooth ? 1 : Math.max(1, Math.min(3, Math.ceil(Math.min(stepX, stepY) - 0.01)));
  if (smooth) {
    for (let oy = 0; oy < oh; oy++) {
      const fy = Math.min(height - 1, Math.max(0, box.y + (oy + 0.5) * stepY - 0.5));
      const y0 = Math.floor(fy),
        y1 = Math.min(height - 1, y0 + 1),
        ty = fy - y0;
      for (let ox = 0; ox < ow; ox++) {
        const fx = Math.min(width - 1, Math.max(0, box.x + (ox + 0.5) * stepX - 0.5));
        const x0 = Math.floor(fx),
          x1 = Math.min(width - 1, x0 + 1),
          tx = fx - x0;
        const i00 = (y0 * width + x0) * 4,
          i10 = (y0 * width + x1) * 4,
          i01 = (y1 * width + x0) * 4,
          i11 = (y1 * width + x1) * 4;
        const w00 = (1 - tx) * (1 - ty),
          w10 = tx * (1 - ty),
          w01 = (1 - tx) * ty,
          w11 = tx * ty;
        const o = oy * ow + ox;
        const r = rgba[i00]! * w00 + rgba[i10]! * w10 + rgba[i01]! * w01 + rgba[i11]! * w11;
        const g =
          rgba[i00 + 1]! * w00 + rgba[i10 + 1]! * w10 + rgba[i01 + 1]! * w01 + rgba[i11 + 1]! * w11;
        const b =
          rgba[i00 + 2]! * w00 + rgba[i10 + 2]! * w10 + rgba[i01 + 2]! * w01 + rgba[i11 + 2]! * w11;
        out.r[o] = r;
        out.g[o] = g;
        out.b[o] = b;
        out.y[o] = luma(r, g, b);
      }
    }
    return out;
  }
  const xs = new Int32Array(ow * k),
    ys = new Int32Array(oh * k);
  for (let i = 0; i < ow * k; i++)
    xs[i] = Math.min(width - 1, Math.max(0, Math.floor(box.x + ((i + 0.5) / (ow * k)) * box.w))) * 4;
  for (let i = 0; i < oh * k; i++)
    ys[i] = Math.min(height - 1, Math.max(0, Math.floor(box.y + ((i + 0.5) / (oh * k)) * box.h))) * width * 4;
  const taps = k * k;
  for (let oy = 0; oy < oh; oy++)
    for (let ox = 0; ox < ow; ox++) {
      let sr = 0,
        sg = 0,
        sb = 0;
      for (let ty = 0; ty < k; ty++) {
        const row = ys[oy * k + ty]!;
        for (let tx = 0; tx < k; tx++) {
          const i = row + xs[ox * k + tx]!;
          sr += rgba[i]!;
          sg += rgba[i + 1]!;
          sb += rgba[i + 2]!;
        }
      }
      const o = oy * ow + ox;
      const r = sr / taps,
        g = sg / taps,
        b = sb / taps;
      out.r[o] = r;
      out.g[o] = g;
      out.b[o] = b;
      out.y[o] = luma(r, g, b);
    }
  return out;
}

/** Mask alpha resampled (bilinear) onto the analysis grid. The mask covers the whole source photo. */
function maskOnGrid(
  mask: AnalysisMask,
  src: { width: number; height: number },
  box: Rect,
  ow: number,
  oh: number,
): Uint8Array {
  const out = new Uint8Array(ow * oh);
  const { width: mw, height: mh, alpha } = mask;
  for (let oy = 0; oy < oh; oy++) {
    const my = Math.min(mh - 1, Math.max(0, ((box.y + ((oy + 0.5) * box.h) / oh) / src.height) * mh - 0.5));
    const y0 = Math.floor(my),
      y1 = Math.min(mh - 1, y0 + 1),
      ty = my - y0;
    for (let ox = 0; ox < ow; ox++) {
      const mx = Math.min(mw - 1, Math.max(0, ((box.x + ((ox + 0.5) * box.w) / ow) / src.width) * mw - 0.5));
      const x0 = Math.floor(mx),
        x1 = Math.min(mw - 1, x0 + 1),
        tx = mx - x0;
      out[oy * ow + ox] =
        alpha[y0 * mw + x0]! * (1 - tx) * (1 - ty) +
        alpha[y0 * mw + x1]! * tx * (1 - ty) +
        alpha[y1 * mw + x0]! * (1 - tx) * ty +
        alpha[y1 * mw + x1]! * tx * ty;
    }
  }
  return out;
}

/** Keep a background pixel only if every pixel within `r` (horizontally, then vertically) is background too. */
function erode(bg: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const pass = (src: Uint8Array, along: "x" | "y") => {
    const out = new Uint8Array(w * h);
    const len = along === "x" ? w : h,
      lines = along === "x" ? h : w,
      stride = along === "x" ? 1 : w,
      lineStride = along === "x" ? w : 1;
    const prefix = new Int32Array(len + 1);
    for (let l = 0; l < lines; l++) {
      const base = l * lineStride;
      for (let i = 0; i < len; i++) prefix[i + 1] = prefix[i]! + (src[base + i * stride] ? 0 : 1);
      for (let i = 0; i < len; i++) {
        const lo = Math.max(0, i - r),
          hi = Math.min(len, i + r + 1);
        out[base + i * stride] = prefix[hi]! - prefix[lo]! === 0 ? 1 : 0;
      }
    }
    return out;
  };
  return pass(pass(bg, "x"), "y");
}

function share(bg: Uint8Array): number {
  let c = 0;
  for (let i = 0; i < bg.length; i++) c += bg[i]!;
  return c / bg.length;
}

// ---- colour helpers -------------------------------------------------------------------------------------------
type Lab = [number, number, number];
function toLab(r: number, g: number, b: number): Lab {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r),
    G = lin(g),
    B = lin(b);
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047,
    Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B,
    Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X),
    fy = f(Y),
    fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Named background colours as sRGB targets. */
const NAMED_COLOURS: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  offwhite: [245, 243, 235],
  lightgrey: [215, 215, 215],
  lightgray: [215, 215, 215],
  grey: [200, 200, 200],
  gray: [200, 200, 200],
  cream: [250, 246, 225],
  lightblue: [190, 215, 240],
};
function parseExpected(list: string[] | undefined): { name: string; lab: Lab }[] {
  const out: { name: string; lab: Lab }[] = [];
  for (const raw of list ?? []) {
    const s = String(raw).trim().toLowerCase();
    const m = /^#?([0-9a-f]{6})$/.exec(s);
    if (m && s.startsWith("#")) {
      const n = parseInt(m[1]!, 16);
      out.push({ name: `#${m[1]!.toUpperCase()}`, lab: toLab((n >> 16) & 255, (n >> 8) & 255, n & 255) });
      continue;
    }
    const rgb = NAMED_COLOURS[s.replace(/[^a-z]/g, "")];
    if (rgb) out.push({ name: s.replace(/[-_]+/g, " "), lab: toLab(...rgb) });
  }
  return out;
}
function colourDistance(a: Lab, b: Lab): number {
  const dl = (a[0] - b[0]) * T.colourLightnessWeight;
  return Math.hypot(dl, a[1] - b[1], a[2] - b[2]);
}
function colourName([L, a, b]: Lab): string {
  const C = Math.hypot(a, b);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  if (L < 20) return "black";
  if (C < 7) return L >= 93 ? "white" : L >= 82 ? "light grey" : L >= 55 ? "grey" : L >= 30 ? "dark grey" : "black";
  if (h >= 30 && h < 110) {
    if (L >= 88) return C < 16 ? "off-white" : C < 32 ? "cream" : "yellow";
    return L >= 65 ? "beige" : "brown";
  }
  if (h >= 200 && h < 290) return L >= 88 && C < 12 ? "off-white" : L >= 78 ? "light blue" : "blue";
  if (h >= 110 && h < 200) return L >= 80 ? "pale green" : "green";
  return L >= 75 ? "pink" : "red or purple";
}

// ---- background -----------------------------------------------------------------------------------------------
function backgroundPixels(
  grid: Grid,
  maskAlpha: Uint8Array | undefined,
  face: Rect | undefined,
): { bg: Uint8Array; source: "mask" | "border" } | null {
  const { w, h } = grid;
  if (maskAlpha) {
    const raw = new Uint8Array(w * h);
    for (let i = 0; i < raw.length; i++) raw[i] = maskAlpha[i]! < T.maskBackgroundBelow ? 1 : 0;
    // Stay clear of hair, shoulders and soft mask edges.
    const eroded = erode(raw, w, h, Math.max(2, Math.round(0.012 * Math.max(w, h))));
    const bg = share(eroded) >= T.minBackgroundShare ? eroded : raw;
    return share(bg) >= T.minBackgroundShare ? { bg, source: "mask" } : null;
  }
  const bg = new Uint8Array(w * h);
  const bx = Math.max(1, Math.round(T.borderBand * w)),
    by = Math.max(1, Math.round(T.borderBand * h));
  const chin = face ? face.y + face.h : 0.75 * h;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inBand = x < bx || x >= w - bx || y < by;
      if (!inBand || y >= chin) continue;
      if (face) {
        const cx = face.x + face.w / 2;
        if (Math.abs(x - cx) < 0.9 * face.w) continue; // the head and hair
      }
      bg[y * w + x] = 1;
    }
  return share(bg) >= T.minBackgroundShare * 0.5 ? { bg, source: "border" } : null;
}

interface RegionMean {
  mean: number;
  count: number;
}
function regionMean(grid: Grid, bg: Uint8Array, x0: number, x1: number, y0: number, y1: number): RegionMean {
  let sum = 0,
    count = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(grid.h, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(grid.w, Math.ceil(x1)); x++) {
      const i = y * grid.w + x;
      if (bg[i]) {
        sum += grid.y[i]!;
        count++;
      }
    }
  return { mean: count ? sum / count : 0, count };
}

const unknown = (id: PhotoCheckId, message: string): PhotoCheck => ({ id, status: "unknown", message });
const NEEDS_BACKGROUND =
  "Not enough plain background is visible to measure. Leave some empty wall on both sides of your head.";
const NEEDS_FACE = "No face position is set, so this could not be measured.";

function backgroundChecks(
  grid: Grid,
  bgInfo: { bg: Uint8Array; source: "mask" | "border" } | null,
  face: Rect | undefined,
  expected: AnalysisExpectation | undefined,
): PhotoCheck[] {
  if (!bgInfo)
    return [
      { ...unknown("background-even", NEEDS_BACKGROUND), tip: "Step back or leave more room around your head and shoulders." },
      unknown("background-shadow", NEEDS_BACKGROUND),
      unknown("background-colour", NEEDS_BACKGROUND),
    ];
  const { bg } = bgInfo;
  const { w, h } = grid;
  // Global stats plus a 4x4 grid of cell means.
  let n = 0,
    sum = 0,
    sumSq = 0;
  const cellSum = new Float64Array(16),
    cellCount = new Int32Array(16);
  const histR = new Int32Array(256),
    histG = new Int32Array(256),
    histB = new Int32Array(256);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!bg[i]) continue;
      const l = grid.y[i]!;
      n++;
      sum += l;
      sumSq += l * l;
      const c = Math.min(3, Math.floor((y * 4) / h)) * 4 + Math.min(3, Math.floor((x * 4) / w));
      cellSum[c] = cellSum[c]! + l;
      cellCount[c] = cellCount[c]! + 1;
      histR[grid.r[i]!]!++;
      histG[grid.g[i]!]!++;
      histB[grid.b[i]!]!++;
    }
  const mean = sum / n;
  const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean)) / 255;
  const minCell = 0.05 * (w / 4) * (h / 4);
  const cellMeans: number[] = [];
  for (let c = 0; c < 16; c++) if (cellCount[c]! >= minCell) cellMeans.push(cellSum[c]! / cellCount[c]!);
  const spread = cellMeans.length >= 2 ? (Math.max(...cellMeans) - Math.min(...cellMeans)) / 255 : 0;
  const checks: PhotoCheck[] = [];

  // background-even
  const uneven = spread > T.evenSpread || std > T.evenStd;
  const evenValue = round1(Math.max(spread, std) * 100);
  checks.push(
    uneven
      ? {
          id: "background-even",
          status: "warn",
          value: evenValue,
          message:
            spread > T.evenSpread
              ? `Background varies by ${pct(spread * 100)}. A plainer, evenly lit wall helps.`
              : `Background has visible texture or objects: its brightness varies by ${pct(std * 100)} within the wall.`,
          tip: "Stand in front of a plain, evenly lit wall. Keep doors, posters, curtains and furniture out of the frame.",
        }
      : {
          id: "background-even",
          status: "pass",
          value: evenValue,
          message: `Background brightness varies by ${pct(spread * 100)} across the frame.`,
        },
  );

  // background-shadow
  const rowLimit = Math.min(h, Math.max(0.4 * h, face ? face.y + face.h : 0.75 * h));
  const left = regionMean(grid, bg, 0, w / 3, 0, rowLimit),
    right = regionMean(grid, bg, (2 * w) / 3, w, 0, rowLimit),
    top = regionMean(grid, bg, 0, w, 0, 0.35 * rowLimit),
    bottom = regionMean(grid, bg, 0, w, 0.65 * rowLimit, rowLimit);
  const minCount = 0.004 * w * h;
  const hOk = left.count >= minCount && right.count >= minCount,
    vOk = top.count >= minCount && bottom.count >= minCount;
  if (!hOk && !vOk)
    checks.push(unknown("background-shadow", "Too little background is visible on both sides of the head to compare its brightness."));
  else {
    const hDiff = hOk ? (right.mean - left.mean) / 255 : 0,
      vDiff = vOk ? (bottom.mean - top.mean) / 255 : 0;
    const hBad = Math.abs(hDiff) > T.shadowHorizontal,
      vBad = Math.abs(vDiff) > T.shadowVertical;
    const value = round1(Math.max(Math.abs(hDiff) * (hOk ? 1 : 0), Math.abs(vDiff) * (vOk ? 1 : 0)) * 100);
    if (hBad || vBad) {
      const parts: string[] = [];
      if (hBad)
        parts.push(`the ${hDiff < 0 ? "right" : "left"} side is ${pct(Math.abs(hDiff) * 100)} darker than the ${hDiff < 0 ? "left" : "right"}`);
      if (vBad)
        parts.push(`the ${vDiff < 0 ? "bottom" : "top"} is ${pct(Math.abs(vDiff) * 100)} darker than the ${vDiff < 0 ? "top" : "bottom"}`);
      checks.push({
        id: "background-shadow",
        status: "warn",
        value,
        message: `Background brightness is uneven behind the head: ${parts.join("; ")}.`,
        tip: "Face a window or put a soft light in front of you, and stand about a metre away from the wall so your shadow does not land on it.",
      });
    } else
      checks.push({
        id: "background-shadow",
        status: "pass",
        value,
        message: `Left and right background brightness differ by ${pct(Math.abs(hDiff) * 100)}${vOk ? `; top and bottom by ${pct(Math.abs(vDiff) * 100)}` : ""}.`,
      });
  }

  // background-colour: median per channel is steady against a stray shadow or the odd picture frame
  const median = (hist: Int32Array) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v]!;
      if (acc >= n / 2) return v;
    }
    return 255;
  };
  const rgb: [number, number, number] = [median(histR), median(histG), median(histB)];
  const lab = toLab(...rgb);
  const name = colourName(lab);
  const wanted = parseExpected(expected?.backgroundColors);
  if (!wanted.length)
    checks.push({
      id: "background-colour",
      status: "unknown",
      message: `The background measures ${name} (${hex(...rgb)}). No colour is set for this document to compare with.`,
      rgb,
    });
  else {
    let best = wanted[0]!,
      bestD = colourDistance(lab, best.lab);
    for (const c of wanted.slice(1)) {
      const d = colourDistance(lab, c.lab);
      if (d < bestD) (best = c), (bestD = d);
    }
    const list = wanted.map((c) => c.name).join(" or ");
    checks.push(
      bestD > T.colourDeltaE
        ? {
            id: "background-colour",
            status: "warn",
            value: round1(bestD),
            message: `The background measures ${name} (${hex(...rgb)}); this document asks for ${list}.`,
            tip: "Use a plain white or light wall. Avoid coloured walls, wood, curtains and patterns.",
            rgb,
          }
        : {
            id: "background-colour",
            status: "pass",
            value: round1(bestD),
            message: `The background measures ${name} (${hex(...rgb)}), close to ${best.name}.`,
            rgb,
          },
    );
  }
  return checks;
}

// ---- face -----------------------------------------------------------------------------------------------------
function faceChecks(
  input: AnalysisInput,
  grid: Grid,
  maskAlpha: Uint8Array | undefined,
  face: Rect | undefined,
  crop: Rect,
): PhotoCheck[] {
  const checks: PhotoCheck[] = [];
  const { w, h } = grid;
  // Pixels of the face region (lower 85% of the box, skipping hair), person pixels only when a mask is known.
  let region: number[] | undefined;
  const collect = (x0: number, x1: number, y0: number, y1: number, into: number[]) => {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x1)); x++) {
        const i = y * w + x;
        if (!maskAlpha || maskAlpha[i]! >= T.maskForegroundAtLeast) into.push(i);
      }
  };
  let left: number[] = [],
    right: number[] = [];
  if (face && face.w >= 6 && face.h >= 6) {
    const y0 = face.y + 0.15 * face.h,
      y1 = face.y + face.h,
      mid = face.x + face.w / 2;
    collect(face.x, mid, y0, y1, left);
    collect(mid, face.x + face.w, y0, y1, right);
    region = left.concat(right);
  } else {
    region = [];
    collect(0.25 * w, 0.75 * w, 0.25 * h, 0.75 * h, region);
    left = right = [];
  }

  // lighting-even
  if (!face || left.length < 60 || right.length < 60)
    checks.push(unknown("lighting-even", face ? "The face is too small in the frame to compare its two sides." : NEEDS_FACE));
  else {
    const avg = (idx: number[]) => idx.reduce((s, i) => s + grid.y[i]!, 0) / idx.length;
    const a = avg(left),
      b = avg(right);
    const ratio = Math.min(a, b) / Math.max(1, Math.max(a, b));
    const diff = (1 - ratio) * 100;
    const darker = a < b ? "left" : "right";
    checks.push(
      ratio < T.lightingRatio
        ? {
            id: "lighting-even",
            status: "warn",
            value: round1(diff),
            message: `The ${darker} side of the face is ${pct(diff)} darker than the other side.`,
            tip: "Face a window or a soft lamp so the light reaches both cheeks evenly.",
          }
        : {
            id: "lighting-even",
            status: "pass",
            value: round1(diff),
            message: `The two sides of the face differ by ${pct(diff)} in brightness.`,
          },
    );
  }

  // exposure
  if (region.length < 60) checks.push(unknown("exposure", face ? "The face is too small in the frame to measure." : "Not enough of the photo could be measured."));
  else {
    let sum = 0,
      clipped = 0;
    for (const i of region) {
      const l = grid.y[i]!;
      sum += l;
      if (l >= T.clippedLuma) clipped++;
    }
    const mean = sum / region.length,
      clip = clipped / region.length;
    const where = face ? "The face" : "The middle of the photo";
    const value = round1((mean / 255) * 100);
    if (mean < T.darkMean)
      checks.push({
        id: "exposure",
        status: "warn",
        value,
        message: `${where} is dark: its average brightness is ${pct(value)} of white.`,
        tip: "Move to brighter, soft light, such as a window on a cloudy day. Avoid dark rooms and backlight.",
      });
    else if (mean > T.brightMean || clip > T.clippedShare)
      checks.push({
        id: "exposure",
        status: "warn",
        value,
        message:
          clip > T.clippedShare
            ? `${where} has pure-white highlights on ${pct(clip * 100)} of its area (average brightness ${pct(value)}).`
            : `${where} is very bright: its average brightness is ${pct(value)} of white.`,
        tip: "Avoid direct sun and flash. Soft light from a window keeps skin detail.",
      });
    else
      checks.push({
        id: "exposure",
        status: "pass",
        value,
        message: `${where} averages ${pct(value)} brightness, with ${pct(clip * 100)} at pure white.`,
      });
  }

  // sharpness: fixed print-like size so a 12 MP photo and a 2 MP photo are judged alike
  if (!face || face.w < 6 || face.h < 6) checks.push(unknown("sharpness", NEEDS_FACE));
  else {
    const detail = input.faceDetail;
    let patch: Grid;
    const inner = (bw: number, bh: number): Rect => ({
      x: 0.15 * bw,
      y: 0.2 * bh,
      w: 0.7 * bw,
      h: 0.7 * bh,
    });
    if (detail && detail.width > 0 && detail.height > 0 && detail.rgba.length >= detail.width * detail.height * 4) {
      const r = inner(detail.width, detail.height);
      patch = patchOf(detail, r);
    } else {
      // Face box in source pixels, clamped to the photo.
      const fx = crop.x + (face.x / grid.w) * crop.w,
        fy = crop.y + (face.y / grid.h) * crop.h,
        fw = (face.w / grid.w) * crop.w,
        fh = (face.h / grid.h) * crop.h;
      const ix = Math.max(0, fx + 0.15 * fw),
        iy = Math.max(0, fy + 0.2 * fh),
        ix2 = Math.min(input.width, fx + 0.85 * fw),
        iy2 = Math.min(input.height, fy + 0.9 * fh);
      if (ix2 - ix < 4 || iy2 - iy < 4) patch = { w: 0, h: 0, r: new Uint8Array(0), g: new Uint8Array(0), b: new Uint8Array(0), y: new Float32Array(0) };
      else patch = patchOf(input, { x: ix, y: iy, w: ix2 - ix, h: iy2 - iy });
    }
    if (patch.w < 8 || patch.h < 8) checks.push(unknown("sharpness", "The face is outside the photo, so sharpness could not be measured."));
    else {
      const v = laplacianVariance(patch);
      checks.push(
        v < T.sharpnessVariance
          ? {
              id: "sharpness",
              status: "warn",
              value: round1(v),
              message: `The face looks soft: fine detail measures ${round1(v)} (about ${T.sharpnessVariance} or more is typical of a sharp photo).`,
              tip: "Hold the camera still or use a timer, tap the face to focus, clean the lens and use brighter light.",
            }
          : {
              id: "sharpness",
              status: "pass",
              value: round1(v),
              message: `Fine detail on the face measures ${round1(v)}, which is typical of a sharp photo.`,
            },
      );
    }
  }
  return checks;
}

function patchOf(src: { width: number; height: number; rgba: Pixels }, box: Rect): Grid {
  const ow = T.sharpnessWidth;
  const oh = Math.max(8, Math.min(320, Math.round((ow * box.h) / box.w)));
  const scale = box.w / ow;
  return sampleGrid(src, box, ow, oh, scale < 1.25);
}
function laplacianVariance(g: Grid): number {
  const { w, h, y } = g;
  let n = 0,
    sum = 0,
    sumSq = 0;
  for (let j = 1; j < h - 1; j++)
    for (let i = 1; i < w - 1; i++) {
      const p = j * w + i;
      const l = 4 * y[p]! - y[p - 1]! - y[p + 1]! - y[p - w]! - y[p + w]!;
      n++;
      sum += l;
      sumSq += l * l;
    }
  const m = sum / n;
  return sumSq / n - m * m;
}

// ---- entry point ----------------------------------------------------------------------------------------------
const ORDER: PhotoCheckId[] = [
  "background-even",
  "background-shadow",
  "background-colour",
  "lighting-even",
  "exposure",
  "sharpness",
];
const allUnknown = (message: string): PhotoCheck[] => ORDER.map((id) => unknown(id, message));

/** Measure background, lighting, exposure and sharpness. Always returns the six checks in a fixed order. */
export function analyzePhoto(input: AnalysisInput, expected?: AnalysisExpectation): PhotoCheck[] {
  const { width, height, rgba } = input;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 8 ||
    height < 8 ||
    rgba.length < width * height * 4
  )
    return allUnknown("The photo could not be read for measurement.");
  // The delivered crop, clamped to the photo.
  const c = input.crop;
  let crop: Rect = { x: 0, y: 0, w: width, h: height };
  if (c && [c.x, c.y, c.width, c.height].every(Number.isFinite) && c.width >= 8 && c.height >= 8) {
    const x = Math.max(0, Math.min(width - 8, c.x)),
      y = Math.max(0, Math.min(height - 8, c.y));
    crop = { x, y, w: Math.min(c.width, width - x), h: Math.min(c.height, height - y) };
  }
  const scale = Math.min(1, T.maxSide / Math.max(crop.w, crop.h));
  const ow = Math.max(8, Math.round(crop.w * scale)),
    oh = Math.max(8, Math.round(crop.h * scale));
  const grid = sampleGrid(input, crop, ow, oh);
  const maskAlpha =
    input.mask && input.mask.width > 0 && input.mask.height > 0 && input.mask.alpha.length >= input.mask.width * input.mask.height
      ? maskOnGrid(input.mask, input, crop, ow, oh)
      : undefined;
  // Face box on the grid, clamped; ignored when it lies outside the crop.
  let face: Rect | undefined;
  const f = input.face;
  if (f && [f.x, f.y, f.width, f.height].every(Number.isFinite) && f.width > 0 && f.height > 0) {
    const x0 = Math.max(0, ((f.x - crop.x) / crop.w) * ow),
      y0 = Math.max(0, ((f.y - crop.y) / crop.h) * oh),
      x1 = Math.min(ow, ((f.x + f.width - crop.x) / crop.w) * ow),
      y1 = Math.min(oh, ((f.y + f.height - crop.y) / crop.h) * oh);
    if (x1 - x0 >= 2 && y1 - y0 >= 2) face = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  const bg = backgroundPixels(grid, maskAlpha, face);
  return [...backgroundChecks(grid, bg, face, expected), ...faceChecks(input, grid, maskAlpha, face, crop)];
}
