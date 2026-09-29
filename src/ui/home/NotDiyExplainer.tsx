import type { DocumentSpec } from "../../core/index";
import { digitalLabel, docPagePath, formatChecked, printSizeLabel } from "./docInfo";
import "./home.css";

export interface NotDiyExplainerProps {
  doc: DocumentSpec;
  /** Short form for the home page: the reason, one link to the full page, pick another. */
  compact?: boolean;
  /** Render "Pick another document" as a button that calls this instead of a link. */
  onPickAnother?: () => void;
  /** Where "Pick another document" goes when there is no handler. */
  pickAnotherHref?: string;
  /** Heading level of the title (default 2). */
  headingLevel?: 2 | 3;
}

function mmRange(min?: number, max?: number): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined) return `${min}–${max} mm`;
  return min !== undefined ? `at least ${min} mm` : `up to ${max} mm`;
}

function specRows(doc: DocumentSpec): [string, string][] {
  const rows: [string, string][] = [];
  const p = doc.print;
  if (p) {
    rows.push(["Photo size", printSizeLabel(p.widthMm, p.heightMm)]);
    const head = mmRange(p.headMinMm, p.headMaxMm);
    if (head) rows.push(["Head, crown to chin", head]);
    const eye = mmRange(p.eyeMinMm, p.eyeMaxMm);
    if (eye) rows.push(["Eye line from bottom", eye]);
    if (p.copies) rows.push(["Copies", String(p.copies)]);
    if (p.paper) rows.push(["Print", p.paper]);
  }
  const digital = digitalLabel(doc);
  if (digital) rows.push(["Upload", digital]);
  if (doc.background.colors.length)
    rows.push(["Background", doc.background.colors.join(", ")]);
  return rows;
}

/**
 * Plain explanation for a document whose photo is taken by someone else.
 * Uses the dataset's own note and sources; never promises an outcome.
 */
export function NotDiyExplainer({
  doc,
  compact = false,
  onPickAnother,
  pickAnotherHref = "/documents/",
  headingLevel = 2,
}: NotDiyExplainerProps) {
  const H = `h${headingLevel}` as "h2" | "h3";
  const rows = specRows(doc);
  const pick = onPickAnother ? (
    <button type="button" className="nd-link" onClick={onPickAnother}>
      Pick another document
    </button>
  ) : (
    <a className="nd-link" href={pickAnotherHref}>
      Pick another document
    </a>
  );
  const titleId = `nd-${doc.id}`;

  if (compact) {
    return (
      <section className="nd nd--compact" aria-labelledby={titleId}>
        <H id={titleId} className="nd-title">
          {doc.name} can’t be made at home
        </H>
        <p className="nd-note">{doc.diyNote}</p>
        <p className="nd-links">
          <a className="nd-link" href={docPagePath(doc)}>
            Rules and sources
          </a>
          {pick}
        </p>
      </section>
    );
  }

  return (
    <section className="nd" aria-labelledby={titleId}>
      <H id={titleId} className="nd-title">
        {doc.name} can’t be made at home
      </H>
      <p className="nd-note">{doc.diyNote}</p>

      <div className="nd-block">
        <h3>What to do instead</h3>
        <p>
          Ask the issuing office, or read its page linked under Sources, which
          photographers or booths it takes and what to bring. Rules change, so
          check before you go.
        </p>
      </div>

      {(rows.length > 0 || doc.rules.length > 0) && (
        <div className="nd-block">
          <h3>The rules we know</h3>
          {rows.length > 0 && (
            <table className="nd-table">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {doc.rules.length > 0 && (
            <ul className="nd-rules">
              {doc.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {doc.sources.length > 0 && (
        <div className="nd-block">
          <h3>Sources</h3>
          <ul className="nd-sources">
            {doc.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} rel="noopener noreferrer" target="_blank">
                  {s.title}
                </a>
                <span>
                  {s.kind === "secondary" ? "secondary source, " : ""}checked{" "}
                  {formatChecked(s.checkedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="nd-links">{pick}</p>
    </section>
  );
}
