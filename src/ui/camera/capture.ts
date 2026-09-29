/**
 * Camera plumbing with no React in it: open a stream, take a full-resolution still, explain errors.
 * Nothing here touches the network. A still leaves the page only through the onCapture callback.
 */

export type Facing = "user" | "environment";

export interface OpenedCamera {
  stream: MediaStream;
  track: MediaStreamTrack;
  /** True when the preview should be mirrored (a front camera). The captured file never is. */
  mirrored: boolean;
  /** More than one camera to switch between. */
  canSwitch: boolean;
}

export type CameraProblem = "insecure" | "unsupported" | "denied" | "none" | "busy" | "other";
export class CameraError extends Error {
  problem: CameraProblem;
  constructor(problem: CameraProblem, message: string) {
    super(message);
    this.problem = problem;
  }
}
export const CAMERA_MESSAGES: Record<CameraProblem, string> = {
  insecure: "The camera only works on a secure (HTTPS) page. Open this site over https, or upload a photo instead.",
  unsupported: "This browser cannot open a camera from a web page. Upload a photo instead.",
  denied:
    "Camera access is blocked. Allow the camera for this site in your browser's address bar or settings, then try again. Or upload a photo instead.",
  none: "No camera was found on this device. Upload a photo instead.",
  busy: "The camera could not start. Another app may be using it. Close that app and try again, or upload a photo instead.",
  other: "The camera could not start. Try again, or upload a photo instead.",
};

export function cameraSupport(): CameraProblem | undefined {
  if (typeof window !== "undefined" && window.isSecureContext === false) return "insecure";
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
  return undefined;
}

function classify(e: unknown): CameraProblem {
  const name = (e as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "none";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
  return "other";
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Open a camera at the highest resolution it offers. `ideal` never fails on its own, so the fallbacks only
 * matter for browsers that reject the width/height keys.
 */
export async function openCamera(facing: Facing): Promise<OpenedCamera> {
  const problem = cameraSupport();
  if (problem) throw new CameraError(problem, CAMERA_MESSAGES[problem]);
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: facing }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false },
    { video: { facingMode: { ideal: facing } }, audio: false },
    { video: true, audio: false },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      last = e;
      const p = classify(e);
      // A denied, missing or busy camera will not improve with looser constraints.
      if (p === "denied" || p === "none" || p === "busy") throw new CameraError(p, CAMERA_MESSAGES[p]);
      continue;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) {
      stopStream(stream);
      throw new CameraError("none", CAMERA_MESSAGES.none);
    }
    const settings = track.getSettings?.() ?? {};
    let canSwitch = false;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      canSwitch = devices.filter((d) => d.kind === "videoinput").length > 1;
      const modes = (track.getCapabilities?.() as { facingMode?: string[] } | undefined)?.facingMode;
      if (modes && modes.length > 1) canSwitch = true;
    } catch {
      /* Switching stays hidden. */
    }
    return {
      stream,
      track,
      canSwitch,
      mirrored: settings.facingMode ? settings.facingMode === "user" : facing === "user",
    };
  }
  const p = classify(last);
  throw new CameraError(p, CAMERA_MESSAGES[p]);
}

/** Safari refuses canvases above about 16.7 million pixels. */
const MAX_CANVAS_AREA = 16_000_000;
const JPEG_QUALITY = 0.95;

interface ImageCaptureLike {
  takePhoto(settings?: Record<string, number>): Promise<Blob>;
  getPhotoCapabilities(): Promise<{ imageWidth?: { max: number }; imageHeight?: { max: number } }>;
}
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

async function toJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const scale = Math.min(1, Math.sqrt(MAX_CANVAS_AREA / (w * h)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not open the photo canvas.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height); // never mirrored: the file shows the scene as the camera saw it
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("The photo could not be saved. Try again.");
  return blob;
}

/** takePhoto() gives the sensor's full size on Chrome. Used only when it is bigger than the preview and has the same framing. */
async function stillFromImageCapture(video: HTMLVideoElement, track: MediaStreamTrack): Promise<Blob | undefined> {
  const Ctor = (globalThis as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
  if (!Ctor) return undefined;
  try {
    const ic = new Ctor(track);
    const caps = await ic.getPhotoCapabilities();
    const mw = caps.imageWidth?.max,
      mh = caps.imageHeight?.max;
    if (!mw || !mh) return undefined;
    const sameShape = Math.abs(mw / mh - video.videoWidth / video.videoHeight) < 0.03;
    if (!sameShape || mw * mh <= video.videoWidth * video.videoHeight * 1.05) return undefined;
    const blob = await ic.takePhoto({ imageWidth: mw, imageHeight: mh });
    if (!blob || !blob.size) return undefined;
    if (blob.type === "image/jpeg") return blob;
    const bitmap = await createImageBitmap(blob);
    try {
      return await toJpeg(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  } catch {
    return undefined;
  }
}

export interface Still {
  file: File;
  width: number;
  height: number;
}
/** Take a full-resolution JPEG from the live video. */
export async function captureStill(video: HTMLVideoElement, track: MediaStreamTrack | undefined): Promise<Still> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("The camera is not ready yet.");
  let blob = track ? await stillFromImageCapture(video, track) : undefined;
  if (!blob) blob = await toJpeg(video, video.videoWidth, video.videoHeight);
  const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  let width = video.videoWidth,
    height = video.videoHeight;
  try {
    const bitmap = await createImageBitmap(blob);
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  } catch {
    /* Keep the video's size. */
  }
  return { file, width, height };
}
