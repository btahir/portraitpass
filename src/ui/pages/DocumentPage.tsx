import { ArrowDown, ArrowRight } from "lucide-react";
import type { DocumentSpec } from "../../core/documents";
import { DOCUMENTS } from "../../core/documents";
import { withLocale, type Locale } from "../../i18n";
import { localizeDocument } from "../../i18n/localize";
import { strings } from "../../i18n/strings";
import { DocDiagram } from "./Diagram";
import {
  DocLinks,
  FaqList,
  PageShell,
  Section,
  SpecTable,
  Sources,
} from "./parts";
import {
  backgroundRelevant,
  backgroundSentence,
  canMakeAtHome,
  checkNote,
  checkedDate,
  digitalDims,
  documentFaq,
  editingSentence,
  eyeRange,
  eyeRatio,
  formatNames,
  headRange,
  headRatio,
  introSentence,
  kbDefinition,
  kbRange,
  listWords,
  nd,
  photoName,
  printSize,
  printSizeShort,
  related,
  rulesNote,
  sameSize,
  siblings,
  studioPath,
} from "./content";

function printRows(doc: DocumentSpec, L: Locale): [string, string][] {
  const p = doc.print;
  if (!p) return [];
  const t = strings(L).doc;
  const ld = localizeDocument(doc, L);
  const rows: [string, string][] = [[t.rowPhotoSize, printSize(p, L)]];
  const h = headRange(p, L);
  const e = eyeRange(p, L);
  if (h) rows.push([t.rowHead, h]);
  if (e) rows.push([t.rowEye, e]);
  if (p.copies) rows.push([t.rowCopies, nd(p.copies, L)]);
  if (ld.print?.paper) rows.push([t.rowPaper, ld.print.paper]);
  return rows;
}
function digitalRows(doc: DocumentSpec, L: Locale): [string, string][] {
  const d = doc.digital;
  if (!d) return [];
  const t = strings(L).doc;
  const rows: [string, string][] = [];
  if (d.originalOnly) rows.push([t.rowUpload, t.rowUploadOriginal]);
  const dims = digitalDims(d, L);
  if (dims) rows.push([d.originalOnly ? t.rowMinSize : t.rowImageSize, dims]);
  const kb = kbRange(d, L);
  if (kb) rows.push([t.rowFileSize, t.fileSizeValue(kb, kbDefinition(d, L))]);
  rows.push([t.rowFormats, listWords(formatNames(d), "and", L)]);
  const hr = headRatio(d, L);
  const er = eyeRatio(d, L);
  if (hr) rows.push([t.rowHead, hr]);
  if (er) rows.push([t.rowEye, er]);
  return rows;
}

function HomeSection({ doc, locale }: { doc: DocumentSpec; locale: Locale }) {
  const t = strings(locale).doc;
  const ld = localizeDocument(doc, locale);
  const others = DOCUMENTS.filter(
    (d) => d.diy !== "no" && d.country === doc.country && d.id !== doc.id,
  ).slice(0, 4);
  if (doc.diy === "no") {
    return (
      <Section title={t.homeTitle} id="home">
        <p>
          <strong>{t.homeNo}</strong> {ld.diyNote ?? t.homeNoDefault}
        </p>
        <h3>{t.whereInstead}</h3>
        <p>
          {t.whereBody}
          {(doc.print || doc.digital) && t.whereFigures}
        </p>
        {others.length > 0 && (
          <>
            <h3>{t.othersFrom(ld.country)}</h3>
            <DocLinks docs={others} locale={locale} />
          </>
        )}
        <p>
          <a href={withLocale("/documents/", locale)}>{t.browseAll}</a>
        </p>
      </Section>
    );
  }
  const lead = doc.diy === "digital-only" && !doc.diyNote ? t.homeYesDigitalOnly : t.homeYes;
  return (
    <Section title={t.homeTitle} id="home">
      <p>
        <strong>{lead}</strong> {ld.diyNote ?? t.homeYesDefault}
      </p>
      <p>{doc.diy === "digital-only" ? t.studioBodyDigital : t.studioBodyPrint}</p>
      <div className="pg-cta">
        <a className="primary" href={studioPath(doc)} hrefLang={locale === "en" ? undefined : "en"}>
          {t.openStudio} <ArrowRight size={15} className="pg-arrow" aria-hidden="true" />
        </a>
      </div>
    </Section>
  );
}

export function DocumentPage({ doc, locale = "en" }: { doc: DocumentSpec; locale?: Locale }) {
  const t = strings(locale).doc;
  const ld = localizeDocument(doc, locale);
  const pr = printRows(doc, locale);
  const dr = digitalRows(doc, locale);
  const faq = documentFaq(doc, locale);
  const sib = siblings(doc);
  const rel = related(doc).filter((d) => !sib.includes(d));
  const same = sameSize(doc);
  const atHome = canMakeAtHome(doc);
  const hasSpec = pr.length > 0 || dr.length > 0;
  const date = checkedDate(doc, locale);
  return (
    <PageShell
      locale={locale}
      id={doc.id}
      eyebrow={t.eyebrow(ld.country, t.kind[doc.kind])}
      title={t.title(photoName(doc, locale))}
      crumbs={[
        { href: withLocale("/documents/", locale), label: strings(locale).index.crumb },
        { label: ld.name },
      ]}
      lede={introSentence(doc, locale)}
      actions={
        <div className="pg-actions">
          {atHome ? (
            <>
              <a className="primary" href={studioPath(doc)} hrefLang={locale === "en" ? undefined : "en"}>
                {t.openStudio} <ArrowRight size={15} className="pg-arrow" aria-hidden="true" />
              </a>
              <span className="pg-actions-note">
                {t.stays}
                {t.studioNote && ` ${t.studioNote}`}
              </span>
            </>
          ) : (
            <>
              <a className="pg-jump" href="#home">
                {t.whereInstead} <ArrowDown size={15} aria-hidden="true" />
              </a>
              <em className="pg-tag">{strings(locale).fmt.notAtHome}</em>
            </>
          )}
        </div>
      }
      aside={<DocDiagram doc={doc} locale={locale} />}
    >
      {hasSpec && (
        <Section title={t.specTitle} id="spec">
          {pr.length > 0 && <SpecTable caption={t.printCaption} rows={pr} />}
          {dr.length > 0 && <SpecTable caption={t.digitalCaption} rows={dr} />}
          <p className="pg-note">
            {atHome
              ? t.specNote(checkNote(locale), date, rulesNote(locale))
              : t.specNoteNotHome(date, rulesNote(locale))}
          </p>
        </Section>
      )}

      {backgroundRelevant(doc) && (
        <Section title={t.backgroundTitle} id="background">
          <p>
            {backgroundSentence(doc, locale)} {editingSentence(doc, locale)}
          </p>
        </Section>
      )}

      <Section title={t.rulesTitle} id="rules">
        <ul className="pg-rules">
          {ld.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {doc.diy !== "no" && <p>{t.rulesFooter}</p>}
      </Section>

      <HomeSection doc={doc} locale={locale} />

      <Section title={t.sourcesTitle} id="sources">
        <Sources doc={doc} locale={locale} />
        {!hasSpec && <p>{rulesNote(locale)}</p>}
      </Section>

      <Section title={t.faqTitle} id="faq">
        <FaqList items={faq} />
      </Section>

      {(sib.length > 0 || rel.length > 0 || same.length > 0) && (
        <Section title={t.relatedTitle} id="related">
          {sib.length > 0 && (
            <>
              <h3>{t.relSiblings}</h3>
              <DocLinks docs={sib} locale={locale} />
            </>
          )}
          {rel.length > 0 && (
            <>
              <h3>{t.relCountry(ld.country)}</h3>
              <DocLinks docs={rel} locale={locale} />
            </>
          )}
          {same.length > 0 && (
            <>
              <h3>{t.relSameSize(printSizeShort(doc.print!, locale))}</h3>
              <DocLinks docs={same} locale={locale} />
            </>
          )}
        </Section>
      )}
    </PageShell>
  );
}
