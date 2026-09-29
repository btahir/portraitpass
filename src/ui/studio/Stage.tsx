import { Info, Minus, Plus, RotateCcw, ScanFace, TriangleAlert, Undo2, Check } from "lucide-react";
import type { Crop, Landmarks, Preset, SheetOrientation, SheetStyle } from "../../core/index";
import { PAPERS } from "../../core/index";
import type { LoadedPhoto } from "../../browser/engine";
import { FACE_NOTICE } from "../../config";
import { Canvas, MAX_ZOOM, previewSheet, type StageView } from "./Canvas";
import { Slider } from "./Slider";

export interface FrameNote {
  tone: "ok" | "info" | "warn";
  text: string;
}

export interface StageProps {
  photo: LoadedPhoto;
  preset: Preset;
  crop: Crop;
  landmarks?: Landmarks;
  guides: boolean;
  background?: string;
  view: StageView;
  paperId: string;
  sheetStyle: SheetStyle;
  sheetOrientation: SheetOrientation;
  baseCrop: Crop | null;
  zoom: number;
  busy: boolean;
  canUndo: boolean;
  frameNote: FrameNote | null;
  /** The one-line face notice has not been shown yet: ask before the first automatic run. */
  noticePending: boolean;
  onView(view: StageView): void;
  onGuides(on: boolean): void;
  /** The toolbar button. */
  onAutoFrame(): void;
  /** "Auto-frame my photo" on the notice: this is also where the notice is acknowledged. */
  onConfirmNotice(): void;
  onSkipNotice(): void;
  onUndo(): void;
  onReset(): void;
  onZoom(zoom: number): void;
  onLive(crop: Crop): void;
  onCommit(): void;
  onSettle(): void;
  onError(message: string): void;
}

export function Stage(p: StageProps) {
  const original = p.preset.mode === "original";
  const framing = !original && p.view === "frame";
  const sheet = p.view === "sheet" && !original ? previewSheet(p.preset, p.paperId, {
        style: p.sheetStyle,
        orientation: p.sheetOrientation,
      })
      : undefined;
  const paper = PAPERS.find((x) => x.id === p.paperId);
  const view: StageView = original ? "frame" : p.view === "sheet" && !sheet ? "frame" : p.view;
  return (
    <section className="stage" aria-label="Photo preview">
      <div className="stage-toolbar">
        {!original && (
          <div className="segmented" role="group" aria-label="Preview">
            {(
              [
                ["frame", "Frame"],
                ["sheet", "Sheet"],
                ["compare", "Before / after"],
              ] as [StageView, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                aria-pressed={view === id}
                disabled={p.busy || (id === "compare" && p.photo.bytesOnly)}
                onClick={() => p.onView(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="stage-actions">
          {framing && (
            <button
              className="secondary small-button"
              aria-pressed={p.guides}
              onClick={() => p.onGuides(!p.guides)}
            >
              Guides {p.guides ? "on" : "off"}
            </button>
          )}
          {!original && (
            <button
              className="secondary small-button"
              disabled={p.busy || p.photo.bytesOnly}
              onClick={p.onAutoFrame}
            >
              <ScanFace size={15} aria-hidden="true" /> Auto-frame
            </button>
          )}
          {!original && (
            <button
              className="secondary small-button"
              disabled={!p.canUndo || p.busy}
              onClick={p.onUndo}
            >
              <Undo2 size={14} aria-hidden="true" /> Undo position
            </button>
          )}
        </div>
      </div>

      {p.noticePending ? (
        <div className="frame-note info" role="region" aria-label="Face detection">
          <Info size={16} aria-hidden="true" />
          <div>
            <p>{FACE_NOTICE}</p>
            <div className="frame-note-actions">
              <button className="primary small-button" disabled={p.busy} onClick={p.onConfirmNotice}>
                Auto-frame my photo
              </button>
              <button className="text-button" disabled={p.busy} onClick={p.onSkipNotice}>
                I&rsquo;ll frame it myself
              </button>
            </div>
          </div>
        </div>
      ) : (
        p.frameNote && (
          <div className={`frame-note ${p.frameNote.tone}`} role="status">
            {p.frameNote.tone === "ok" ? (
              <Check size={16} aria-hidden="true" />
            ) : p.frameNote.tone === "warn" ? (
              <TriangleAlert size={16} aria-hidden="true" />
            ) : (
              <Info size={16} aria-hidden="true" />
            )}
            <p>{p.frameNote.text}</p>
          </div>
        )
      )}

      <div className="stage-canvas">
        <Canvas
          photo={p.photo}
          preset={p.preset}
          crop={p.crop}
          landmarks={p.landmarks}
          guides={p.guides}
          background={p.background}
          view={view}
          paperId={p.paperId}
          sheetStyle={p.sheetStyle}
          sheetOrientation={p.sheetOrientation}
          interactive={framing && !p.busy && !p.photo.bytesOnly}
          baseCrop={p.baseCrop}
          onLive={p.onLive}
          onCommit={p.onCommit}
          onSettle={p.onSettle}
          onError={p.onError}
        />
      </div>

      {framing && !p.photo.bytesOnly && (
        <div className="zoom-bar">
          <span className="zoom-label" aria-hidden="true">
            Zoom
          </span>
          <button
            className="icon-button small"
            aria-label="Zoom out"
            disabled={p.busy || p.zoom <= 1.0001}
            onClick={() => {
              p.onZoom(Math.max(1, p.zoom / 1.1));
              p.onCommit();
            }}
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <Slider
            label="Zoom"
            hideLabel
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={p.zoom}
            display={`${Math.round(p.zoom * 100)}%`}
            disabled={p.busy}
            onChange={p.onZoom}
            onCommit={p.onCommit}
          />
          <button
            className="icon-button small"
            aria-label="Zoom in"
            disabled={p.busy || p.zoom >= MAX_ZOOM - 0.0001}
            onClick={() => {
              p.onZoom(Math.min(MAX_ZOOM, p.zoom * 1.1));
              p.onCommit();
            }}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
          <output className="zoom-value">{Math.round(p.zoom * 100)}%</output>
          <button className="secondary small-button" disabled={p.busy} onClick={p.onReset}>
            <RotateCcw size={13} aria-hidden="true" /> Reset
          </button>
        </div>
      )}

      <div className="stage-foot">
        <span>
          {original
            ? `Original file, unchanged. Nothing is cropped or edited.${p.photo.width > 0 ? ` ${p.photo.width} × ${p.photo.height} px.` : ""}`
            : sheet && view === "sheet"
              ? `${paper?.name ?? "4 × 6 in"} sheet · ${sheet.placements.length} ${sheet.placements.length === 1 ? "photo" : "photos"}. Paper and layout are set under Print sheet.`
              : view === "compare"
                ? "The original next to your framed photo."
                : "Drag to move · scroll or pinch to zoom · arrow keys nudge 0.1 mm · ruler in mm from the bottom"}
        </span>
        {p.photo.isDemo ? (
          <span className="demo-badge">Synthetic demo · not for applications</span>
        ) : (
          <span className="file-name">
            {p.photo.name.length > 32 ? `${p.photo.name.slice(0, 29)}…` : p.photo.name}
          </span>
        )}
      </div>
    </section>
  );
}
