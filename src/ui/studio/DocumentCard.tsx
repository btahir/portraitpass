import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { DocumentSpec, Preset } from "../../core/index";
import { DocumentPicker } from "../home/DocumentPicker";
import { digitalLabel, printSizeLabel } from "../home/docInfo";
import { sourceLabel } from "../checks";
import { checkedOn } from "./lib";

const n = (v: number) => String(Number(v.toFixed(1)));
const range = (min?: number, max?: number) =>
  min !== undefined && max !== undefined ? `${n(min)}–${n(max)} mm` : undefined;

/** The numbers a person checks a photo against, each from the dataset. */
export function documentRows(
  doc: DocumentSpec | undefined,
  preset: Preset,
): [string, string][] {
  const rows: [string, string][] = [];
  if (preset.mode === "original") {
    rows.push(["Upload", doc ? (digitalLabel(doc) ?? "Your original file") : "Your original file"]);
    rows.push(["Editing", "None. The file is sent as you took it."]);
  } else {
    const size = printSizeLabel(preset.widthMm, preset.heightMm);
    rows.push([
      "Photo size",
      /mm$/.test(size)
        ? size
        : `${size} (${n(preset.widthMm)} × ${n(preset.heightMm)} mm)`,
    ]);
    const head = range(preset.headMinMm, preset.headMaxMm);
    if (head) rows.push(["Head", `${head}, crown to chin`]);
    const eyes = range(preset.eyeMinMm, preset.eyeMaxMm);
    if (eyes) rows.push(["Eye line", `${eyes} from the bottom edge`]);
    const digital = doc ? digitalLabel(doc) : undefined;
    if (digital) rows.push(["Upload", digital]);
    if (doc?.print?.copies) rows.push(["Copies", String(doc.print.copies)]);
    if (doc?.print?.paper) rows.push(["Paper", doc.print.paper]);
  }
  if (doc?.background.colors.length)
    rows.push(["Background", doc.background.colors.join(", ")]);
  return rows;
}

export function DocumentCard({
  doc,
  preset,
  busy,
  customDraft,
  onCustomDraft,
  onCustomCommit,
  onDocChange,
  headingLevel = 2,
}: {
  doc?: DocumentSpec;
  preset: Preset;
  busy: boolean;
  customDraft: { widthMm: string; heightMm: string };
  onCustomDraft(next: { widthMm: string; heightMm: string }): void;
  onCustomCommit(key: "widthMm" | "heightMm"): void;
  onDocChange(id: string): void;
  headingLevel?: 2 | 3;
}) {
  const [open, setOpen] = useState(false);
  // Below the desktop layout the numbers fold away behind one line so the photo comes first.
  const [more, setMore] = useState(false);
  // The custom-size fields are how a general photo gets its size, so they never fold away.
  const pinned = preset.mode === "general";
  const rows = documentRows(doc, preset);
  const brief = rows
    .filter(([term]) => ["Photo size", "Upload", "Head"].includes(term))
    .slice(0, 2)
    .map(([term, value]) =>
      term === "Head" ? `head ${value.replace(/, crown to chin$/, "")}` : value,
    )
    .join(" · ");
  const H = `h${headingLevel}` as "h2" | "h3";
  const notes = [doc?.diyNote, ...(doc ? [] : (preset.notes ?? []))].filter(
    (t): t is string => !!t,
  );
  const sources = doc?.sources.length
    ? doc.sources.slice(0, 2).map((s) => ({ url: s.url, title: s.title, checkedAt: s.checkedAt }))
    : preset.sourceUrl
      ? [{ url: preset.sourceUrl, title: sourceLabel(preset), checkedAt: preset.checkedAt }]
      : [];
  return (
    <section className="doc-card" aria-label="Document">
      <div className="label">Document</div>
      <H className="doc-name">{doc?.name ?? preset.name}</H>
      <p className="doc-brief">{brief}</p>
      {!pinned && (
        <button
          className="text-button doc-more-toggle"
          aria-expanded={more}
          onClick={() => setMore((v) => !v)}
        >
          {more ? "Hide rules and sources" : "Rules and sources"}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      )}
      <div className={`doc-body${more || pinned ? " show" : ""}`}>
      <dl className="doc-specs">
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {preset.mode === "general" && (
        <div className="custom-size-fields">
          {(["widthMm", "heightMm"] as const).map((key) => (
            <label className="field-label" key={key}>
              {key === "widthMm" ? "Width (mm)" : "Height (mm)"}
              <input
                type="text"
                inputMode="decimal"
                disabled={busy}
                value={customDraft[key]}
                onChange={(event) =>
                  onCustomDraft({ ...customDraft, [key]: event.target.value })
                }
                onBlur={() => onCustomCommit(key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <ul className="doc-notes" aria-label="Notes for this document">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      {sources.map((s) => (
        <p className="doc-source" key={s.url}>
          <a className="source-link" href={s.url} target="_blank" rel="noreferrer">
            {s.title} <ExternalLink size={12} aria-hidden="true" />
          </a>
          <span>Requirements checked {checkedOn(s.checkedAt)}.</span>
        </p>
      ))}
      </div>
      <details
        className="doc-switch"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary>Change document</summary>
        <DocumentPicker
          compact
          value={doc?.id}
          onChange={(id) => {
            setOpen(false);
            onDocChange(id);
          }}
        />
        {preset.mode !== "general" && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onDocChange("general-id");
            }}
          >
            Not on the list? Use a custom size
          </button>
        )}
      </details>
    </section>
  );
}
