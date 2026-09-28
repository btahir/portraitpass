const LIMIT_PIXELS = 40_000_000;
/** Check the encoded container before asking the browser to allocate decoded pixels. */
export async function checkRaster(file: File): Promise<void> {
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
  if (!mime || mime !== file.type)
    throw new Error(
      "The file contents do not match a supported JPEG, PNG or WebP photo.",
    );
  if (!width || !height)
    throw new Error(
      "This photo header could not be read. Try exporting a new JPEG or PNG.",
    );
  if (width * height > LIMIT_PIXELS)
    throw new Error("Choose a photo under 40 megapixels.");
}
