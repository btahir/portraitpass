// One-off: renders public/favicon.svg into the PWA icons under public/icons/.
// Run: ./node_modules/.bin/tsx scripts/make-icons.ts
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const svg = await readFile(resolve(root, "public/favicon.svg"), "utf8");
const BG = "#193d37";
// Artwork without its rounded background rect, for full-bleed icons.
const art = svg.replace(/<svg[^>]*>/, "").replace("</svg>", "").replace(/<rect[^>]*\/>/, "");
const fullBleed = (scale: number) => {
  const offset = (64 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${BG}"/><g transform="translate(${offset} ${offset}) scale(${scale})">${art}</g></svg>`;
};
const out = resolve(root, "public/icons");
await mkdir(out, { recursive: true });
const png = (source: string, size: number, file: string) =>
  sharp(Buffer.from(source), { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()
    .then((buf) => writeFile(resolve(out, file), buf));

await png(svg, 192, "icon-192.png");
await png(svg, 512, "icon-512.png");
// Maskable: content inside the central 80% safe zone.
await png(fullBleed(0.8), 512, "maskable-512.png");
// iOS rounds the corners itself and fills transparency with black, so full bleed.
await png(fullBleed(0.9), 180, "apple-touch-icon.png");
console.log("Icons written to public/icons/");
