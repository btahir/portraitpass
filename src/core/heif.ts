// HEIC/HEIF container sniffing, shared by the browser (src/browser/header.ts) and Node
// (src/node/operations.ts) so both agree on what a HEIC file is and how large. Pure bytes, no decoding.
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);
const ascii = (bytes: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...bytes.subarray(from, to));

/** Detect an ISO-BMFF HEIC/HEIF file from its ftyp box brands. AVIF, which shares the container, is excluded. */
export function sniffHeif(bytes: Uint8Array): "image/heic" | "image/heif" | null {
  if (bytes.length < 16 || ascii(bytes, 4, 8) !== "ftyp") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint32(0),
    end = size >= 16 && size <= bytes.length ? size : Math.min(bytes.length, 64),
    major = ascii(bytes, 8, 12),
    brands = new Set([major]);
  for (let p = 16; p + 4 <= end; p += 4) brands.add(ascii(bytes, p, p + 4));
  if (brands.has("avif") || brands.has("avis")) return null;
  if ([...brands].some((b) => HEIC_BRANDS.has(b))) return "image/heic";
  if (major === "mif1" || major === "msf1") return "image/heif";
  return null;
}

/**
 * Largest stated image size in a HEIC/HEIF file: the ispe (image spatial extents) boxes, which must be
 * 20 bytes long with version and flags 0. Grids list tiles too, so take the largest. Undefined when
 * the file states none.
 */
export function heifSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let best: { width: number; height: number } | undefined;
  for (let i = 4; i + 16 <= bytes.length; i++) {
    if (bytes[i] !== 0x69 || bytes[i + 1] !== 0x73 || bytes[i + 2] !== 0x70 || bytes[i + 3] !== 0x65)
      continue;
    if (view.getUint32(i - 4) !== 20 || view.getUint32(i + 4) !== 0) continue;
    const width = view.getUint32(i + 8),
      height = view.getUint32(i + 12);
    if (width > 0 && height > 0 && (!best || width * height > best.width * best.height))
      best = { width, height };
  }
  return best;
}
