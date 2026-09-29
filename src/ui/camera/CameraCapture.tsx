import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Camera, CircleCheck, Info, Minus, RefreshCw, SwitchCamera, Timer, TriangleAlert, Upload, X } from "lucide-react";
import type { Preset } from "../../core/index";
import {
  LIVE_HINTS_DOWNLOAD_NOTE,
  frameSpec,
  overlayLayout,
  preloadLiveDetector,
  releaseLiveDetector,
  startLiveHints,
} from "../../browser/live";
import type { Hint, HintId, LiveHints } from "../../browser/live";
import { CAMERA_MESSAGES, CameraError, cameraSupport, captureStill, openCamera, stopStream } from "./capture";
import type { Facing, OpenedCamera, Still } from "./capture";
import "./camera.css";

export interface CameraCaptureProps {
  /** Sizes the head and eye guides. Without it a generic 35 x 45 mm frame is drawn. */
  preset?: Preset;
  /** A full-resolution JPEG File named camera-<timestamp>.jpg, not mirrored. Or an uploaded file from the fallback. The camera stops first. */
  onCapture(file: File): void;
  onClose(): void;
}

export const SELFIE_TIP =
  "Ask someone to take it, or use a tripod and timer. Selfies at arm's length distort faces and aren't accepted for US passports.";
const PRIVACY_LINE = "Your camera stays on this device; nothing is recorded or uploaded.";
const TIMER_SECONDS = 3;
const ANNOUNCE_GAP_MS = 4000;
const HINT_LABELS: Record<HintId, string> = {
  face: "Face",
  distance: "Distance",
  centre: "Position",
  level: "Level",
  light: "Light",
};
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Phase = "checking" | "intro" | "starting" | "live" | "review" | "error";

function HintIcon({ state }: { state: Hint["state"] }) {
  const props = { size: 18, "aria-hidden": true, focusable: false } as const;
  if (state === "ok") return <CircleCheck {...props} />;
  if (state === "warn") return <TriangleAlert {...props} />;
  return <Minus {...props} />;
}

export function CameraCapture({ preset, onCapture, onClose }: CameraCaptureProps) {
  const titleId = useId(),
    descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const session = useRef(0);
  const countTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [phase, setPhase] = useState<Phase>(() =>
    typeof navigator !== "undefined" && navigator.permissions ? "checking" : "intro",
  );
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<Facing>("user");
  const [camera, setCamera] = useState<OpenedCamera | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [hintsOn, setHintsOn] = useState(true);
  const [live, setLive] = useState<LiveHints | null>(null);
  const [timerOn, setTimerOn] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [still, setStill] = useState<(Still & { url: string }) | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const spec = useMemo(() => frameSpec(preset), [preset]);
  const layout = useMemo(() => (dims ? overlayLayout(spec, dims.w, dims.h) : null), [spec, dims]);

  /* Focus: trap inside the dialog, return to the opener on close. */
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const scrollLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = scrollLock;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  // Escape works wherever focus is, including after a button unmounts.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      clearInterval(countTimer.current);
      closeRef.current();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  // Each step puts focus on its main button, or on the dialog itself while nothing can take it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const target = dialog.querySelector<HTMLElement>("[data-autofocus]:not([disabled])");
    (target ?? dialog).focus();
  }, [phase]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    );
    if (!nodes.length) return;
    const first = nodes[0]!,
      last = nodes[nodes.length - 1]!;
    const active = document.activeElement;
    if (!dialogRef.current?.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  /* Camera lifecycle. */
  const releaseCamera = useCallback(() => {
    session.current++;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(
    async (wanted: Facing, withHints: boolean) => {
      const mine = ++session.current;
      stopStream(streamRef.current);
      streamRef.current = null;
      setCamera(null);
      setDims(null);
      setLive(null);
      setError("");
      setPhase("starting");
      if (withHints) preloadLiveDetector();
      try {
        const opened = await openCamera(wanted);
        if (mine !== session.current) {
          stopStream(opened.stream); // closed or switched while the permission prompt was open
          return;
        }
        streamRef.current = opened.stream;
        setCamera(opened);
      } catch (e) {
        if (mine !== session.current) return;
        setError(e instanceof CameraError ? e.message : CAMERA_MESSAGES.other);
        setPhase("error");
      }
    },
    [],
  );

  // Attach the stream to the video element once both exist.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !camera) return;
    if (video.srcObject !== camera.stream) video.srcObject = camera.stream; // re-assigning the same stream restarts the element
    if (video.paused) void video.play().catch(() => {});
  }, [camera, phase]);

  // A camera that is already allowed can start without the explainer; a first visit always sees it.
  useEffect(() => {
    let cancelled = false;
    const problem = cameraSupport();
    if (problem) {
      setError(CAMERA_MESSAGES[problem]);
      setPhase("error");
      return;
    }
    const showIntro = () => setPhase((p) => (p === "checking" ? "intro" : p));
    const guard = setTimeout(showIntro, 700);
    (navigator.permissions ? navigator.permissions.query({ name: "camera" as PermissionName }) : Promise.reject())
      .then((status) => {
        if (cancelled) return;
        clearTimeout(guard);
        if (status.state === "granted") void start("user", true);
        else showIntro();
      })
      .catch(() => {
        clearTimeout(guard);
        if (!cancelled) showIntro();
      });
    return () => {
      cancelled = true;
      clearTimeout(guard);
    };
  }, [start]);

  // Everything off on unmount.
  useEffect(
    () => () => {
      releaseCamera();
      clearInterval(countTimer.current);
      void releaseLiveDetector();
    },
    [releaseCamera],
  );

  const onMetadata = () => {
    const v = videoRef.current;
    if (v && v.videoWidth) {
      setDims({ w: v.videoWidth, h: v.videoHeight });
      setPhase((p) => (p === "starting" ? "live" : p));
    }
  };

  /* Live hints. */
  useEffect(() => {
    const video = videoRef.current;
    if (phase !== "live" || !hintsOn || !video || !camera || !dims) return;
    const handle = startLiveHints(video, preset, setLive, { mirrored: camera.mirrored });
    return () => handle.stop();
  }, [phase, hintsOn, camera, dims, preset]);

  // Screen readers get a short summary, only when it changes and at most every few seconds.
  const summary = useMemo(() => {
    if (!live || live.status !== "ready" || !live.hints.length) return "";
    const warns = live.hints.filter((x) => x.state === "warn").map((x) => x.text);
    if (warns.length) return warns.join(" ");
    return live.aligned ? "Face, distance, position and level look right." : "";
  }, [live]);
  const lastSaid = useRef({ at: 0, text: "" });
  useEffect(() => {
    if (!summary || summary === lastSaid.current.text) return;
    const wait = Math.max(0, ANNOUNCE_GAP_MS - (Date.now() - lastSaid.current.at));
    const id = setTimeout(() => {
      lastSaid.current = { at: Date.now(), text: summary };
      setAnnouncement(summary);
    }, wait);
    return () => clearTimeout(id);
  }, [summary]);

  /* Capture, timer, review. */
  const takeNow = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setSaving(true);
    try {
      const result = await captureStill(video, camera?.track);
      setStill({ ...result, url: URL.createObjectURL(result.file) });
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The photo could not be saved. Try again.");
      setPhase("error");
    } finally {
      setSaving(false);
    }
  }, [camera]);

  const cancelTimer = useCallback(() => {
    clearInterval(countTimer.current);
    setCount(null);
  }, []);
  const shutter = () => {
    if (count !== null) return cancelTimer();
    if (!timerOn) return void takeNow();
    let left = TIMER_SECONDS;
    setCount(left);
    countTimer.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        cancelTimer();
        void takeNow();
      } else setCount(left);
    }, 1000);
  };

  useEffect(
    () => () => {
      if (still) URL.revokeObjectURL(still.url);
    },
    [still],
  );

  const usePhoto = () => {
    if (!still) return;
    const file = still.file;
    releaseCamera();
    onCapture(file);
  };
  const retake = () => {
    setStill(null);
    setPhase("live");
  };
  const switchCamera = () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    cancelTimer();
    setFacing(next);
    void start(next, hintsOn);
  };
  const onUpload = (file: File | undefined) => {
    if (!file) return;
    releaseCamera();
    onCapture(file);
  };

  const close = () => {
    cancelTimer();
    onClose();
  };

  /* Overlay: drawn in video pixels, strokes stay a fixed screen width. */
  const aligned = !!live?.aligned && hintsOn;
  const overlay = layout && dims && (
    <svg
      data-testid="camera-overlay"
      className={`cc-overlay${aligned ? " is-aligned" : ""}`}
      viewBox={`0 0 ${dims.w} ${dims.h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="cc-dim"
        fillRule="evenodd"
        d={`M0 0H${dims.w}V${dims.h}H0Z M${layout.frame.x} ${layout.frame.y}h${layout.frame.w}v${layout.frame.h}h${-layout.frame.w}Z`}
      />
      <rect className="cc-frame" x={layout.frame.x} y={layout.frame.y} width={layout.frame.w} height={layout.frame.h} />
      <rect className="cc-eyeband" x={layout.eyeBand.x} y={layout.eyeBand.y} width={layout.eyeBand.w} height={layout.eyeBand.h} />
      <line className="cc-centre" x1={layout.centreX} x2={layout.centreX} y1={layout.frame.y} y2={layout.frame.y + layout.frame.h} />
      <ellipse className="cc-head cc-head-max" cx={layout.headMax.cx} cy={layout.headMax.cy} rx={layout.headMax.rx} ry={layout.headMax.ry} />
      <ellipse className="cc-head cc-head-min" cx={layout.headMin.cx} cy={layout.headMin.cy} rx={layout.headMin.rx} ry={layout.headMin.ry} />
      {live?.eyes?.map((eye, i) => (
        <circle
          key={i}
          className="cc-eye"
          cx={(camera?.mirrored ? 1 - eye.x : eye.x) * dims.w}
          cy={eye.y * dims.h}
          r={Math.max(3, dims.h * 0.006)}
        />
      ))}
    </svg>
  );

  const uploadInput = (
    <input
      ref={fileRef}
      className="cc-file"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      aria-label="Upload a photo instead"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        onUpload(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );
  const uploadButton = (
    <button type="button" className="cc-btn" onClick={() => fileRef.current?.click()}>
      <Upload size={16} aria-hidden="true" />
      Upload a photo instead
    </button>
  );
  const tip = (
    <p className="cc-tip">
      <Info size={16} aria-hidden="true" />
      <span>{SELFIE_TIP}</span>
    </p>
  );

  const showStage = phase === "starting" || phase === "live" || phase === "review";
  // Until one face is found the other rows only say "waiting", so they fold into the face line.
  const visibleHints =
    live?.status === "ready"
      ? live.hints.every((hint) => hint.id === "face" || hint.state === "idle")
        ? live.hints.filter((hint) => hint.id === "face")
        : live.hints
      : [];
  const hintList =
    hintsOn && live?.status === "ready" && visibleHints.length ? (
      <ul className="cc-hints">
        {visibleHints.map((hint) => (
          <li key={hint.id} className={`cc-hint is-${hint.state}`}>
            <HintIcon state={hint.state} />
            <span>
              <strong>{HINT_LABELS[hint.id]}</strong> {hint.text}
            </span>
          </li>
        ))}
      </ul>
    ) : null;
  const hintNote = !hintsOn
    ? "Live hints are off."
    : live?.status === "loading" || (phase === "live" && !live)
      ? `Loading the face model (${LIVE_HINTS_DOWNLOAD_NOTE}). You can take the photo now.`
      : live?.status === "error"
        ? live.message
        : live?.status === "ready" && !live.hints.length
          ? "Looking for a face."
          : "";

  return (
    <div className="cc-backdrop">
      <div
        ref={dialogRef}
        className="cc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="cc-head-bar">
          <h2 id={titleId}>Take a photo</h2>
          <button type="button" className="cc-close" onClick={close} aria-label="Close camera">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <p id={descId} className="cc-privacy">
          {PRIVACY_LINE}
        </p>

        {phase === "intro" && (
          <div className="cc-intro">
            <div className="cc-intro-copy">
              <p>
                Your browser will ask to use the camera when you continue. The picture is taken on this device and goes
                straight into the editor.
              </p>
              <label className="cc-check">
                <input type="checkbox" checked={hintsOn} onChange={(e) => setHintsOn(e.target.checked)} />
                <span>
                  Show live hints for face position, distance, level and light. They need a small face model
                  ({LIVE_HINTS_DOWNLOAD_NOTE}) and run on this device.
                </span>
              </label>
              {tip}
            </div>
            <div className="cc-actions">
              <button type="button" className="cc-btn cc-primary" data-autofocus onClick={() => void start(facing, hintsOn)}>
                <Camera size={18} aria-hidden="true" />
                Turn on camera
              </button>
              {uploadButton}
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="cc-intro">
            <div className="cc-intro-copy">
              <p role="alert" className="cc-error">
                <TriangleAlert size={18} aria-hidden="true" />
                <span>{error}</span>
              </p>
              {tip}
            </div>
            <div className="cc-actions">
              {!cameraSupport() && (
                <button type="button" className="cc-btn cc-primary" data-autofocus onClick={() => void start(facing, hintsOn)}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Try again
                </button>
              )}
              {uploadButton}
            </div>
          </div>
        )}

        {showStage && (
          <div className="cc-body">
            <div className="cc-main">
              <div
                className="cc-stage"
                style={{ "--ar": dims ? `${dims.w} / ${dims.h}` : "16 / 9", "--arn": dims ? dims.w / dims.h : 16 / 9 } as CSSProperties}
              >
                <video
                  ref={videoRef}
                  className={`cc-video${camera?.mirrored ? " is-mirrored" : ""}`}
                  playsInline
                  muted
                  autoPlay
                  aria-label="Camera preview"
                  data-testid="camera-video"
                  onLoadedMetadata={onMetadata}
                  hidden={phase === "review"}
                />
                {phase !== "review" && overlay}
                {phase === "starting" && <p className="cc-status">Starting the camera</p>}
                {phase === "review" && still && <img className="cc-review" src={still.url} alt="The photo you just took" />}
                {count !== null && (
                  <p className="cc-count" aria-hidden="true">
                    {count}
                  </p>
                )}
              </div>
              {phase === "review" && still ? (
                <>
                  <p className="cc-meta">
                    {still.width} × {still.height} px · {(still.file.size / 1048576).toFixed(1)} MB JPEG
                  </p>
                  <div className="cc-controls">
                    <button type="button" className="cc-btn" onClick={retake}>
                      <RefreshCw size={16} aria-hidden="true" />
                      Retake
                    </button>
                    <button type="button" className="cc-btn cc-primary" data-autofocus onClick={usePhoto}>
                      <CircleCheck size={18} aria-hidden="true" />
                      Use photo
                    </button>
                  </div>
                </>
              ) : (
                <div className="cc-controls">
                  {camera?.canSwitch && (
                    <button type="button" className="cc-btn" onClick={switchCamera} disabled={phase !== "live"}>
                      <SwitchCamera size={16} aria-hidden="true" />
                      {facing === "user" ? "Use rear camera" : "Use front camera"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="cc-btn"
                    aria-pressed={timerOn}
                    onClick={() => setTimerOn((v) => !v)}
                    disabled={count !== null}
                  >
                    <Timer size={16} aria-hidden="true" />
                    {TIMER_SECONDS}-second timer
                  </button>
                  <button
                    type="button"
                    className="cc-btn cc-primary cc-shutter"
                    data-autofocus
                    onClick={shutter}
                    disabled={phase !== "live" || saving}
                  >
                    <Camera size={18} aria-hidden="true" />
                    {count !== null ? "Cancel timer" : timerOn ? "Start timer" : "Take photo"}
                  </button>
                </div>
              )}
            </div>
            <aside className="cc-side" aria-label="Live hints">
              <h3>{phase === "review" ? "Before you continue" : "Live hints"}</h3>
              {phase === "review" ? (
                <p className="cc-note">
                  Check that your face is sharp and the light is even. The editor will position the crop and show the
                  measurements. Retake if anything looks off.
                </p>
              ) : (
                <>
                  <label className="cc-check cc-check-small">
                    <input type="checkbox" checked={hintsOn} onChange={(e) => setHintsOn(e.target.checked)} />
                    <span>Show live hints</span>
                  </label>
                  {hintList}
                  {hintNote && <p className="cc-note">{hintNote}</p>}
                  <p className="cc-legend">
                    Solid ring: largest head size. Dashed ring: smallest. Shaded band: eye line. Dashed vertical: centre.
                    {spec.generic ? " No document is chosen, so this is a generic 35 × 45 mm frame." : ""}
                  </p>
                </>
              )}
              {tip}
            </aside>
          </div>
        )}

        <div className="cc-sr" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
        {count !== null && (
          <div className="cc-sr" role="status" aria-live="assertive">
            {`Photo in ${count}`}
          </div>
        )}
        {uploadInput}
      </div>
    </div>
  );
}

export default CameraCapture;
