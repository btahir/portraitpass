import { Check, Minus, TriangleAlert, X } from "lucide-react";
import type { DocumentSpec, MeasurementCheck, Preset } from "../../core/index";
import type { PhotoCheck } from "../../core/analysis";
import {
  CHECK_HINTS,
  CHECK_LABELS,
  PHOTO_CHECK_LABELS,
  PHOTO_CHECK_ORDER,
  checkRange,
  checkValue,
  photoStatusWord,
  statusWord,
  type FileCheck,
} from "../checks";

export interface Summary {
  tone: "fit" | "look" | "pending";
  title: string;
  detail: string;
  /** Things to look at: failed measurements and photo checks that warn. */
  failing: number;
  /** Checks that could not be judged (no head positions yet, no range for this document). */
  unknown: number;
}

/** One verdict for the panel and the output tabs. Facts only, never "approved". */
export function summarize(
  original: boolean,
  measure: MeasurementCheck[],
  photoChecks: PhotoCheck[],
  file: FileCheck[],
): Summary {
  const rows = original ? file : measure;
  const failing =
    rows.filter((r) => r.status === "fail").length +
    photoChecks.filter((c) => c.status === "warn").length;
  const unknown =
    rows.filter((r) => r.status === "unknown").length +
    photoChecks.filter((c) => c.status === "unknown").length;
  const head = measure.find((m) => m.id === "head");
  const pending = !original && head?.status === "unknown" && head.valueMm === undefined;
  if (pending)
    return {
      tone: "pending",
      title: "Not measured yet",
      detail:
        "Auto-frame the photo, or set the head positions under Adjust precisely, and the lines and numbers appear here.",
      failing,
      unknown,
    };
  if (failing)
    return {
      tone: "look",
      title: failing === 1 ? "1 thing to look at" : `${failing} things to look at`,
      detail: "Each item is marked below with what was measured and what is allowed.",
      failing,
      unknown,
    };
  return {
    tone: "fit",
    title: original ? "File fits" : "Measurements fit",
    detail: original
      ? "The file type, size and pixels are inside the published limits. The issuing authority decides acceptance."
      : "Head, eye line, centring and resolution are inside the published ranges. The issuing authority decides acceptance.",
    failing,
    unknown,
  };
}

const GENERIC_RULES: [RegExp, string][] = [
  [/expression|smile|neutral|mouth/i, "Expression: check what the rules say about smiling and open eyes."],
  [/glasses|eyeglass|spectacle/i, "Glasses: check what the rules say about glasses and head coverings."],
  [/month|recent|taken within|old/i, "Recency: use a recent photo, and check how recent the rules require."],
];

/** What only a person can judge: the document's own rules, plus expression, glasses and recency when they are missing. */
export function youCheck(doc: DocumentSpec | undefined): string[] {
  const rules = [...(doc?.rules ?? [])];
  for (const [pattern, text] of GENERIC_RULES)
    if (!rules.some((r) => pattern.test(r))) rules.push(text);
  return rules;
}

function StatusIcon({ status }: { status: string }) {
  const props = { size: 15, "aria-hidden": true, strokeWidth: 2.2 } as const;
  if (status === "pass") return <Check {...props} />;
  if (status === "fail") return <X {...props} />;
  if (status === "warn") return <TriangleAlert {...props} />;
  return <Minus {...props} />;
}

export function ChecksPanel({
  doc,
  preset,
  hasPhoto,
  measure,
  photoChecks,
  file,
  summary,
}: {
  doc?: DocumentSpec;
  preset: Preset;
  hasPhoto: boolean;
  measure: MeasurementCheck[];
  photoChecks: PhotoCheck[];
  file: FileCheck[];
  summary: Summary;
}) {
  const original = preset.mode === "original";
  const ordered = PHOTO_CHECK_ORDER.map((id) => photoChecks.find((c) => c.id === id)).filter(
    (c): c is PhotoCheck => !!c,
  );
  return (
    <section className="checks" aria-label="Checks">
      <h2 className="visually-hidden">Checks</h2>
      {hasPhoto && (
        <div className={`verdict ${summary.tone}`}>
          <b className="serif">{summary.title}</b>
          <p>{summary.detail}</p>
        </div>
      )}
      {hasPhoto && !original && measure.length > 0 && (
        <div className="check-group" role="region" aria-label="Measurements">
          <h3>Measurements</h3>
          <ul className="check-list">
            {measure.map((check) => {
              const value = checkValue(check);
              const allowed = checkRange(check);
              return (
                <li key={check.id} className={`check ${check.status}`} data-check={check.id}>
                  <StatusIcon status={check.status} />
                  <div>
                    <div className="check-line">
                      <span className="check-label">{CHECK_LABELS[check.id]}</span>
                      <span className="check-word">{statusWord(check)}</span>
                    </div>
                    <div className="check-hint">{CHECK_HINTS[check.id]}</div>
                    {(value || allowed) && (
                      <div className="check-values">
                        {value}
                        {value && allowed ? " · " : ""}
                        {allowed && `allowed ${allowed}`}
                      </div>
                    )}
                    {check.status !== "pass" && (
                      <div className="check-message">{check.message}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {hasPhoto && original && file.length > 0 && (
        <div className="check-group" role="region" aria-label="File checks">
          <h3>File</h3>
          <ul className="check-list">
            {file.map((check) => (
              <li key={check.id} className={`check ${check.status}`} data-check={check.id}>
                <StatusIcon status={check.status} />
                <div>
                  <div className="check-line">
                    <span className="check-label">{check.label}</span>
                    <span className="check-word">
                      {check.status === "pass" ? "Fits" : check.status === "fail" ? "Outside limit" : "Not checked"}
                    </span>
                  </div>
                  <div className="check-values">
                    {check.value}
                    {check.value && check.range ? " · " : ""}
                    {check.range && `allowed ${check.range}`}
                  </div>
                  {check.status !== "pass" && <div className="check-message">{check.message}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasPhoto && !original && (
        <div className="check-group" role="region" aria-label="Photo checks">
          <h3>Photo checks</h3>
          {ordered.length ? (
            <ul className="check-list">
              {ordered.map((check) => (
                <li key={check.id} className={`check ${check.status}`} data-check={check.id}>
                  <StatusIcon status={check.status} />
                  <div>
                    <div className="check-line">
                      <span className="check-label">{PHOTO_CHECK_LABELS[check.id]}</span>
                      <span className="check-word">{photoStatusWord(check)}</span>
                    </div>
                    <div className="check-message">{check.message}</div>
                    {check.status === "warn" && check.tip && (
                      <div className="check-tip">{check.tip}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine-print">Reading the photo…</p>
          )}
          <p className="fine-print">
            These read the pixels and can be wrong. Look at the photo yourself too.
          </p>
        </div>
      )}
      <div className="check-group you-check">
        <h3>{hasPhoto ? "You check" : "Before you take the photo"}</h3>
        <ul>
          {youCheck(doc).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="fine-print">
          {hasPhoto
            ? "A tool cannot judge these. Check them against the rules link above."
            : "These come from the rules linked on the left."}
        </p>
      </div>
    </section>
  );
}
