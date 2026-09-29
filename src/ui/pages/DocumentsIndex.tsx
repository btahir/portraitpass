import { DOCUMENTS } from "../../core/documents";
import { PageShell, Section } from "./parts";
import { DocTable } from "./lists";

export function documentsByCountry() {
  const map = new Map<string, typeof DOCUMENTS>();
  for (const d of DOCUMENTS) map.set(d.country, [...(map.get(d.country) ?? []), d]);
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function DocumentsIndexPage() {
  const groups = documentsByCountry();
  const atHome = DOCUMENTS.filter((d) => d.diy !== "no").length;
  return (
    <PageShell
      id="documents"
      eyebrow="Photo requirements"
      title="Passport, visa and ID photo requirements"
      crumbs={[{ label: "Documents" }]}
      lede={`${DOCUMENTS.length} documents from ${groups.length} countries and regions, each with its size, head and eye positions, background rule and the source we read. ${atHome} can be prepared at home; ${DOCUMENTS.length - atHome} need a photographer, a booth or a capture at the issuing office, and the page says so.`}
    >
      <nav aria-label="Countries" className="pg-section">
        <ul className="pg-links">
          {groups.map(([country, docs]) => (
            <li key={country}>
              <a href={`#${slug(country)}`}>
                {country} ({docs.length})
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Section title="By size" id="by-size">
        <ul className="pg-links">
          <li><a href="/2x2-photo/">2×2 inch photo</a></li>
          <li><a href="/35x45-photo/">35×45 mm photo</a></li>
          <li><a href="/600x600-photo/">600×600 px upload</a></li>
          <li><a href="/photo-under-50kb/">Photo under 50 KB</a></li>
          <li><a href="/print-passport-photos/">Printing guide</a></li>
        </ul>
      </Section>
      {groups.map(([country, docs]) => (
        <section className="pg-country" key={country} aria-labelledby={slug(country)}>
          <h2 id={slug(country)}>
            {country} <small>{docs.length} {docs.length === 1 ? "document" : "documents"}</small>
          </h2>
          <DocTable caption={`${country} documents`} docs={docs} cols={["size", "home"]} />
        </section>
      ))}
      <p className="pg-note">
        Each figure comes from the issuing authority’s own page and is listed with the date we last
        checked it. We check sizes and positions; the issuing authority decides acceptance.
      </p>
    </PageShell>
  );
}
