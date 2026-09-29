import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampCrop,
  guideBands,
  layoutSheet,
  zoomCrop,
  type Crop,
  type Landmarks,
  type Preset,
} from "../../core/index";
import { renderPreview, type LoadedPhoto } from "../../browser/engine";

export const MAX_ZOOM = 3;
export type StageView = "frame" | "sheet" | "compare";

/** Photo width the crop would have at zoom 1: the widest crop of the document's shape. */
export function zoomOf(crop: Crop, base: Crop | null) {
  return base ? base.width / crop.width : 1;
}

/** Sheet layout for the preview paper, or undefined when the photo does not fit on it. */
export function previewSheet(preset: Preset, paperId: string) {
  try {
    return layoutSheet(preset, paperId, 300);
  } catch {
    return undefined;
  }
}

/** Millimetre ruler along the left edge, measured up from the bottom edge, like the eye line. */
function Ruler({
  heightPx,
  heightMm,
  eyes,
}: {
  heightPx: number;
  heightMm: number;
  eyes?: { minMm: number; maxMm: number };
}) {
  if (heightPx < 40) return null;
  const perMm = heightPx / heightMm;
  const steps = [
    { major: 5, minor: 1 },
    { major: 10, minor: 5 },
    { major: 20, minor: 5 },
    { major: 25, minor: 5 },
  ];
  const step = steps.find((s) => s.major * perMm >= 34) ?? steps[3]!;
  const ticks: { mm: number; major: boolean }[] = [];
  for (let mm = 0; mm <= heightMm + 1e-6; mm += step.minor)
    ticks.push({ mm, major: Math.abs(mm % step.major) < 1e-6 });
  const y = (mm: number) => heightPx - mm * perMm;
  return (
    <svg
      className="ruler"
      width={46}
      height={heightPx + 2}
      viewBox={`0 -1 46 ${heightPx + 2}`}
      aria-hidden="true"
      focusable="false"
    >
      {eyes && (
        <rect
          className="ruler-eyes"
          x={43}
          y={y(eyes.maxMm)}
          width={3}
          height={(eyes.maxMm - eyes.minMm) * perMm}
        />
      )}
      {ticks.map((t) => (
        <line
          key={t.mm}
          x1={t.major ? 30 : 37}
          x2={42}
          y1={y(t.mm)}
          y2={y(t.mm)}
          stroke="currentColor"
          strokeWidth={1}
          opacity={t.major ? 0.85 : 0.5}
        />
      ))}
      {ticks
        .filter((t) => t.major && t.mm > 0 && y(t.mm) > 8)
        .map((t) => (
          <text
            key={t.mm}
            x={26}
            y={y(t.mm)}
            textAnchor="end"
            dominantBaseline="central"
          >
            {t.mm}
          </text>
        ))}
      <text x={26} y={heightPx - 2} textAnchor="end" dominantBaseline="text-after-edge">
        0
      </text>
    </svg>
  );
}

export interface CanvasProps {
  photo: LoadedPhoto;
  preset: Preset;
  crop: Crop;
  /** Head positions, drawn only once someone set them or face assist found them. */
  landmarks?: Landmarks;
  guides: boolean;
  background?: string;
  view: StageView;
  paperId: string;
  /** Dragging, wheel, pinch and arrow keys move the crop. */
  interactive: boolean;
  /** The widest crop of the document's shape; sets the zoom range. */
  baseCrop: Crop | null;
  /** The crop moved as part of a drag, wheel turn or key press. */
  onLive(next: Crop): void;
  /** A drag or pinch just ended: close the undo step now. */
  onCommit(): void;
  /** A wheel turn or key press: close the undo step once things go quiet. */
  onSettle(): void;
  onError(message: string): void;
}

export function Canvas(props: CanvasProps) {
  const {
    photo,
    preset,
    crop,
    landmarks,
    guides,
    background,
    view,
    paperId,
    interactive,
  } = props;
  const original = preset.mode === "original";
  const sheet = useMemo(
    () => (view === "sheet" && !original ? previewSheet(preset, paperId) : undefined),
    [view, original, preset, paperId],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setShown((prev) => {
        const w = Math.round(el.clientWidth),
          h = Math.round(el.clientHeight);
        return prev.w === w && prev.h === h ? prev : { w, h };
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, sheet]);

  const showSheet = !!sheet;
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      renderPreview(canvasRef.current, photo, preset, crop, {
        paperId,
        sheet: showSheet,
        guides: guides && !showSheet && !original,
        background: original ? undefined : background,
        landmarks: guides && landmarks && !showSheet && !original ? landmarks : undefined,
      });
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "The preview could not be drawn.");
    }
    // props.onError is stable enough; it only reports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, preset, crop, paperId, showSheet, guides, background, original, landmarks, shown.w]);

  // Everything the pointer, wheel and key handlers need, without rebinding them on every render.
  const live = useRef(props);
  live.current = props;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const anchor = useRef<{
    crop: Crop;
    x: number;
    y: number;
    dist: number;
    width: number;
  } | null>(null);
  const cropNow = useRef(crop);
  cropNow.current = crop;

  const canMove = () => live.current.interactive;
  const setAnchor = (canvas: HTMLCanvasElement) => {
    const points = [...pointers.current.values()];
    if (!points.length) {
      anchor.current = null;
      return;
    }
    anchor.current = {
      crop: cropNow.current,
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
      dist:
        points.length > 1
          ? Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y)
          : 0,
      width: canvas.getBoundingClientRect().width || 1,
    };
  };
  const movePointers = () => {
    const a = anchor.current;
    const { photo: p, baseCrop } = live.current;
    if (!a || !canMove()) return;
    const points = [...pointers.current.values()];
    if (!points.length) return;
    const x = points.reduce((s, q) => s + q.x, 0) / points.length;
    const y = points.reduce((s, q) => s + q.y, 0) / points.length;
    let next = a.crop;
    if (points.length > 1 && a.dist > 0 && baseCrop) {
      const dist = Math.hypot(
        points[0]!.x - points[1]!.x,
        points[0]!.y - points[1]!.y,
      );
      // Spreading two fingers zooms in, up to the same 300% as the zoom control.
      const factor = Math.min(
        Math.max(0.05, dist / a.dist),
        a.crop.width / (baseCrop.width / MAX_ZOOM),
      );
      next = zoomCrop(a.crop, factor, p.width, p.height);
    }
    const scale = next.width / a.width;
    live.current.onLive(
      clampCrop(
        { ...next, x: next.x - (x - a.x) * scale, y: next.y - (y - a.y) * scale },
        p.width,
        p.height,
      ),
    );
  };
  const release = (id: number, canvas: HTMLCanvasElement) => {
    if (!pointers.current.delete(id)) return;
    if (pointers.current.size === 0) {
      anchor.current = null;
      live.current.onCommit();
    } else setAnchor(canvas);
  };

  // Wheel zoom around the pointer. Bound by hand: React's wheel listener is passive and cannot stop the page scroll.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const { interactive: on, baseCrop, photo: p } = live.current;
      if (!on || !baseCrop) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const fx = Math.min(1, Math.max(0, (event.clientX - rect.left) / (rect.width || 1)));
      const fy = Math.min(1, Math.max(0, (event.clientY - rect.top) / (rect.height || 1)));
      const c = cropNow.current;
      const speed = event.ctrlKey ? 0.01 : 0.0018;
      const factor = Math.exp(-event.deltaY * speed);
      const width = Math.min(
        baseCrop.width,
        Math.max(baseCrop.width / MAX_ZOOM, c.width / factor),
      );
      const height = (width * c.height) / c.width;
      live.current.onLive(
        clampCrop(
          {
            x: c.x + fx * (c.width - width),
            y: c.y + fy * (c.height - height),
            width,
            height,
          },
          p.width,
          p.height,
        ),
      );
      live.current.onSettle();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [showSheet, view]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!canMove()) return;
    const c = cropNow.current;
    const perMm = c.width / preset.widthMm;
    const step = (event.shiftKey ? 1 : 0.1) * perMm;
    // The photo follows the arrow, like dragging it.
    const move: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (move[event.key]) {
      event.preventDefault();
      const [dx, dy] = move[event.key]!;
      live.current.onLive(
        clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, photo.width, photo.height),
      );
      live.current.onSettle();
    } else if (["+", "=", "-", "_"].includes(event.key) && props.baseCrop) {
      event.preventDefault();
      const zoomIn = event.key === "+" || event.key === "=";
      const width = Math.min(
        props.baseCrop.width,
        Math.max(props.baseCrop.width / MAX_ZOOM, c.width / (zoomIn ? 1.08 : 1 / 1.08)),
      );
      live.current.onLive(zoomCrop(c, c.width / width, photo.width, photo.height));
      live.current.onSettle();
    }
  };

  const ratio = showSheet
    ? sheet!.width / sheet!.height
    : original
      ? photo.width > 0
        ? photo.width / photo.height
        : preset.widthMm / preset.heightMm
      : preset.widthMm / preset.heightMm;
  const bands = guideBands(preset);
  const label = original
    ? "Your original photo, unchanged"
    : showSheet
      ? "Print sheet preview"
      : interactive
        ? "Framed photo with the size guides. Drag to move, scroll or pinch to zoom, arrow keys nudge by 0.1 mm, hold Shift for 1 mm."
        : "Framed photo preview";
  return (
    <div className="canvas-row">
      {view === "compare" && !original && (
        <figure className="compare-source">
          <img src={photo.url} alt="Original source photograph" />
          <figcaption>Original</figcaption>
        </figure>
      )}
      {view === "frame" && !original && !showSheet && (
        <Ruler
          heightPx={shown.h}
          heightMm={preset.heightMm}
          eyes={bands.eyesFromBottom}
        />
      )}
      <div className="canvas-column">
        <div
          className={`canvas-frame${interactive ? " is-interactive" : ""}`}
          ref={frameRef}
          style={{ ["--ratio" as string]: String(ratio) }}
        >
          <canvas
            ref={canvasRef}
            className={interactive ? "interactive" : undefined}
            aria-label={label}
            tabIndex={0}
            role="img"
            onKeyDown={onKeyDown}
            onPointerDown={(event) => {
              if (!canMove() || pointers.current.size >= 2) return;
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                /* The pointer is already gone; the gesture still follows moves. */
              }
              pointers.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
              });
              setAnchor(event.currentTarget);
            }}
            onPointerMove={(event) => {
              if (!pointers.current.has(event.pointerId)) return;
              pointers.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
              });
              movePointers();
            }}
            onPointerUp={(event) => release(event.pointerId, event.currentTarget)}
            onPointerCancel={(event) => release(event.pointerId, event.currentTarget)}
            onLostPointerCapture={(event) =>
              release(event.pointerId, event.currentTarget)
            }
          />
        </div>
        {view === "compare" && !original && <div className="canvas-caption">Framed</div>}
      </div>
    </div>
  );
}
