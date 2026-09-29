const LIMIT_PIXELS = 40_000_000;
export interface RasterInfo {
  /** Type found in the file contents, which may differ from file.type (HEIC is often reported as ""). */
  mime: string;
  /** 0 when the container does not state it cheaply (some HEIC files). */
  width: number;
  height: number;
}
// Keep in step with detectHeif and heifDimensions in src/node/operations.ts, so the browser and the
// command line agree on what a HEIC/HEIF file is and how large.
const HEIC_BRANDS = new Set([
  "heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs",
]);
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
 * 20 bytes long with version and flags 0. Grids list tiles too, so take the largest. Same rule as Node.
 */
function heifSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  for (let i = 4; i + 16 <= bytes.length; i++) {
    if (
      bytes[i] !== 0x69 ||
      bytes[i + 1] !== 0x73 ||
      bytes[i + 2] !== 0x70 ||
      bytes[i + 3] !== 0x65
    )
      continue;
    if (view.getUint32(i - 4) !== 20 || view.getUint32(i + 4) !== 0) continue;
    const w = view.getUint32(i + 8),
      h = view.getUint32(i + 12);
    if (w > 0 && h > 0 && w * h > width * height) {
      width = w;
      height = h;
    }
  }
  return { width, height };
}
/** Check the encoded container before asking the browser to allocate decoded pixels. */
export async function checkRaster(file: File): Promise<RasterInfo> {
  const bytes = new Uint8Array(await file.arrayBuffer()),
    view = new DataView(bytes.buffer);
  let mime = "",
    width = 0,
    height = 0;
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    String.fromCharCode(...bytes.slice(1, 4)) === "PNG"
  ) {
    mime = "image/png";
    width = view.getUint32(16);
    height = view.getUint32(20);
    for (let p = 8; p + 12 <= bytes.length;) {
      const n = view.getUint32(p),
        type = String.fromCharCode(...bytes.slice(p + 4, p + 8));
      if (type === "acTL")
        throw new Error("Use a still photo, not an animated PNG.");
      if (n > bytes.length - p - 12) throw new Error("This PNG is damaged.");
      p += n + 12;
    }
  } else if (
    bytes.length >= 16 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    mime = "image/webp";
    for (let p = 12; p + 8 <= bytes.length;) {
      const type = String.fromCharCode(...bytes.slice(p, p + 4)),
        n = view.getUint32(p + 4, true),
        d = p + 8;
      if (n > bytes.length - d) throw new Error("This WebP is damaged.");
      if (type === "ANIM" || type === "ANMF")
        throw new Error("Use a still photo, not an animated WebP.");
      if (type === "VP8X" && n >= 10) {
        width = 1 + bytes[d + 4] + (bytes[d + 5] << 8) + (bytes[d + 6] << 16);
        height = 1 + bytes[d + 7] + (bytes[d + 8] << 8) + (bytes[d + 9] << 16);
      } else if (type === "VP8 " && n >= 10) {
        width = view.getUint16(d + 6, true) & 0x3fff;
        height = view.getUint16(d + 8, true) & 0x3fff;
      } else if (type === "VP8L" && n >= 5) {
        const bits = view.getUint32(d + 1, true);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      p = d + n + (n % 2);
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    mime = "image/jpeg";
    let p = 2;
    while (p + 3 < bytes.length) {
      if (bytes[p++] !== 255) break;
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker >= 0xd0 && marker <= 0xd7) continue;
      const n = view.getUint16(p);
      if (n < 2 || p + n > bytes.length)
        throw new Error("This JPEG is damaged.");
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        height = view.getUint16(p + 3);
        width = view.getUint16(p + 5);
        break;
      }
      p += n;
    }
  }
  const heif = mime ? null : sniffHeif(bytes);
  if (heif) {
    // Browsers usually report HEIC/HEIF as "" or a generic type, so trust the contents.
    if (
      file.type &&
      !/^(image\/hei[cf](-sequence)?|application\/octet-stream)$/.test(file.type)
    )
      throw new Error(
        "The file contents do not match a supported JPEG, PNG, WebP or HEIC photo.",
      );
    ({ width, height } = heifSize(bytes));
    if (width * height > LIMIT_PIXELS)
      throw new Error("Choose a photo under 40 megapixels.");
    return { mime: heif, width, height };
  }
  if (!mime || mime !== file.type)
    throw new Error(
      "The file contents do not match a supported JPEG, PNG, WebP or HEIC photo.",
    );
  if (!width || !height)
    throw new Error(
      "This photo header could not be read. Try exporting a new JPEG or PNG.",
    );
  if (width * height > LIMIT_PIXELS)
    throw new Error("Choose a photo under 40 megapixels.");
  return { mime, width, height };
}
