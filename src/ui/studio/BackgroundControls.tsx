import { TriangleAlert } from "lucide-react";
import { backgroundWarning, type Preset } from "../../core/index";

const COLOURS: [string, string][] = [
  ["#ffffff", "white"],
  ["#eeeeee", "light grey"],
  ["#dce9f5", "light blue"],
];

/**
 * Background replacement. Off by default. Where the issuing authority forbids altered photos the
 * warning sits at the toggle and again while the replacement is on. Original-only documents never show this.
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
  const note = backgroundWarning(preset);
  return (
    <section className="tool-section" aria-label="Background">
      <h3>Background</h3>
      <label className="check-control">
        <input
          type="checkbox"
          checked={!!background}
          disabled={busy}
          aria-describedby={note ? "background-note" : undefined}
          onChange={(event) => onToggle(event.target.checked)}
        />
        Replace background locally
      </label>
      {note && (
        <p
          id="background-note"
          className={`background-note${preset.backgroundEdit === "forbidden" ? " warn" : ""}`}
        >
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{note}</span>
        </p>
      )}
      {background && (
        <>
          <div className="color-options" role="group" aria-label="Background colour">
            {COLOURS.map(([value, name]) => (
              <button
                key={value}
                aria-label={`Use ${name} background`}
                aria-pressed={background === value}
                className={`color-option${background === value ? " active" : ""}`}
                style={{ background: value }}
                disabled={busy}
                onClick={() => onColour(value)}
              />
            ))}
          </div>
          <p className="fine-print">
            Uses portrait segmentation on this device (about 12 MB, loaded only when you ask).
            Check hair and edges. The downloaded file says the background was replaced.
          </p>
          {preset.backgroundEdit === "forbidden" ? (
            <p className="export-warning">
              <TriangleAlert size={14} aria-hidden="true" />
              <span>Background edited — not accepted for {preset.name}.</span>
            </p>
          ) : preset.backgroundEdit === "unspecified" ? (
            <p className="export-warning">
              <TriangleAlert size={14} aria-hidden="true" />
              <span>
                Background edited. Check that the receiver accepts this for {preset.name}.
              </span>
            </p>
          ) : (
            <p className="export-warning quiet">
              <span>Background replaced by PortraitPass. The file records this.</span>
            </p>
          )}
        </>
      )}
    </section>
  );
}
