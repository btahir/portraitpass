import type { MeasurementCheck, Preset } from "../core/index";

export const CHECK_LABELS: Record<MeasurementCheck["id"], string> = {
  head: "Head height",
  eyes: "Eye line above bottom edge",
  centre: "Head centring",
  resolution: "Photo resolution",
};

function mm(value: number) {
  return `${value.toFixed(1)} mm`;
}
/** The measured value, e.g. "31.5 mm" or "290 ppi". Empty when nothing was measured. */
export function checkValue(check: MeasurementCheck): string {
  if (check.id === "resolution")
    return check.ppi !== undefined ? `${Math.round(check.ppi)} ppi` : "";
  return check.valueMm !== undefined ? mm(check.valueMm) : "";
}
/** The allowed range, e.g. "29.0–34.0 mm" or "up to 1.5 mm". Empty when none applies. */
export function checkRange(check: MeasurementCheck): string {
  if (check.id === "resolution") return "";
  const { minMm, maxMm } = check;
  if (minMm === undefined || maxMm === undefined) return "";
  if (minMm === 0) return `up to ${mm(maxMm)}`;
  return `${minMm.toFixed(1)}–${maxMm.toFixed(1)} mm`;
}
/** A short word for the status, so the result never relies on colour alone. */
export function statusWord(check: MeasurementCheck): string {
  if (check.status === "unknown")
    // A value with no range to compare against (e.g. UK/AU eye line) is measured, just not judged.
    return check.valueMm !== undefined || check.ppi !== undefined
      ? "No range given"
      : "Not measured";
  const pass = check.status === "pass";
  if (check.id === "resolution") return pass ? "Enough pixels" : "Too few pixels";
  if (check.id === "centre") return pass ? "Centred" : "Off centre";
  return pass ? "Within range" : "Outside range";
}

/** Named rules link text for each document source. */
export function sourceLabel(preset: Preset): string {
  if (preset.country === "United States") return "State Dept photo rules";
  if (preset.country === "United Kingdom")
    return "HM Passport Office photo rules";
  if (preset.country === "Australia")
    return "Australian Passport Office photo rules";
  return "Photo rules (source)";
}
