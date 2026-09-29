import { DOCUMENTS } from "../../core/documents";
import { LOCALES, withLocale, type Locale } from "../../i18n";
import { localizeCountry } from "../../i18n/localize";
import { strings } from "../../i18n/strings";
import { nd } from "./content";
import { PageShell, Section } from "./parts";
import { DocTable } from "./lists";

/** Documents grouped by country, sorted by the country's name in the page language. */
export function documentsByCountry(locale: Locale = "en") {
  const map = new Map<string, typeof DOCUMENTS>();
  for (const d of DOCUMENTS) map.set(d.country, [...(map.get(d.country) ?? []), d]);
  const collator = new Intl.Collator(LOCALES[locale].hreflang);
  return [...map.entries()].sort((a, b) =>
    collator.compare(localizeCountry(a[0], locale), localizeCountry(b[0], locale)),
  );
}
// Anchors come from the English country name so they stay stable and ASCII in every language.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function DocumentsIndexPage({ locale = "en" }: { locale?: Locale }) {
  const t = strings(locale).index;
  const groups = documentsByCountry(locale);
  const atHome = DOCUMENTS.filter((d) => d.diy !== "no").length;
  const link = (path: string) => withLocale(path, locale);
  return (
    <PageShell
      locale={locale}
      id="documents"
      eyebrow={t.eyebrow}
      title={t.title}
      crumbs={[{ label: t.crumb }]}
      lede={t.lede(
        DOCUMENTS.length,
        groups.length,
        atHome,
        DOCUMENTS.length - atHome,
      )}
    >
      <nav aria-label={t.countriesNav} className="pg-section">
        <ul className="pg-links">
          {groups.map(([country, docs]) => (
            <li key={country}>
              <a href={`#${slug(country)}`}>
                {localizeCountry(country, locale)} ({nd(docs.length, locale)})
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Section title={t.bySize} id="by-size">
        <ul className="pg-links">
          <li><a href={link("/2x2-photo/")}>{t.links.twoByTwo}</a></li>
          <li><a href={link("/35x45-photo/")}>{t.links.thirtyFive}</a></li>
          <li><a href={link("/600x600-photo/")}>{t.links.sixHundred}</a></li>
          <li><a href={link("/photo-under-50kb/")}>{t.links.under50}</a></li>
          <li><a href={link("/print-passport-photos/")}>{t.links.printing}</a></li>
        </ul>
      </Section>
      {groups.map(([country, docs]) => {
        const name = localizeCountry(country, locale);
        return (
          <section className="pg-country" key={country} aria-labelledby={slug(country)}>
            <h2 id={slug(country)}>
              {name} <small>{t.countTag(docs.length)}</small>
            </h2>
            <DocTable caption={t.tableCaption(name)} docs={docs} cols={["size", "home"]} locale={locale} />
          </section>
        );
      })}
      <p className="pg-note">{t.footnote}</p>
    </PageShell>
  );
}
