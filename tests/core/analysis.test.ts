import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { analyzePhoto, ANALYSIS_THRESHOLDS, type PhotoCheck } from "../../src/core/index.js";
import { analyzeFile } from "../../src/node/analysis.js";

type RGB = [number, number, number];
interface SceneOptions {
  w?: number;
  h?: number;
  bg?: (x: number, y: number, w: number, h: number) => RGB;
  /** 1 = as is; <1 darkens the left half of the face. */
  leftFace?: number;
  /** Multiplies every pixel. */
  exposure?: number;
  textured?: boolean;
}
const hash = (x: number, y: number) => {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const WHITE: RGB = [238, 236, 228];
const flat = (c: RGB) => () => c;

/** A synthetic portrait: a background, a hair/head ellipse, a textured skin ellipse and shoulders. */
function scene(o: SceneOptions = {}) {
  const w = o.w ?? 480,
    h = o.h ?? 600;
  const bg = o.bg ?? flat(WHITE);
  const cx = w / 2,
    cy = 0.42 * h,
    rx = 0.16 * w,
    ry = 0.2 * h;
  const person = (x: number, y: number) =>
    ((x - cx) / (rx * 1.18)) ** 2 + ((y - cy) / (ry * 1.18)) ** 2 <= 1 ||
    (y > 0.72 * h && Math.abs(x - cx) < 0.36 * w) ||
    (y > 0.62 * h && Math.abs(x - cx) < 0.09 * w);
  const rgba = new Uint8ClampedArray(w * h * 4);
  const exposure = o.exposure ?? 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c: RGB;
      const inFace = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      if (inFace) {
        const t = o.textured === false ? 0 : 14 * Math.sin(x * 1.3) * Math.sin(y * 1.1) + (hash(x, y) - 0.5) * 12;
        const k = x < cx ? (o.leftFace ?? 1) : 1;
        c = [(205 + t) * k, (160 + t) * k, (140 + t) * k];
      } else if (person(x, y)) c = y > 0.62 * h ? [70, 80, 100] : [58, 48, 44];
      else c = bg(x, y, w, h);
      const i = (y * w + x) * 4;
      rgba[i] = c[0] * exposure;
      rgba[i + 1] = c[1] * exposure;
      rgba[i + 2] = c[2] * exposure;
      rgba[i + 3] = 255;
    }
  const face = { x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry };
  const mw = w >> 1,
    mh = h >> 1;
  const alpha = new Uint8ClampedArray(mw * mh);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) alpha[y * mw + x] = person(x * 2 + 1, y * 2 + 1) ? 255 : 0;
  return { w, h, rgba, face, mask: { width: mw, height: mh, alpha } };
}
const byId = (checks: PhotoCheck[]) => Object.fromEntries(checks.map((c) => [c.id, c])) as Record<PhotoCheck["id"], PhotoCheck>;
const BACKGROUND_IDS = ["background-even", "background-shadow"] as const;
const desc = (c: PhotoCheck[]) => c.map((x) => `${x.id}:${x.status}:${x.value ?? ""}`).join(" ");

test("(a) plain off-white wall and a centred head: every check passes, border and mask paths", () => {
  const s = scene();
  for (const withMask of [false, true]) {
    const r = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face, mask: withMask ? s.mask : undefined }, { backgroundColors: ["white", "off-white"] }));
    for (const id of Object.keys(r) as PhotoCheck["id"][]) assert.equal(r[id].status, "pass", `${withMask ? "mask" : "border"} ${id}: ${r[id].message}`);
    assert.equal(Object.keys(r).length, 6);
  }
});

test("(b) a left-to-right shadow gradient warns for background-shadow (and evenness)", () => {
  const s = scene({ bg: (x, _y, w) => { const k = 1 - 0.4 * (x / w); return [WHITE[0] * k, WHITE[1] * k, WHITE[2] * k]; } });
  for (const withMask of [false, true]) {
    const r = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face, mask: withMask ? s.mask : undefined }));
    assert.equal(r["background-shadow"].status, "warn", desc(Object.values(r)));
    assert.match(r["background-shadow"].message, /right side is \d+% darker than the left/);
    assert.match(r["background-shadow"].tip!, /window/);
    assert.equal(r["background-even"].status, "warn");
    assert.match(r["background-even"].message, /^Background varies by \d+%/);
  }
});

test("(b2) a shadow on one side only, close to the head, is caught", () => {
  const s = scene({ bg: (x, _y, w) => (x < 0.3 * w ? [140, 138, 132] : WHITE) });
  const r = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face, mask: s.mask }));
  assert.equal(r["background-shadow"].status, "warn");
  assert.match(r["background-shadow"].message, /left side/);
});

test("(c) beige and blue walls warn when white or off-white is expected; no expectation is unknown", () => {
  for (const [name, colour] of [["beige", [222, 205, 170]], ["blue", [100, 150, 220]], ["mid grey", [128, 128, 128]]] as const) {
    const s = scene({ bg: flat(colour as RGB) });
    const r = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face }, { backgroundColors: ["white", "off-white"] }));
    assert.equal(r["background-colour"].status, "warn", name);
    assert.match(r["background-colour"].message, /asks for white or off white/);
    assert.match(r["background-colour"].tip!, /white or light wall/);
    assert.deepEqual(r["background-colour"].rgb, colour);
    const none = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face }));
    assert.equal(none["background-colour"].status, "unknown");
    assert.match(none["background-colour"].message, /background measures/);
  }
  const blue = scene({ bg: flat([190, 215, 240]) });
  assert.equal(byId(analyzePhoto({ width: blue.w, height: blue.h, rgba: blue.rgba, face: blue.face }, { backgroundColors: ["light blue"] }))["background-colour"].status, "pass");
  const dimWhite = scene({ bg: flat([205, 205, 200]) });
  assert.equal(byId(analyzePhoto({ width: dimWhite.w, height: dimWhite.h, rgba: dimWhite.rgba, face: dimWhite.face }, { backgroundColors: ["#FFFFFF"] }))["background-colour"].status, "pass");
});

test("(d) a half-dark face warns for lighting-even; an evenly lit one does not", () => {
  const dark = scene({ leftFace: 0.45 });
  const r = byId(analyzePhoto({ width: dark.w, height: dark.h, rgba: dark.rgba, face: dark.face }));
  assert.equal(r["lighting-even"].status, "warn");
  assert.match(r["lighting-even"].message, /left side of the face is \d+% darker/);
  const mild = scene({ leftFace: 0.92 });
  assert.equal(byId(analyzePhoto({ width: mild.w, height: mild.h, rgba: mild.rgba, face: mild.face }))["lighting-even"].status, "pass");
  const noFace = byId(analyzePhoto({ width: dark.w, height: dark.h, rgba: dark.rgba }));
  assert.equal(noFace["lighting-even"].status, "unknown");
  assert.equal(noFace.sharpness.status, "unknown");
});

test("(e) a very dark photo warns for exposure; a blown-out one too", () => {
  const dark = scene({ exposure: 0.15 });
  const r = byId(analyzePhoto({ width: dark.w, height: dark.h, rgba: dark.rgba, face: dark.face }));
  assert.equal(r.exposure.status, "warn");
  assert.match(r.exposure.message, /dark/);
  const bright = scene({ exposure: 1.6 });
  const b = byId(analyzePhoto({ width: bright.w, height: bright.h, rgba: bright.rgba, face: bright.face }));
  assert.equal(b.exposure.status, "warn");
  assert.match(b.exposure.message, /bright|highlights/);
  // Dark skin in good light is not flagged.
  const deep = scene({ exposure: 0.42 });
  assert.equal(byId(analyzePhoto({ width: deep.w, height: deep.h, rgba: deep.rgba, face: deep.face })).exposure.status, "pass");
});

test("(f) sharpness: a blurred face warns, a sharp one passes", async () => {
  const s = scene();
  const sharp0 = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face }));
  assert.equal(sharp0.sharpness.status, "pass", sharp0.sharpness.message);
  const raw = await sharp(Buffer.from(s.rgba.buffer), { raw: { width: s.w, height: s.h, channels: 4 } }).blur(4).raw().toBuffer();
  const blurred = byId(analyzePhoto({ width: s.w, height: s.h, rgba: new Uint8ClampedArray(raw), face: s.face }));
  assert.equal(blurred.sharpness.status, "warn", blurred.sharpness.message);
  assert(blurred.sharpness.value! < sharp0.sharpness.value! / 4);
  assert.match(blurred.sharpness.tip!, /timer|focus/);
  // Detail patch of the face box takes precedence for sharpness.
  const patch = await sharp(Buffer.from(s.rgba.buffer), { raw: { width: s.w, height: s.h, channels: 4 } })
    .extract({ left: Math.round(s.face.x), top: Math.round(s.face.y), width: Math.round(s.face.width), height: Math.round(s.face.height) })
    .resize(228).raw().toBuffer({ resolveWithObject: true });
  const withDetail = byId(analyzePhoto({ width: s.w, height: s.h, rgba: new Uint8ClampedArray(raw), face: s.face, faceDetail: { width: patch.info.width, height: patch.info.height, rgba: patch.data } }));
  assert.equal(withDetail.sharpness.status, "pass");
});

test("(g) mask and border paths agree on the plain and shadowed scenes", () => {
  const scenes = [scene(), scene({ bg: (x, _y, w) => { const k = 1 - 0.4 * (x / w); return [WHITE[0] * k, WHITE[1] * k, WHITE[2] * k]; } })];
  for (const s of scenes) {
    const a = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face }));
    const b = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face, mask: s.mask }));
    for (const id of [...BACKGROUND_IDS, "background-colour" as const]) assert.equal(a[id].status, b[id].status, `${id}: ${a[id].message} / ${b[id].message}`);
    assert(Math.abs(a["background-shadow"].value! - b["background-shadow"].value!) < 15); // border reads the outer band, mask the outer thirds: same verdict, slightly different size
  }
});

test("a crop restricts the measured area; the person filling the frame is unknown, not a false alarm", () => {
  const s = scene({ bg: (x, _y, w) => (x < 0.25 * w ? [90, 90, 90] : WHITE) });
  const cropped = byId(analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face, crop: { x: 0.3 * s.w, y: 0, width: 0.4 * s.w, height: s.h } }));
  assert.equal(cropped["background-even"].status === "pass" || cropped["background-even"].status === "unknown", true, desc(Object.values(cropped)));
  const tight = scene({ w: 400, h: 500 });
  const nearly = byId(analyzePhoto({ width: tight.w, height: tight.h, rgba: tight.rgba, face: tight.face, mask: { width: 2, height: 2, alpha: new Uint8Array([255, 255, 255, 255]) } }));
  assert.equal(nearly["background-even"].status, "unknown");
  assert.equal(nearly["background-colour"].status, "unknown");
});

test("bad input returns six unknown checks; wording has no acceptance claims", () => {
  const r = analyzePhoto({ width: 100, height: 100, rgba: new Uint8Array(10) });
  assert.equal(r.length, 6);
  assert(r.every((c) => c.status === "unknown"));
  const s = scene({ leftFace: 0.4, bg: flat([120, 140, 200]), exposure: 0.3 });
  for (const c of analyzePhoto({ width: s.w, height: s.h, rgba: s.rgba, face: s.face }, { backgroundColors: ["white"] }))
    assert.doesNotMatch(`${c.message} ${c.tip ?? ""}`, /complian|approved|guarantee|verified|official/i);
});

test("(h) a 12 MP photo is analysed in under 50 ms", () => {
  const s = scene({ w: 4000, h: 3000, textured: false });
  const input = { width: s.w, height: s.h, rgba: s.rgba, face: s.face, mask: s.mask };
  analyzePhoto(input); // warm up the JIT
  let best = Infinity;
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    analyzePhoto(input, { backgroundColors: ["white"] });
    best = Math.min(best, performance.now() - t);
  }
  const budget = process.env.CI || process.env.SLOW_MACHINE ? 150 : 50;
  console.log(`12 MP analysis: ${best.toFixed(1)} ms (budget ${budget} ms)`);
  assert(best < budget, `took ${best.toFixed(1)} ms`);
});

test("analyzeFile reads a file through sharp (border path, EXIF-safe)", async () => {
  const s = scene();
  const png = await sharp(Buffer.from(s.rgba.buffer), { raw: { width: s.w, height: s.h, channels: 4 } }).png().toBuffer();
  const os = await import("node:os"), fs = await import("node:fs/promises");
  const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "pp-analysis-")), "scene.png");
  await fs.writeFile(file, png);
  try {
    const r = byId(await analyzeFile(file, { face: s.face, expected: { backgroundColors: ["white", "off-white"] } }));
    for (const id of Object.keys(r) as PhotoCheck["id"][]) assert.equal(r[id].status, "pass", `${id}: ${r[id].message}`);
  } finally {
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  }
});

const publicDir = path.resolve(import.meta.dirname, "../../public");
async function fileChecks(name: string) {
  const { data, info } = await sharp(path.join(publicDir, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { info, checks: byId(analyzePhoto({ width: info.width, height: info.height, rgba: new Uint8ClampedArray(data) }, { backgroundColors: ["white", "off-white", "light grey"] })) };
}
test("public/demo-shadow.png yields a background warning", { skip: existsSync(path.join(publicDir, "demo-shadow.png")) ? false : "public/demo-shadow.png does not exist yet" }, async () => {
  const { checks } = await fileChecks("demo-shadow.png");
  assert(checks["background-shadow"].status === "warn" || checks["background-even"].status === "warn", desc(Object.values(checks)));
});
test("public/demo-portrait.png passes the background checks", { skip: existsSync(path.join(publicDir, "demo-portrait.png")) ? false : "public/demo-portrait.png does not exist yet" }, async () => {
  const { checks } = await fileChecks("demo-portrait.png");
  console.log("demo-portrait:", desc(Object.values(checks)));
  assert.equal(checks["background-even"].status, "pass", checks["background-even"].message);
  assert.equal(checks["background-shadow"].status, "pass", checks["background-shadow"].message);
  assert(ANALYSIS_THRESHOLDS.maxSide === 512);
});

test("public/demo-portrait.png: sharp original passes sharpness, a heavy blur warns", { skip: existsSync(path.join(publicDir, "demo-portrait.png")) ? false : "public/demo-portrait.png does not exist yet" }, async () => {
  const face = { x: 330, y: 570, width: 360, height: 430 };
  const load = async (blur: number) => {
    const img = sharp(path.join(publicDir, "demo-portrait.png"));
    const { data, info } = await (blur ? img.blur(blur) : img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return byId(analyzePhoto({ width: info.width, height: info.height, rgba: new Uint8ClampedArray(data), face }, { backgroundColors: ["white"] }));
  };
  const sharpOne = await load(0), soft = await load(4);
  assert.equal(sharpOne.sharpness.status, "pass", sharpOne.sharpness.message);
  assert.equal(soft.sharpness.status, "warn", soft.sharpness.message);
  for (const id of ["lighting-even", "exposure", "background-colour"] as const) assert.equal(sharpOne[id].status, "pass", sharpOne[id].message);
});
