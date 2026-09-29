// One-off generator for the social card: writes public/og.svg and public/og.png (1200x630).
// Text is converted to outlined SVG paths from the self-hosted Fontsource WOFF files (TrueType
// outlines), so the SVG renders identically in sharp, browsers and social crawlers without any
// installed fonts. No kerning is applied (GPOS is ignored), which is fine at these sizes.
// Run: pnpm exec tsx scripts/make-og.ts
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = (pkg: string, file: string) =>
  resolve(ROOT, "node_modules/@fontsource", pkg, "files", file);

interface Point {
  x: number;
  y: number;
  on: boolean;
}
class Font {
  private tables = new Map<string, DataView>();
  readonly unitsPerEm: number;
  private locaLong: boolean;
  private loca: DataView;
  private glyf: DataView;
  private hmtx: DataView;
  private numHMetrics: number;
  private cmap = new Map<number, number>();
  private cache = new Map<number, Point[][]>();

  constructor(path: string) {
    const b = readFileSync(path);
    if (b.toString("latin1", 0, 4) !== "wOFF") throw new Error("expected a WOFF file");
    const n = b.readUInt16BE(12);
    for (let i = 0; i < n; i++) {
      const o = 44 + i * 20;
      const tag = b.toString("latin1", o, o + 4);
      const off = b.readUInt32BE(o + 4),
        comp = b.readUInt32BE(o + 8),
        orig = b.readUInt32BE(o + 12);
      const raw = comp < orig ? inflateSync(b.subarray(off, off + comp)) : b.subarray(off, off + orig);
      this.tables.set(tag, new DataView(raw.buffer, raw.byteOffset, raw.byteLength));
    }
    const t = (tag: string) => {
      const v = this.tables.get(tag);
      if (!v) throw new Error(`missing ${tag} table (CFF fonts are not supported)`);
      return v;
    };
    const head = t("head");
    this.unitsPerEm = head.getUint16(18);
    this.locaLong = head.getInt16(50) === 1;
    this.loca = t("loca");
    this.glyf = t("glyf");
    this.hmtx = t("hmtx");
    this.numHMetrics = t("hhea").getUint16(34);
    this.readCmap(t("cmap"));
  }

  private readCmap(cmap: DataView) {
    const count = cmap.getUint16(2);
    for (let i = 0; i < count; i++) {
      const platform = cmap.getUint16(4 + i * 8),
        encoding = cmap.getUint16(6 + i * 8),
        off = cmap.getUint32(8 + i * 8);
      const fmt = cmap.getUint16(off);
      if (!((platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0)) continue;
      if (fmt === 4) {
        const segX2 = cmap.getUint16(off + 6);
        const seg = segX2 / 2;
        const endO = off + 14,
          startO = endO + segX2 + 2,
          deltaO = startO + segX2,
          rangeO = deltaO + segX2;
        for (let s = 0; s < seg; s++) {
          const end = cmap.getUint16(endO + s * 2),
            start = cmap.getUint16(startO + s * 2),
            delta = cmap.getInt16(deltaO + s * 2),
            range = cmap.getUint16(rangeO + s * 2);
          for (let c = start; c <= end && c !== 0xffff; c++) {
            let g: number;
            if (range === 0) g = (c + delta) & 0xffff;
            else {
              const p = rangeO + s * 2 + range + (c - start) * 2;
              g = p + 2 <= cmap.byteLength ? cmap.getUint16(p) : 0;
              if (g) g = (g + delta) & 0xffff;
            }
            if (g) this.cmap.set(c, g);
          }
        }
      } else if (fmt === 12) {
        const groups = cmap.getUint32(off + 12);
        for (let g = 0; g < groups; g++) {
          const o = off + 16 + g * 12;
          const start = cmap.getUint32(o),
            end = cmap.getUint32(o + 4),
            gid = cmap.getUint32(o + 8);
          for (let c = start; c <= end; c++) this.cmap.set(c, gid + (c - start));
        }
      }
    }
  }

  glyphId(ch: string) {
    return this.cmap.get(ch.codePointAt(0)!) ?? 0;
  }
  advance(gid: number) {
    const i = Math.min(gid, this.numHMetrics - 1);
    return this.hmtx.getUint16(i * 4);
  }

  private contours(gid: number): Point[][] {
    const hit = this.cache.get(gid);
    if (hit) return hit;
    const a = this.locaLong ? this.loca.getUint32(gid * 4) : this.loca.getUint16(gid * 2) * 2;
    const z = this.locaLong ? this.loca.getUint32(gid * 4 + 4) : this.loca.getUint16(gid * 2 + 2) * 2;
    let result: Point[][] = [];
    if (z > a) {
      const g = this.glyf;
      const nc = g.getInt16(a);
      let p = a + 10;
      if (nc >= 0) {
        const ends: number[] = [];
        for (let i = 0; i < nc; i++, p += 2) ends.push(g.getUint16(p));
        const total = nc ? ends[nc - 1] + 1 : 0;
        p += 2 + g.getUint16(p);
        const flags: number[] = [];
        while (flags.length < total) {
          const f = g.getUint8(p++);
          flags.push(f);
          if (f & 8) {
            let r = g.getUint8(p++);
            while (r--) flags.push(f);
          }
        }
        const xs: number[] = [],
          ys: number[] = [];
        let v = 0;
        for (const f of flags) {
          if (f & 2) {
            const d = g.getUint8(p++);
            v += f & 16 ? d : -d;
          } else if (!(f & 16)) {
            v += g.getInt16(p);
            p += 2;
          }
          xs.push(v);
        }
        v = 0;
        for (const f of flags) {
          if (f & 4) {
            const d = g.getUint8(p++);
            v += f & 32 ? d : -d;
          } else if (!(f & 32)) {
            v += g.getInt16(p);
            p += 2;
          }
          ys.push(v);
        }
        let s = 0;
        for (const e of ends) {
          const c: Point[] = [];
          for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
          result.push(c);
          s = e + 1;
        }
      } else {
        for (;;) {
          const f = g.getUint16(p),
            sub = g.getUint16(p + 2);
          p += 4;
          let dx: number, dy: number;
          if (f & 1) {
            dx = g.getInt16(p);
            dy = g.getInt16(p + 2);
            p += 4;
          } else {
            dx = g.getInt8(p);
            dy = g.getInt8(p + 1);
            p += 2;
          }
          let m = [1, 0, 0, 1];
          if (f & 8) {
            const s = g.getInt16(p) / 16384;
            m = [s, 0, 0, s];
            p += 2;
          } else if (f & 0x40) {
            m = [g.getInt16(p) / 16384, 0, 0, g.getInt16(p + 2) / 16384];
            p += 4;
          } else if (f & 0x80) {
            m = [
              g.getInt16(p) / 16384,
              g.getInt16(p + 2) / 16384,
              g.getInt16(p + 4) / 16384,
              g.getInt16(p + 6) / 16384,
            ];
            p += 8;
          }
          for (const c of this.contours(sub))
            result.push(
              c.map((pt) => ({
                on: pt.on,
                x: pt.x * m[0] + pt.y * m[2] + dx,
                y: pt.x * m[1] + pt.y * m[3] + dy,
              })),
            );
          if (!(f & 0x20)) break;
        }
      }
    }
    this.cache.set(gid, result);
    return result;
  }

  /** SVG path data for one glyph at `size` px, origin at (x, baseline). */
  private glyphPath(gid: number, x: number, baseline: number, size: number): string {
    const k = size / this.unitsPerEm;
    const X = (v: number) => +(x + v * k).toFixed(2);
    const Y = (v: number) => +(baseline - v * k).toFixed(2);
    let d = "";
    for (const c of this.contours(gid)) {
      if (!c.length) continue;
      // Start on an on-curve point (synthesise one between two off-curve points if needed).
      let pts = c;
      const firstOn = pts.findIndex((q) => q.on);
      if (firstOn > 0) pts = [...pts.slice(firstOn), ...pts.slice(0, firstOn)];
      else if (firstOn < 0)
        pts = [{ on: true, x: (pts[0].x + pts[pts.length - 1].x) / 2, y: (pts[0].y + pts[pts.length - 1].y) / 2 }, ...pts];
      d += `M${X(pts[0].x)} ${Y(pts[0].y)}`;
      let i = 1;
      const n = pts.length;
      const at = (j: number) => pts[j % n];
      while (i <= n) {
        const p = at(i);
        if (p.on) {
          if (i < n) d += `L${X(p.x)} ${Y(p.y)}`;
          i++;
        } else {
          const next = at(i + 1);
          let ex: number, ey: number, step: number;
          if (next.on) {
            ex = next.x;
            ey = next.y;
            step = 2;
          } else {
            ex = (p.x + next.x) / 2;
            ey = (p.y + next.y) / 2;
            step = 1;
          }
          d += `Q${X(p.x)} ${Y(p.y)} ${X(ex)} ${Y(ey)}`;
          i += step;
        }
      }
      d += "Z";
    }
    return d;
  }

  width(text: string, size: number) {
    let w = 0;
    for (const ch of text) w += this.advance(this.glyphId(ch));
    return (w * size) / this.unitsPerEm;
  }

  /** Outlined text as one path. anchor: start | middle | end. */
  text(text: string, x: number, baseline: number, size: number, fill: string, anchor = "start"): string {
    const w = this.width(text, size);
    let cx = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    let d = "";
    for (const ch of text) {
      const gid = this.glyphId(ch);
      d += this.glyphPath(gid, cx, baseline, size);
      cx += (this.advance(gid) * size) / this.unitsPerEm;
    }
    return `<path fill="${fill}" d="${d}"/>`;
  }
}

const serif = new Font(FONT_DIR("instrument-serif", "instrument-serif-latin-400-normal.woff"));
const serifItalic = new Font(FONT_DIR("instrument-serif", "instrument-serif-latin-400-italic.woff"));
const sans = new Font(FONT_DIR("dm-sans", "dm-sans-latin-400-normal.woff"));

// Palette from src/ui/styles.css (light theme).
const PAPER = "#f7f6f0",
  SURFACE = "#fffef9",
  INK = "#1c3037",
  MUTED = "#596868",
  LINE = "#d7dcd3",
  ACCENT = "#b64a2d",
  STAGE = "#e6e9e1";

// 4 x 6 in sheet mock, 2 x 3 photos of 2 x 2 in, edge to edge.
const SHEET_X = 812,
  SHEET_Y = 58,
  SHEET_W = 320,
  SHEET_H = 480,
  CELL = SHEET_W / 2;

// Simple head-and-shoulders silhouette, no facial features. All coordinates are in a 160 x 160 cell.
function person(cx: number, cy: number, skin: string, top: string, hair: string) {
  return `
  <path d="M${cx - 62} 160c0-34 22-50 62-50s62 16 62 50z" fill="${top}"/>
  <rect x="${cx - 9}" y="${cy + 30}" width="18" height="22" rx="8" fill="${skin}"/>
  <ellipse cx="${cx}" cy="${cy}" rx="27" ry="34" fill="${skin}"/>
  <path d="M${cx - 28} ${cy - 6}c-2-30 12-42 28-42s30 12 28 42c-6-18-14-24-28-24s-22 6-28 24z" fill="${hair}"/>`;
}

const people = [
  ["#c99a7a", "#5d7a86", "#3a2c25"],
  ["#e0b494", "#8a4b3d", "#7b5a3a"],
  ["#a86f4f", "#3d5a4a", "#1e1a18"],
  ["#dfb897", "#4b566e", "#9a7a55"],
  ["#8c5a3e", "#b5654b", "#1a1614"],
  ["#d3a684", "#6d6a58", "#544037"],
];

let sheet = `
  <rect x="${SHEET_X + 8}" y="${SHEET_Y + 10}" width="${SHEET_W}" height="${SHEET_H}" rx="3" fill="#182c35" opacity="0.14"/>
  <rect x="${SHEET_X}" y="${SHEET_Y}" width="${SHEET_W}" height="${SHEET_H}" rx="3" fill="${SURFACE}" stroke="${LINE}"/>`;
people.forEach((p, i) => {
  const col = i % 2,
    row = Math.floor(i / 2);
  const ox = SHEET_X + col * CELL,
    oy = SHEET_Y + row * CELL;
  sheet += `<g transform="translate(${ox} ${oy})"><clipPath id="c${i}"><rect width="${CELL}" height="${CELL}"/></clipPath><g clip-path="url(#c${i})"><rect width="${CELL}" height="${CELL}" fill="#eceee7"/>${person(80, 78, p[0], p[1], p[2])}</g></g>`;
});
// Guides shared between photos (edge-to-edge sheets show thin lines on shared edges only).
sheet += `<path d="M${SHEET_X + CELL} ${SHEET_Y}v${SHEET_H}M${SHEET_X} ${SHEET_Y + CELL}h${SHEET_W}M${SHEET_X} ${SHEET_Y + 2 * CELL}h${SHEET_W}" stroke="#b9c0b8" stroke-width="1"/>`;
// Measurement overlay on the first photo: head band (crown to chin) and eye line.
const gx = SHEET_X,
  gy = SHEET_Y;
sheet += `
  <g fill="none" stroke="${ACCENT}" stroke-width="1.6">
    <path d="M${gx + 14} ${gy + 44}h${CELL - 28}" stroke-dasharray="5 4"/>
    <path d="M${gx + 14} ${gy + 112}h${CELL - 28}" stroke-dasharray="5 4"/>
    <path d="M${gx + 14} ${gy + 78}h${CELL - 28}" stroke-width="1.2" opacity="0.7"/>
    <path d="M${gx + CELL - 10} ${gy + 44}v68M${gx + CELL - 14} ${gy + 44}h8M${gx + CELL - 14} ${gy + 112}h8"/>
  </g>`;
// mm ruler along the left edge of the sheet.
let ruler = "";
for (let i = 0; i <= 24; i++) {
  const y = SHEET_Y + (i * SHEET_H) / 24;
  const len = i % 4 === 0 ? 14 : i % 2 === 0 ? 9 : 5;
  ruler += `M${SHEET_X - 6} ${y.toFixed(1)}h${-len}`;
}
sheet += `<path d="${ruler}" stroke="${MUTED}" stroke-width="1.2" fill="none"/>`;

// Crop marks in the corners (brand detail from the previous card).
const marks = `<path d="M40 40h30M40 40v30M1160 40h-30M1160 40v30M40 590h30M40 590v-30M1160 590h-30M1160 590v-30" fill="none" stroke="${ACCENT}" stroke-width="3"/>`;

const LEFT = 92;
const headline = [
  serif.text("Passport photos,", LEFT, 232, 84, INK),
  serif.text("measured to the", LEFT, 318, 84, INK),
  serifItalic.text("millimetre.", LEFT, 404, 84, ACCENT),
].join("\n  ");

const SUB = "Free · private · 49 documents · print six for about 40¢";
let subSize = 26;
while (sans.width(SUB, subSize) > 680 && subSize > 16) subSize -= 0.5;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="PortraitPass: passport photos, measured to the millimetre. Free, private, 49 documents, print six for about 40 cents.">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect x="${SHEET_X - 40}" y="0" width="${1200 - SHEET_X + 40}" height="630" fill="${STAGE}" opacity="0.55"/>
  ${marks}
  <circle cx="${LEFT + 6}" cy="98" r="7" fill="${ACCENT}"/>
  ${serif.text("PortraitPass", LEFT + 24, 108, 34, INK)}
  ${headline}
  ${sans.text(SUB, LEFT, 484, subSize, MUTED)}
  ${sans.text("Independent open-source project. Not affiliated with any government.", LEFT, 552, 17, MUTED)}
  ${sheet}
  ${sans.text("4 × 6 in · 6 photos", SHEET_X + SHEET_W / 2, SHEET_Y + SHEET_H + 38, 18, MUTED, "middle")}
</svg>
`;

writeFileSync(resolve(ROOT, "public/og.svg"), svg);
await sharp(Buffer.from(svg), { density: 96 })
  .resize(1200, 630)
  .png({ compressionLevel: 9, palette: false })
  .toFile(resolve(ROOT, "public/og.png"));
console.log("wrote public/og.svg and public/og.png", `sub size ${subSize}`);
