import { useId } from "react";
import { TriangleAlert } from "lucide-react";
import type { Preset } from "../../core/index";

const COLOURS: [string, string][] = [
  ["#ffffff", "White"],
  ["#eeeeee", "Light grey"],
  ["#dce9f5", "Light blue"],
];

/**
 * Background replacement. Off by default. Where the issuing authority forbids altered photos the
 * warning sits at the toggle until it is switched on; from then on the one warning sits above the
 * download button (OutputPanel), where the decision is made. Original-only documents never show this.
 */
export function BackgroundControls({
  preset,
  background,
  busy,
  onToggle,
  onColour,
}: {
  preset: Preset;
  background?: string;
  busy: boolean;
  onToggle(on: boolean): void;
  onColour(colour: string): void;
}) {
  const legend = useId();
  const forbidden = preset.backgroundEdit === "forbidden";
  return (
    <section className="tool-section" aria-label="Background">
      <h3>Background</h3>
      <label className="check-control">
        <input
          type="checkbox"
          checked={!!background}
          disabled={busy}
          aria-describedby={forbidden && !background ? "background-note" : undefined}
          onChange={(event) => onToggle(event.target.checked)}
        />
        Replace background locally
      </label>
      {forbidden && !background && (
        <p id="background-note" className="background-note warn">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>
            {preset.name} does not accept digitally altered photos. Retake against a plain light wall
            if you can.
          </span>
        </p>
      )}
      {background && (
        <>
          <div className="swatches" role="group" aria-labelledby={legend}>
            <span className="swatch-legend" id={legend}>
              Colour
            </span>
            <div className="color-options">
              {COLOURS.map(([value, name]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Use ${name.toLowerCase()} background`}
                  aria-pressed={background === value}
                  className={`swatch${background === value ? " active" : ""}`}
                  disabled={busy}
                  onClick={() => onColour(value)}
                >
                  <span className="swatch-dot" style={{ background: value }} aria-hidden="true" />
                  <span className="swatch-name" aria-hidden="true">
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="fine-print">
            Uses portrait segmentation on this device (about 12 MB, loaded only when you ask). Check
            hair and edges. The downloaded file says the background was replaced.
          </p>
        </>
      )}
    </section>
  );
}
