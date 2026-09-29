// Per-page social cards (1200x630 SVG, rendered to PNG by scripts/prerender.ts into dist/og/).
// One card per document (public path /og/<document id>.png) and one per size and guide page
// (/og/<english slug>.png); translated pages share the English card. Text is outlined from the
// self-hosted fonts, so the build needs no system fonts. Loaded through Vite's ssrLoadModule so it
// can import the page helpers.
import { DOCUMENTS, type DocumentSpec } from "../../src/core/documents";
import { photoName, specSummary, fmtMm } from "../../src/ui/pages/content";
import { FONT_DIR, Font } from "./outline-font";

const serif = new Font(FONT_DIR("instrument-serif", "instrument-serif-latin-400-normal.woff"));
const sans = new Font(FONT_DIR("dm-sans", "dm-sans-latin-400-normal.woff"));

// Palette from src/ui/styles.css (light theme), same as scripts/make-og.ts.
const PAPER = "#f7f6f0";
const SURFACE = "#fffef9";
const INK = "#1c3037";
const MUTED = "#596868";
const LINE = "#d7dcd3";
const ACCENT = "#b64a2d";
const STAGE = "#e6e9e1";

export interface Card {
  /** File name without extension: served at /og/<slug>.png. */
  slug: string;
  svg: string;
  /** Alt text for og:image:alt. */
  alt: string;
}

/** Keep only characters the fonts can draw (the cards are English; a stray symbol becomes a space). */
const clean = (s: string) =>
  [...s].map((c) => (c === " " || sans.glyphId(c) !== 0 ? c : " ")).join("").replace(/\s+/g, " ").trim();

/** Break text into at most `max` lines that fit `width` at `size`. */
function wrap(font: Font, text: string, size: number, width: number, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.width(next, size) <= width || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, max);
}

interface Mock {
  wLabel: string;
  hLabel: string;
  /** width / height of the drawn frame. */
  aspect: number;
  /** Eye line band as fractions of height from the bottom. */
  eye?: [number, number];
  /** Head range as fractions of height. */
  head?: [number, number];
}

function mockSvg(m: Mock, cx: number, cy: number, maxW: number, maxH: number): string {
  let w = maxW;
  let h = w / m.aspect;
  if (h > maxH) {
    h = maxH;
    w = h * m.aspect;
  }
  const x = cx - w / 2;
  const y = cy - h / 2;
  let out = `<rect x="${x + 7}" y="${y + 9}" width="${w}" height="${h}" rx="3" fill="#182c35" opacity="0.14"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${SURFACE}" stroke="${LINE}" stroke-width="1.5"/>`;
  const clip = `og-${Math.round(cx)}-${Math.round(cy)}`;
  if (m.head) {
    // Head oval at the middle of the allowed range, centred; chin set so the eyes fall in the eye band.
    const hh = h * ((m.head[0] + m.head[1]) / 2);
    const eyeFrac = m.eye ? (m.eye[0] + m.eye[1]) / 2 : undefined;
    const eyeY = eyeFrac !== undefined ? y + h * (1 - eyeFrac) : undefined;
    const top = eyeY !== undefined ? eyeY - hh * 0.42 : y + (h - hh) / 2;
    const sw = Math.min(w * 0.42, hh * 0.95);
    out += `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/></clipPath>
  <g clip-path="url(#${clip})">
  <path d="M${cx - sw} ${y + h}c0-${hh * 0.4} ${sw * 0.3}-${hh * 0.62} ${sw}-${hh * 0.62}s${sw} ${hh * 0.22} ${sw} ${hh * 0.62}z" fill="#5d7a86" opacity="0.9"/>
  <ellipse cx="${cx}" cy="${top + hh / 2}" rx="${hh * 0.36}" ry="${hh / 2}" fill="#e0b494" opacity="0.92"/></g>`;
  }
  if (m.eye) {
    const y1 = y + h * (1 - m.eye[0]);
    const y2 = y + h * (1 - m.eye[1]);
    out += `<g fill="none" stroke="${ACCENT}" stroke-width="2"><path d="M${x + 10} ${y1}h${w - 20}M${x + 10} ${y2}h${w - 20}" stroke-dasharray="6 5"/></g>`;
  }
  out += sans.text(m.wLabel, cx, y + h + 34, 20, MUTED, "middle");
  out += `<g transform="rotate(-90 ${x - 16} ${cy})">${sans.text(m.hLabel, x - 16, cy + 6, 20, MUTED, "middle")}</g>`;
  return out;
}

function frame(opts: {
  eyebrow: string;
  title: string;
  spec: string;
  detail?: string;
  mock?: Mock;
  /** False for documents that cannot be made at home: the card must not promise a free maker. */
  maker?: boolean;
}): string {
  const LEFT = 92;
  const TEXT_W = opts.mock ? 640 : 900;
  let size = 84;
  let lines = wrap(serif, opts.title, size, TEXT_W, 2);
  while ((lines.some((l) => serif.width(l, size) > TEXT_W) || lines.join(" ") !== opts.title) && size > 44) {
    size -= 4;
    lines = wrap(serif, opts.title, size, TEXT_W, 2);
  }
  const lh = size * 1.08;
  const first = 262;
  const last = first + (lines.length - 1) * lh;
  const titleSvg = lines.map((l, i) => serif.text(l, LEFT, first + i * lh, size, INK)).join("\n  ");
  const specY = last + 64;
  let specSize = 30;
  while (sans.width(opts.spec, specSize) > TEXT_W && specSize > 18) specSize -= 1;
  const marks = `<path d="M40 40h30M40 40v30M1160 40h-30M1160 40v30M40 590h30M40 590v-30M1160 590h-30M1160 590v-30" fill="none" stroke="${ACCENT}" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  ${opts.mock ? `<rect x="800" y="0" width="400" height="630" fill="${STAGE}" opacity="0.55"/>` : ""}
  ${marks}
  <circle cx="${LEFT + 6}" cy="98" r="7" fill="${ACCENT}"/>
  ${serif.text("PortraitPass", LEFT + 24, 108, 34, INK)}
  ${sans.text(opts.eyebrow.toUpperCase(), LEFT, 178, 20, ACCENT)}
  ${titleSvg}
  ${sans.text(opts.spec, LEFT, specY, specSize, MUTED)}
  ${opts.detail ? sans.text(opts.detail, LEFT, specY + 44, 22, MUTED) : ""}
  ${sans.text(opts.maker === false ? "Independent open-source project. Not affiliated with any government." : "Free, in your browser. Independent open-source project.", LEFT, 556, 18, MUTED)}
  ${opts.mock ? mockSvg(opts.mock, 1000, 300, 250, 340) : ""}
</svg>
`;
}

function docCard(doc: DocumentSpec): Card {
  const p = doc.print;
  const title = clean(photoName(doc));
  const spec = p || doc.digital ? clean(specSummary(doc)).replace(/;/g, " ·") : "Requirements, and where to get the photo";
  let mock: Mock | undefined;
  if (p) {
    mock = {
      wLabel: `${fmtMm(p.widthMm)} mm`,
      hLabel: `${fmtMm(p.heightMm)} mm`,
      aspect: p.widthMm / p.heightMm,
      eye: p.eyeMinMm !== undefined && p.eyeMaxMm !== undefined ? [p.eyeMinMm / p.heightMm, p.eyeMaxMm / p.heightMm] : undefined,
      head: p.headMinMm !== undefined && p.headMaxMm !== undefined ? [p.headMinMm / p.heightMm, p.headMaxMm / p.heightMm] : undefined,
    };
  } else if (doc.digital && doc.digital.widthPx && doc.digital.heightPx) {
    mock = {
      wLabel: `${doc.digital.widthPx} px`,
      hLabel: `${doc.digital.heightPx} px`,
      aspect: doc.digital.widthPx / doc.digital.heightPx,
    };
  }
  const kind = { passport: "Passport", visa: "Visa", "id-card": "ID card", residence: "Residence or immigration", citizenship: "Citizenship", lottery: "Lottery entry", "exam-form": "Exam application", other: "Document" }[doc.kind];
  return {
    slug: doc.id,
    svg: frame({
      eyebrow: clean(`${doc.country} · ${kind}`),
      title,
      spec,
      detail:
        doc.diy === "no"
          ? "Not a home photo: the page says where to get it."
          : doc.diy === "digital-only"
            ? "Exact pixels and file size for the upload form."
            : "Size, head and eye guides, print sheet.",
      mock,
      maker: doc.diy !== "no",
    }),
    alt: `${title}: ${spec}`,
  };
}

const PAGES: { slug: string; eyebrow: string; title: string; spec: string; detail: string; mock?: Mock }[] = [
  {
    slug: "2x2-photo",
    eyebrow: "Photo size",
    title: "2×2 inch photo",
    spec: "50.8 × 50.8 mm · 600 × 600 px at 300 DPI",
    detail: "Which documents use it, head and eye positions.",
    mock: { wLabel: "2 in", hLabel: "2 in", aspect: 1 },
  },
  {
    slug: "35x45-photo",
    eyebrow: "Photo size",
    title: "35×45 mm photo",
    spec: "413 × 531 px at 300 DPI",
    detail: "Which documents use it, head and eye positions.",
    mock: { wLabel: "35 mm", hLabel: "45 mm", aspect: 35 / 45 },
  },
  {
    slug: "600x600-photo",
    eyebrow: "Upload size",
    title: "600×600 pixel photo",
    spec: "Which uploads ask for it, and the file size limits",
    detail: "Exact pixels, inside the KB range.",
    mock: { wLabel: "600 px", hLabel: "600 px", aspect: 1 },
  },
  {
    slug: "photo-under-50kb",
    eyebrow: "File size",
    title: "Photo under 50 KB",
    spec: "Documents with a file size limit, and how KB is counted",
    detail: "How to reduce a photo's file size.",
  },
  {
    slug: "passport-photo-print-sheet",
    eyebrow: "Print",
    title: "Passport photo print sheet",
    spec: "4×6, A4 and Letter: how many photos fit",
    detail: "Cut marks, actual-size printing.",
    mock: { wLabel: "4 in", hLabel: "6 in", aspect: 4 / 6 },
  },
  {
    slug: "print-passport-photos",
    eyebrow: "Print",
    title: "Print passport photos",
    spec: "A 4×6 sheet at a photo counter for about 40¢",
    detail: "At home, at a store, or at a lab.",
    mock: { wLabel: "4 in", hLabel: "6 in", aspect: 4 / 6 },
  },
  {
    slug: "documents",
    eyebrow: "Dataset",
    title: `Passport, visa and ID photo requirements`,
    spec: `${DOCUMENTS.length} documents, each with its source and check date`,
    detail: "Sizes, head position, background, file size.",
  },
];

/** Every card the site references (see ogImageFor in src/ui/routes.tsx). */
export function ogCards(): Card[] {
  return [
    ...DOCUMENTS.map(docCard),
    ...PAGES.map((p) => ({
      slug: p.slug,
      svg: frame(p),
      alt: `${p.title}: ${p.spec}`,
    })),
  ];
}
