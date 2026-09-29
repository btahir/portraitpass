import { useCallback, useEffect, useRef } from "react";

const COMMIT_DELAY = 450;

/** A labelled range input. `onCommit` fires when a drag ends or a burst of key presses settles. */
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  display,
  disabled = false,
  hideLabel = false,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
  disabled?: boolean;
  /** Keep the label for screen readers and show only the track. */
  hideLabel?: boolean;
  onChange: (value: number) => void;
  onCommit?: () => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const held = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    onCommit?.();
  }, [onCommit]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div className={`slider-field${hideLabel ? " slider-bare" : ""}`}>
      <div className={hideLabel ? "visually-hidden" : "slider-title"}>
        <label htmlFor={id}>{label}</label>
        {!hideLabel && (
          <output htmlFor={id}>{display ?? `${Math.round(value)}%`}</output>
        )}
      </div>
      <input
        id={id}
        className="range"
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onPointerDown={() => {
          held.current = true;
          const release = () => {
            window.removeEventListener("pointerup", release);
            window.removeEventListener("pointercancel", release);
            held.current = false;
            commit();
          };
          window.addEventListener("pointerup", release);
          window.addEventListener("pointercancel", release);
        }}
        onBlur={commit}
        onChange={(event) => {
          onChange(Number(event.target.value));
          if (!held.current) {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(commit, COMMIT_DELAY);
          }
        }}
      />
    </div>
  );
}
