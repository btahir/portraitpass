import type { Crop, Landmarks } from "../../core/index";
import type { LoadedPhoto } from "../../browser/engine";
import { Slider } from "./Slider";

/** Sliders for people who want exact placement. Dragging the photo is the everyday way. */
export function AdjustPrecisely({
  photo,
  crop,
  landmarks,
  busy,
  onPosition,
  onLandmark,
  onApply,
  onCommit,
}: {
  photo: LoadedPhoto;
  crop: Crop;
  landmarks: Landmarks;
  busy: boolean;
  onPosition(axis: "x" | "y", percent: number): void;
  onLandmark(key: keyof Landmarks, percent: number): void;
  onApply(): void;
  onCommit(): void;
}) {
  return (
    <details className="tool-section adjust">
      <summary>Adjust precisely</summary>
      <Slider
        disabled={busy}
        label="Horizontal position"
        value={photo.width > crop.width ? (crop.x / (photo.width - crop.width)) * 100 : 50}
        onCommit={onCommit}
        onChange={(v) => onPosition("x", v)}
      />
      <Slider
        disabled={busy}
        label="Vertical position"
        value={photo.height > crop.height ? (crop.y / (photo.height - crop.height)) * 100 : 50}
        onCommit={onCommit}
        onChange={(v) => onPosition("y", v)}
      />
      <h4>Head positions</h4>
      <p className="fine-print">
        Where the head is in your original photo, as a percentage. Auto-frame fills these in.
      </p>
      <Slider
        disabled={busy}
        label="Head centre"
        value={(landmarks.centerX / photo.width) * 100}
        onChange={(v) => onLandmark("centerX", v)}
      />
      <Slider
        disabled={busy}
        label="Crown from top"
        value={(landmarks.crownY / photo.height) * 100}
        onChange={(v) => onLandmark("crownY", v)}
      />
      <Slider
        disabled={busy}
        label="Eyes from top"
        value={(landmarks.eyesY / photo.height) * 100}
        onChange={(v) => onLandmark("eyesY", v)}
      />
      <Slider
        disabled={busy}
        label="Chin from top"
        value={(landmarks.chinY / photo.height) * 100}
        onChange={(v) => onLandmark("chinY", v)}
      />
      <button className="secondary small-button fit-button" disabled={busy} onClick={onApply}>
        Fit to these measurements
      </button>
      <p className="fine-print">
        Crown, eyes and chin stay in that order. The results appear under Measurements.
      </p>
    </details>
  );
}
