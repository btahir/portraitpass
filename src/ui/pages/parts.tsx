import type { ReactNode } from "react";
import type { DocumentSpec } from "../../core/documents";
import {
  CHECK_NOTE,
  canMakeAtHome,
  checkedDate,
  docPath,
  fmtDate,
  specSummary,
  type Faq,
} from "./content";
import "./pages.css";

export function PageShell({
  id,
  eyebrow,
  title,
  lede,
  crumbs,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  crumbs?: { href?: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <main id="main" className="content-page pg" data-pp-page={id}>
      {crumbs && (
        <nav className="pg-crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/">Home</a>
            </li>
            {crumbs.map((c) => (
              <li key={c.label}>
                {c.href ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      {eyebrow && <div className="eyebrow pg-eyebrow">{eyebrow}</div>}
      <h1 className="page-title pg-title">{title}</h1>
      {lede && <p className="lede pg-lede">{lede}</p>}
      {children}
    </main>
  );
}

export function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className="pg-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

export function SpecTable({
  caption,
  rows,
}: {
  caption: string;
  rows: [string, ReactNode][];
}) {
  return (
    <table className="pg-table pg-spec">
      <caption>{caption}</caption>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="pg-faq">
      {items.map((f) => (
        <div key={f.q} className="pg-faq-item">
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
    </div>
  );
}

export function DocLinks({ docs }: { docs: DocumentSpec[] }) {
  return (
    <ul className="pg-doclinks">
      {docs.map((d) => (
        <li key={d.id}>
          <a href={docPath(d)}>{d.name}</a>
          <span>
            {specSummary(d)}
            {!canMakeAtHome(d) && <em className="pg-tag">Not at home</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Sources({ doc }: { doc: DocumentSpec }) {
  return (
    <ul className="pg-sources">
      {doc.sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.title}
          </a>
          <span>
            {s.kind === "primary" ? "Issuing authority" : "Secondary source"}.
            Checked {fmtDate(s.checkedAt)}.
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Disclaimer() {
  return <p className="pg-note">{CHECK_NOTE}</p>;
}

export { checkedDate };
