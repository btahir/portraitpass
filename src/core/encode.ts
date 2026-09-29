import { PortraitError, type DigitalTarget } from "./types.js";

/** Lowest and highest JPEG quality the size search will use. */
export const MIN_JPEG_QUALITY = 0.3;
export const MAX_JPEG_QUALITY = 0.95;
/** Largest side accepted for a digital export, in pixels. */
export const MAX_DIGITAL_SIDE = 10_000;

/** Kilobytes to bytes. `kbBytes` is 1024 by default; some forms mean 1000. Rounds to a whole byte. */
export function kbToBytes(kb: number, kbBytes: 1000 | 1024 = 1024): number {
  if (!Number.isFinite(kb) || kb < 0)
    throw new PortraitError(
      "INVALID_DIGITAL_TARGET",
      "File sizes must be positive numbers of KB.",
    );
  return Math.round(kb * kbBytes);
}

export interface DigitalBytes {
  minBytes?: number;
  maxBytes?: number;
}

/** Validate a digital target and turn its KB limits into bytes. */
export function digitalTargetBytes(target: DigitalTarget): DigitalBytes {
  const side = (n: unknown) =>
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 1 &&
    n <= MAX_DIGITAL_SIDE;
  if (!side(target.widthPx) || !side(target.heightPx))
    throw new PortraitError(
      "INVALID_DIGITAL_TARGET",
      `Width and height must be whole pixels from 1 to ${MAX_DIGITAL_SIDE}.`,
    );
  if (target.format !== "jpeg")
    throw new PortraitError(
      "INVALID_DIGITAL_TARGET",
      "Digital export supports JPEG only.",
    );
  if (target.kbBytes !== undefined && ![1000, 1024].includes(target.kbBytes))
    throw new PortraitError(
      "INVALID_DIGITAL_TARGET",
      "kbBytes must be 1000 or 1024.",
    );
  const positive = (n: number | undefined, what: string) => {
    if (n !== undefined && (!Number.isFinite(n) || n <= 0))
      throw new PortraitError(
        "INVALID_DIGITAL_TARGET",
        `${what} must be a positive number of KB.`,
      );
  };
  positive(target.minKB, "Minimum size");
  positive(target.maxKB, "Maximum size");
  const out: DigitalBytes = {};
  if (target.minKB !== undefined)
    out.minBytes = kbToBytes(target.minKB, target.kbBytes);
  if (target.maxKB !== undefined)
    out.maxBytes = kbToBytes(target.maxKB, target.kbBytes);
  if (
    out.minBytes !== undefined &&
    out.maxBytes !== undefined &&
    out.minBytes > out.maxBytes
  )
    throw new PortraitError(
      "INVALID_DIGITAL_TARGET",
      "The minimum file size is larger than the maximum.",
    );
  return out;
}

const isJpeg = (b: Uint8Array) =>
  b.length >= 4 && b[0] === 0xff && b[1] === 0xd8;
/** One COM segment holds at most 65533 payload bytes (a 2-byte length counts itself). */
const MAX_COM_PAYLOAD = 65533;

/**
 * Insert JPEG COM (comment, 0xFFFE) segments. `text` is written as the comment. A number means
 * "grow the file by exactly this many bytes" (at least 4: the marker and length take 4 bytes per
 * segment); the payload is a plain space fill. Segments go after SOI and any leading APPn segments,
 * so JFIF/EXIF stay where readers look for them, and before the frame data. Decoders skip COM
 * segments, so pixels are untouched.
 */
export function insertJpegComment(
  bytes: Uint8Array,
  text: string | number,
): Uint8Array {
  if (!isJpeg(bytes))
    throw new PortraitError("INVALID_JPEG", "Not a JPEG file.");
  let payloads: Uint8Array[];
  if (typeof text === "number") {
    if (!Number.isInteger(text) || text < 4)
      throw new PortraitError(
        "INVALID_DIGITAL_TARGET",
        "A comment segment needs at least 4 bytes.",
      );
    payloads = [];
    let left = text;
    while (left > 0) {
      // Never leave a remainder under 4 bytes: shorten this segment so the last one is still valid.
      let take = Math.min(left, MAX_COM_PAYLOAD + 4);
      if (left - take > 0 && left - take < 4) take = left - 4;
      payloads.push(new Uint8Array(take - 4).fill(0x20));
      left -= take;
    }
  } else {
    const data = new TextEncoder().encode(text);
    payloads = [];
    for (let i = 0; i < Math.max(1, data.length); i += MAX_COM_PAYLOAD)
      payloads.push(data.subarray(i, i + MAX_COM_PAYLOAD));
  }
  let at = 2;
  while (
    at + 4 <= bytes.length &&
    bytes[at] === 0xff &&
    bytes[at + 1]! >= 0xe0 &&
    bytes[at + 1]! <= 0xef
  )
    at += 2 + ((bytes[at + 2]! << 8) | bytes[at + 3]!);
  if (at > bytes.length) at = 2;
  const added = payloads.reduce((n, p) => n + 4 + p.length, 0);
  const out = new Uint8Array(bytes.length + added);
  out.set(bytes.subarray(0, at), 0);
  let w = at;
  for (const p of payloads) {
    out[w++] = 0xff;
    out[w++] = 0xfe;
    out[w++] = (p.length + 2) >> 8;
    out[w++] = (p.length + 2) & 255;
    out.set(p, w);
    w += p.length;
  }
  out.set(bytes.subarray(at), w);
  return out;
}

export interface FitOptions {
  /** Lowest quality to try. Default 0.3. */
  minQuality?: number;
  /** Highest quality to try. Default 0.95. */
  maxQuality?: number;
  /** Most encode calls in total. Default 8. */
  maxIterations?: number;
}
export interface FitResult {
  bytes: Uint8Array;
  /** JPEG quality (0–1) of the encode that was kept. */
  quality: number;
  /** True when a comment segment was added to reach the minimum size. Pixels are unchanged. */
  padded: boolean;
  /** Bytes added by padding (0 when not padded). */
  paddedBytes: number;
  /** Encode calls used. */
  iterations: number;
}

/**
 * Find the highest JPEG quality whose file lands inside [minBytes, maxBytes].
 *
 * Binary search over quality (0.3–0.95, at most 8 encodes). File size is close to monotonic in
 * quality, so the search keeps the best encode at or under the maximum and stops once it is inside
 * the range. With only a maximum it keeps climbing towards the highest quality that still fits.
 *
 * If even the highest quality is smaller than `minBytes` (a small or smooth photo), the file is padded
 * with a JPEG COM segment up to the minimum. Many exam and visa forms state a minimum size in KB; a
 * comment segment satisfies that check without changing a single pixel or the quality, which is the
 * honest alternative to re-encoding a photo worse or larger than it needs to be.
 *
 * If even the lowest quality is over `maxBytes`, throws FILE_SIZE_UNREACHABLE: only fewer pixels help.
 */
export async function fitToFileSize(
  encode: (quality: number) => Promise<Uint8Array>,
  target: DigitalBytes,
  opts: FitOptions = {},
): Promise<FitResult> {
  const { minBytes, maxBytes } = target;
  const lowQ = opts.minQuality ?? MIN_JPEG_QUALITY,
    highQ = opts.maxQuality ?? MAX_JPEG_QUALITY,
    budget = Math.max(1, Math.floor(opts.maxIterations ?? 8));
  if (!(lowQ > 0 && highQ <= 1 && lowQ <= highQ))
    throw new PortraitError(
      "INVALID_DIGITAL_TARGET",
      "Quality limits must satisfy 0 < min <= max <= 1.",
    );
  if (
    (minBytes !== undefined && !(minBytes >= 0)) ||
    (maxBytes !== undefined && !(maxBytes > 0)) ||
    (minBytes !== undefined && maxBytes !== undefined && minBytes > maxBytes)
  )
    throw new PortraitError(
      "INVALID_DIGITAL_TARGET",
      "The file-size range is not valid.",
    );
  let iterations = 0;
  const run = async (q: number) => {
    iterations++;
    return encode(q);
  };
  const inRange = (n: number) =>
    (minBytes === undefined || n >= minBytes) &&
    (maxBytes === undefined || n <= maxBytes);
  const finish = (bytes: Uint8Array, quality: number): FitResult => {
    if (minBytes !== undefined && bytes.length < minBytes) {
      // A comment segment is at least 4 bytes; a smaller gap grows to 4.
      const grow = Math.max(4, minBytes - bytes.length);
      if (maxBytes !== undefined && bytes.length + grow > maxBytes)
        throw new PortraitError(
          "FILE_SIZE_UNREACHABLE",
          "The file cannot be padded to the minimum size without passing the maximum. Adjust the size range.",
        );
      return {
        bytes: insertJpegComment(bytes, grow),
        quality,
        padded: true,
        paddedBytes: grow,
        iterations,
      };
    }
    return { bytes, quality, padded: false, paddedBytes: 0, iterations };
  };
  const top = await run(highQ);
  if (inRange(top.length)) return finish(top, highQ);
  if (maxBytes === undefined || top.length <= maxBytes)
    return finish(top, highQ);
  // Too big at the highest quality. Check the floor before searching.
  const bottom = await run(lowQ);
  if (bottom.length > maxBytes)
    throw new PortraitError(
      "FILE_SIZE_UNREACHABLE",
      `Even at the lowest quality this photo is ${(bottom.length / 1024).toFixed(1)} KB, over the ${(maxBytes / 1024).toFixed(1)} KB limit. Choose a smaller pixel size (for example 80% of the width and height) and try again.`,
    );
  let lo = lowQ,
    hi = highQ,
    best = bottom;
  while (iterations < budget && hi - lo > 0.004) {
    const mid = Math.round(((lo + hi) / 2) * 1000) / 1000;
    if (mid <= lo || mid >= hi) break;
    const bytes = await run(mid);
    if (bytes.length > maxBytes) hi = mid;
    else {
      lo = mid;
      best = bytes;
      if (inRange(bytes.length)) {
        // In range. With a stated minimum that is enough. With only a maximum, keep going
        // unless the file is already close to the limit.
        if (minBytes !== undefined || bytes.length >= maxBytes * 0.95) break;
      }
    }
  }
  return finish(best, lo);
}
