import { analyzePhoto, guideBands } from "../core/index";
import type { Preset } from "../core/index";

/**
 * Live camera hints. Runs MediaPipe's FaceDetector in VIDEO mode on a small copy of the frame, about five
 * times a second, entirely on this device. It reuses the same self-hosted wasm and model files the photo
 * engine uses (/wasm and /models/face.tflite), so nothing is fetched from another site.
 *
 * The hints are measurements against the document's own guide bands. They estimate; the studio shows the
 * real measurements afterwards, and the issuing authority decides acceptance.
 */

/** Plain-language size note shown before the camera starts. The wasm runtime is the bulk of it. */
export const LIVE_HINTS_DOWNLOAD_NOTE = "about 11 MB, downloaded once and then cached";

/** What a hint looks like to the UI. `text` is short and complete on its own. */
export type HintId = "face" | "distance" | "centre" | "level" | "light";
export type HintState = "ok" | "warn" | "idle";
export interface Hint {
  id: HintId;
  state: HintState;
  text: string;
}
export interface LiveHints {
  /** "loading": the face model is downloading. "ready": hints are live. "error": hints are off, capture still works. */
  status: "loading" | "ready" | "error";
  message?: string;
  faces: number;
  hints: Hint[];
  /** Both eye positions as 0-1 fractions of the raw (unmirrored) video frame, when exactly one face is found. */
  eyes?: { x: number; y: number }[];
  /** True when face, distance, centre and level all read as fine. */
  aligned: boolean;
}

/** The frame the overlay draws and the hints measure against. */
export interface FrameSpec {
  widthMm: number;
  heightMm: number;
  head: { minMm: number; maxMm: number };
  /** Eye line measured up from the bottom of the frame. */
  eyes: { minMm: number; maxMm: number };
  /** True when there is no preset: a generic 35 x 45 mm frame. */
  generic: boolean;
}
/** Head 70-80% of the height, eyes 56-69% up from the bottom: the common 35 x 45 mm layout. */
function fractions(widthMm: number, heightMm: number, generic: boolean): FrameSpec {
  return {
    widthMm,
    heightMm,
    head: { minMm: heightMm * 0.7, maxMm: heightMm * 0.8 },
    eyes: { minMm: heightMm * 0.56, maxMm: heightMm * 0.69 },
    generic,
  };
}
export function frameSpec(preset?: Preset): FrameSpec {
  if (!preset) return fractions(35, 45, true);
  const bands = guideBands(preset);
  const base = fractions(preset.widthMm, preset.heightMm, false);
  return {
    ...base,
    head: bands.head ?? base.head,
    eyes: bands.eyesFromBottom ?? base.eyes,
  };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
export interface OverlayLayout {
  frame: Rect;
  pxPerMm: number;
  /** The eye-line band, in video pixels. */
  eyeBand: Rect;
  centreX: number;
  /** Head outlines at the smallest and largest allowed head height, both placed on the middle of the eye band. */
  headMin: Ellipse;
  headMax: Ellipse;
}
/** Crown to eye line is about 46% of crown-to-chin; a head is about 72% as wide as it is tall (with hair). */
const EYES_FROM_CROWN = 0.46;
const HEAD_WIDTH_RATIO = 0.72;
/** BlazeFace boxes run from about the brow to the chin; crown-to-chin is about this much larger. */
const HEAD_FROM_BOX = 1.35;
/** The frame takes this share of the video's height (or width, whichever binds first). */
const FRAME_SHARE = 0.92;

export function overlayLayout(spec: FrameSpec, videoW: number, videoH: number): OverlayLayout {
  const aspect = spec.widthMm / spec.heightMm;
  const h = Math.min(videoH * FRAME_SHARE, (videoW * FRAME_SHARE) / aspect);
  const w = h * aspect;
  const frame = { x: (videoW - w) / 2, y: (videoH - h) / 2, w, h };
  const pxPerMm = h / spec.heightMm;
  const yFromBottom = (mm: number) => frame.y + h - mm * pxPerMm;
  const eyeMid = yFromBottom((spec.eyes.minMm + spec.eyes.maxMm) / 2);
  const head = (headMm: number): Ellipse => {
    const H = headMm * pxPerMm;
    const crown = eyeMid - EYES_FROM_CROWN * H;
    const chin = eyeMid + (1 - EYES_FROM_CROWN) * H;
    return { cx: frame.x + w / 2, cy: (crown + chin) / 2, rx: (H * HEAD_WIDTH_RATIO) / 2, ry: H / 2 };
  };
  return {
    frame,
    pxPerMm,
    eyeBand: {
      x: frame.x,
      y: yFromBottom(spec.eyes.maxMm),
      w,
      h: (spec.eyes.maxMm - spec.eyes.minMm) * pxPerMm,
    },
    centreX: frame.x + w / 2,
    headMin: head(spec.head.minMm),
    headMax: head(spec.head.maxMm),
  };
}

/* ---- Evaluation: pure, so it can be tested without a camera. ---- */

export interface DetectedFace {
  /** Box in video pixels. */
  box: { x: number; y: number; w: number; h: number };
  /** Subject's right eye first, then left eye, in video pixels. */
  eyes?: [{ x: number; y: number }, { x: number; y: number }];
  /** Eye-line tilt in degrees, averaged over recent frames. Falls back to the eyes above when absent. */
  tiltDeg?: number;
}
export const LEVEL_LIMIT_DEG = 3;
const CENTRE_LIMIT = 0.06; // share of the frame width
const DISTANCE_SLACK = 0.03; // share of the head range

export interface LightInput {
  exposure?: { status: "pass" | "warn" | "unknown"; value?: number };
  even?: { status: "pass" | "warn" | "unknown" };
}

const h = (id: HintId, state: HintState, text: string): Hint => ({ id, state, text });

export function evaluateFaces(
  spec: FrameSpec,
  layout: OverlayLayout,
  faces: DetectedFace[],
  light: LightInput | undefined,
  mirrored: boolean,
): Hint[] {
  if (faces.length === 0)
    return [
      h("face", "warn", "No face found. Face the camera."),
      h("distance", "idle", "Waiting for a face"),
      h("centre", "idle", "Waiting for a face"),
      h("level", "idle", "Waiting for a face"),
      h("light", "idle", "Waiting for a face"),
    ];
  if (faces.length > 1)
    return [
      h("face", "warn", `${faces.length} faces found. Keep one person in the frame.`),
      h("distance", "idle", "Waiting for one face"),
      h("centre", "idle", "Waiting for one face"),
      h("level", "idle", "Waiting for one face"),
      h("light", "idle", "Waiting for one face"),
    ];
  const face = faces[0]!;
  const out: Hint[] = [h("face", "ok", "One face found")];
  // Distance: estimated crown-to-chin height against the head band.
  const headMm = ((face.box.h * HEAD_FROM_BOX) / layout.frame.h) * spec.heightMm;
  const { minMm, maxMm } = spec.head;
  const slack = (maxMm - minMm) * DISTANCE_SLACK;
  if (headMm < minMm - slack) out.push(h("distance", "warn", "Head looks small. Move closer."));
  else if (headMm > maxMm + slack) out.push(h("distance", "warn", "Head looks large. Move back."));
  else out.push(h("distance", "ok", "Head size is inside the band"));
  // Centre: horizontal offset from the centre line, then eye height against the eye band.
  const rawDx = (face.box.x + face.box.w / 2 - layout.centreX) / layout.frame.w;
  const dx = mirrored ? -rawDx : rawDx; // what the person sees on the preview
  const eyeY = face.eyes ? (face.eyes[0].y + face.eyes[1].y) / 2 : face.box.y + face.box.h * 0.35;
  const band = layout.eyeBand;
  if (Math.abs(dx) > CENTRE_LIMIT)
    out.push(h("centre", "warn", dx < 0 ? "Off centre. Shift right in the frame." : "Off centre. Shift left in the frame."));
  else if (eyeY < band.y - band.h * 0.25)
    out.push(h("centre", "warn", "Eyes are above the eye band."));
  else if (eyeY > band.y + band.h * 1.25)
    out.push(h("centre", "warn", "Eyes are below the eye band."));
  else out.push(h("centre", "ok", "Centred, eyes near the line"));
  // Level: tilt of the line through both eyes.
  if (face.eyes) {
    const tilt =
      face.tiltDeg ??
      Math.abs((Math.atan2(face.eyes[1].y - face.eyes[0].y, face.eyes[1].x - face.eyes[0].x) * 180) / Math.PI);
    out.push(
      tilt > LEVEL_LIMIT_DEG
        ? h("level", "warn", `Eyes tilt ${tilt.toFixed(1)} degrees. Level them.`)
        : h("level", "ok", "Eyes are level"),
    );
  } else out.push(h("level", "idle", "Eyes not located"));
  // Light: from the same measurements the studio uses.
  if (!light || (!light.exposure && !light.even)) out.push(h("light", "idle", "Measuring light"));
  else if (light.exposure?.status === "warn")
    out.push(
      (light.exposure.value ?? 50) < 50
        ? h("light", "warn", "Face is dark. Face a window or add a lamp in front.")
        : h("light", "warn", "Face is very bright. Avoid direct sun."),
    );
  else if (light.even?.status === "warn")
    out.push(h("light", "warn", "One side of the face is darker. Face the light."));
  else if (light.exposure?.status === "pass" || light.even?.status === "pass")
    out.push(h("light", "ok", "Light looks even"));
  else out.push(h("light", "idle", "Light could not be read"));
  return out;
}

/* ---- The detector and the loop. ---- */

type Detector = import("@mediapipe/tasks-vision").FaceDetector;
let detectorPromise: Promise<Detector> | undefined;
let usingGpu = false;

async function createDetector(delegate: "GPU" | "CPU"): Promise<Detector> {
  const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
  return FaceDetector.createFromOptions(await FilesetResolver.forVisionTasks("/wasm"), {
    baseOptions: { modelAssetPath: "/models/face.tflite", delegate },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.5,
  });
}
function loadDetector(forceCpu = false): Promise<Detector> {
  if (forceCpu) {
    const old = detectorPromise;
    detectorPromise = undefined;
    void old?.then((d) => d.close()).catch(() => {});
  }
  if (!detectorPromise)
    detectorPromise = (async () => {
      if (!forceCpu) {
        try {
          const d = await createDetector("GPU");
          usingGpu = true;
          return d;
        } catch {
          /* No usable GPU delegate here: fall through to CPU. */
        }
      }
      usingGpu = false;
      return createDetector("CPU");
    })().catch((e) => {
      detectorPromise = undefined;
      throw e;
    });
  return detectorPromise;
}
/** Start fetching the face model early (for example while the person reads the permission note). */
export function preloadLiveDetector(): void {
  void loadDetector().catch(() => {});
}
/** Free the detector's memory. Call when the camera closes; the next start reloads it from cache. */
export async function releaseLiveDetector(): Promise<void> {
  const pending = detectorPromise;
  detectorPromise = undefined;
  try {
    (await pending)?.close();
  } catch {
    /* Nothing to free. */
  }
}

export interface LiveOptions {
  /** True when the preview is mirrored, so left and right hints match what the person sees. */
  mirrored?: boolean;
}
export interface LiveHandle {
  stop(): void;
}

const DETECT_MS = 200; // ~5 fps
const LIGHT_MS = 1000;
const SMALL_WIDTH = 480;
const TILT_FRAMES = 5;
const HOLD_FRAMES = 3; // a changed hint must hold this many frames before it shows: no flicker

const sameHint = (a: Hint, b: Hint) => a.state === b.state && a.text === b.text;

/**
 * Start live hints for a playing video. `cb` runs when a hint changes and when the eye positions move.
 * The returned handle's stop() ends the loop; it is safe to call more than once.
 */
export function startLiveHints(
  video: HTMLVideoElement,
  preset: Preset | undefined,
  cb: (hints: LiveHints) => void,
  options: LiveOptions = {},
): LiveHandle {
  const spec = frameSpec(preset);
  const mirrored = !!options.mirrored;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const shown = new Map<HintId, Hint>();
  const candidate = new Map<HintId, { hint: Hint; n: number }>();
  let light: LightInput | undefined;
  let lastLight = 0;
  let lastStamp = 0;
  const tilts: number[] = [];
  let lastKey = "";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const emit = (status: LiveHints["status"], message?: string) =>
    cb({ status, message, faces: 0, hints: [], aligned: false });
  emit("loading");

  const settle = (fresh: Hint[], advance: (id: HintId) => boolean) => {
    for (const hint of fresh) {
      const current = shown.get(hint.id);
      if (!current) {
        shown.set(hint.id, hint);
        continue;
      }
      if (sameHint(current, hint)) {
        candidate.delete(hint.id);
        continue;
      }
      if (!advance(hint.id)) continue;
      const c = candidate.get(hint.id);
      const n = c && sameHint(c.hint, hint) ? c.n + 1 : 1;
      if (n >= HOLD_FRAMES) {
        shown.set(hint.id, hint);
        candidate.delete(hint.id);
      } else candidate.set(hint.id, { hint, n });
    }
  };

  const tick = async (detector: Detector) => {
    if (stopped) return;
    const began = performance.now();
    try {
      if (!document.hidden && video.readyState >= 2 && !video.paused && video.videoWidth > 0 && ctx) {
        const vw = video.videoWidth,
          vh = video.videoHeight;
        const cw = Math.min(SMALL_WIDTH, vw),
          ch = Math.max(1, Math.round((cw * vh) / vw));
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
        ctx.drawImage(video, 0, 0, cw, ch);
        const stamp = Math.max(lastStamp + 1, Math.round(performance.now()));
        lastStamp = stamp;
        const { detections } = detector.detectForVideo(canvas, stamp);
        const k = vw / cw;
        const faces: DetectedFace[] = detections
          .filter((d) => d.boundingBox)
          .map((d) => {
            const b = d.boundingBox!;
            const kp = d.keypoints;
            return {
              box: { x: b.originX * k, y: b.originY * k, w: b.width * k, h: b.height * k },
              eyes:
                kp && kp.length >= 2
                  ? [
                      { x: kp[0]!.x * vw, y: kp[0]!.y * vh },
                      { x: kp[1]!.x * vw, y: kp[1]!.y * vh },
                    ]
                  : undefined,
            } as DetectedFace;
          });
        // The model sees ~128 px, so one frame's eye positions jitter by a pixel or two: average the tilt.
        if (faces.length === 1 && faces[0]!.eyes) {
          const [a, b] = faces[0]!.eyes;
          tilts.push(Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI));
          if (tilts.length > TILT_FRAMES) tilts.shift();
          faces[0]!.tiltDeg = tilts.reduce((x, y) => x + y, 0) / tilts.length;
        } else tilts.length = 0;
        // Light is measured about once a second, on the same small frame.
        let lightRan = false;
        if (faces.length === 1 && performance.now() - lastLight >= LIGHT_MS) {
          lastLight = performance.now();
          lightRan = true;
          const box = detections[0]!.boundingBox!;
          const px = ctx.getImageData(0, 0, cw, ch);
          const checks = analyzePhoto({
            width: cw,
            height: ch,
            rgba: px.data,
            face: { x: box.originX, y: box.originY, width: box.width, height: box.height },
          });
          light = {
            exposure: checks.find((c) => c.id === "exposure"),
            even: checks.find((c) => c.id === "lighting-even"),
          };
        } else if (faces.length !== 1) light = undefined;
        const layout = overlayLayout(spec, vw, vh);
        const fresh = evaluateFaces(spec, layout, faces, light, mirrored);
        // A changed hint waits a few frames before it shows. Light only advances when it was re-measured.
        settle(fresh, (id) => (id === "light" ? lightRan : true));
        const hints = (["face", "distance", "centre", "level", "light"] as HintId[]).map((id) => shown.get(id)!).filter(Boolean);
        const eyes =
          faces.length === 1 && faces[0]!.eyes
            ? faces[0]!.eyes.map((e) => ({ x: e.x / vw, y: e.y / vh }))
            : undefined;
        const aligned = ["face", "distance", "centre", "level"].every((id) => shown.get(id as HintId)?.state === "ok");
        const key = hints.map((x) => `${x.id}:${x.state}:${x.text}`).join("|") + (eyes ? eyes.map((e) => `${e.x.toFixed(3)},${e.y.toFixed(3)}`).join(";") : "");
        if (key !== lastKey) {
          lastKey = key;
          cb({ status: "ready", faces: faces.length, hints, eyes, aligned });
        }
      }
    } catch {
      if (stopped) return;
      if (usingGpu) {
        // The GPU delegate failed while running: rebuild on CPU and carry on.
        try {
          const cpu = await loadDetector(true);
          if (!stopped) timer = setTimeout(() => void tick(cpu), DETECT_MS);
          return;
        } catch {
          /* fall through to the error state */
        }
      }
      if (!stopped) emit("error", "Live hints stopped. You can still take the photo.");
      return;
    }
    if (!stopped) timer = setTimeout(() => void tick(detector), Math.max(0, DETECT_MS - (performance.now() - began)));
  };

  loadDetector()
    .then((detector) => {
      if (stopped) return;
      emit("ready");
      void tick(detector);
    })
    .catch(() => {
      if (!stopped) emit("error", "Live hints could not start. You can still take the photo.");
    });

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
