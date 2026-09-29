// One-off generator for the social card: writes public/og.svg and public/og.png (1200x630).
// Text is converted to outlined SVG paths from the self-hosted Fontsource WOFF files (TrueType
// outlines), so the SVG renders identically in sharp, browsers and social crawlers without any
// installed fonts. No kerning is applied (GPOS is ignored), which is fine at these sizes.
// Run: pnpm exec tsx scripts/make-og.ts
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FONT_DIR, Font } from "./lib/outline-font";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
