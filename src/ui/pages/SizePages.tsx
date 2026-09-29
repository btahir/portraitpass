import type { ReactElement, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { DOCUMENTS, type DocumentSpec } from "../../core/documents";
import { withLocale, type Locale } from "../../i18n";
import { localizeDocument } from "../../i18n/localize";
import { strings } from "../../i18n/strings";
import { DocTable } from "./lists";
import { Disclaimer, FaqList, PageShell, Section, SpecTable } from "./parts";
import {
  type Faq,
  checkedDate,
  docPath,
  fitDescription,
  fmtDate,
  fmtIn,
  fmtMm,
  kbRange,
  listWords,
  ltr,
  mmToPx,
  nd,
  printSize,
  printSizeShort,
  sheetRows,
  studioPath,
} from "./content";

export interface PageDef {
  /** English path; the localized path is withLocale(path, locale). */
  path: string;
  title: string;
  description: string;
  crumb: string;
  faq?: Faq[];
  element: ReactElement;
}

const nearPrint = (d: DocumentSpec, w: number, h: number, tol = 0.6) =>
  !!d.print && Math.abs(d.print.widthMm - w) < tol && Math.abs(d.print.heightMm - h) < tol;
const names = (docs: DocumentSpec[], L: Locale, n = 4) => {
  const shown = docs.slice(0, n).map((d) => localizeDocument(d, L).name);
  // With a tail ("and 2 more") the shown names are a plain comma list, so "and" is not used twice.
  return docs.length > n
    ? shown.join(strings(L).fmt.sep) + strings(L).fmt.andMore(docs.length - n)
    : listWords(shown, "and", L);
};
/** Which size and guide pages apply to a document, for links from its own page. */
export function guideLinksFor(doc: DocumentSpec): { path: string; key: "twoByTwo" | "thirtyFive" | "sixHundred" | "under50" | "printing" }[] {
  const out: ReturnType<typeof guideLinksFor> = [];
  if (nearPrint(doc, 50.8, 50.8, 1)) out.push({ path: "/2x2-photo/", key: "twoByTwo" });
  if (nearPrint(doc, 35, 45)) out.push({ path: "/35x45-photo/", key: "thirtyFive" });
  if (exact600(doc) || accepts600(doc)) out.push({ path: "/600x600-photo/", key: "sixHundred" });
  const d = doc.digital;
  if (d && (d.maxKB !== undefined || d.minKB !== undefined)) out.push({ path: "/photo-under-50kb/", key: "under50" });
  if (doc.print && doc.diy !== "no") out.push({ path: "/print-passport-photos/", key: "printing" });
  return out;
}
function sheetCount(w: number, h: number, paper: "4x6" | "a4" | "letter") {
  const row = sheetRows().find(
    (r) => Math.abs(r.doc.print!.widthMm - w) < 0.6 && Math.abs(r.doc.print!.heightMm - h) < 0.6,
  );
  return row?.counts[paper];
}
/** "600 × 600" in the locale's digits. */
const px = (w: number, h: number, L: Locale) => ltr(`${nd(w, L)} × ${nd(h, L)}`, L);
/** The same with its unit inside the left-to-right run: "600 × 600 px". */
const pxUnit = (w: number, h: number, L: Locale) => ltr(`${nd(w, L)} × ${nd(h, L)} px`, L);
function StudioCta({ doc, label, locale }: { doc?: DocumentSpec; label?: string; locale: Locale }) {
  if (!doc) return null;
  const t = strings(locale);
  return (
    <div className="pg-cta">
      <a className="primary" href={studioPath(doc)} hrefLang={locale === "en" ? undefined : "en"}>
        {label ?? t.sizes.studioFor(localizeDocument(doc, locale).name)} <ArrowRight size={15} className="pg-arrow" aria-hidden="true" />
      </a>
      {t.doc.studioNote && <p className="pg-note">{t.doc.studioNote}</p>}
      <Disclaimer locale={locale} />
    </div>
  );
}
const homeDocs = (docs: DocumentSpec[]) => docs.filter((d) => d.diy !== "no");

// ------------------------------------------------------------------ 2x2
function twoByTwo(L: Locale): PageDef {
  const S = strings(L).sizes;
  const t = S.twoByTwo;
  const link = (p: string) => withLocale(p, L);
  const docs = DOCUMENTS.filter((d) => nearPrint(d, 50.8, 50.8, 1));
  const lead = docs[0];
  const home = homeDocs(docs);
  const sq = (dpi: number) => px(mmToPx(50.8, dpi), mmToPx(50.8, dpi), L);
  const sqU = (dpi: number) => pxUnit(mmToPx(50.8, dpi), mmToPx(50.8, dpi), L);
  const faq: Faq[] = [
    { q: t.faqPxQ, a: t.faqPxA(sq(300), sq(600), sq(200)) },
    { q: t.faqMmQ, a: t.faqMmA },
    {
      q: t.faqWhichQ,
      a: docs.length ? t.faqWhichA(names(docs, L, 6)) : t.faqWhichNone,
    },
  ];
  return {
    path: "/2x2-photo/",
    title: t.metaTitle,
    description: fitDescription(
      [
        t.metaLead(sq(300)),
        t.metaDocs(docs.length, lead ? localizeDocument(lead, L).name : t.metaLeadFallback),
        t.metaTail,
      ],
      [],
    ),
    crumb: t.crumb,
    faq,
    element: (
      <PageShell
        locale={L}
        id="2x2-photo"
        eyebrow={S.eyebrowSize}
        title={t.title}
        crumbs={[{ href: link("/documents/"), label: strings(L).index.crumb }, { label: t.crumb }]}
        lede={t.lede(sq(300), docs.length, docs.length ? names(docs, L, 3) : undefined)}
      >
        <Section title={S.unitsTitle} id="units">
          <SpecTable
            caption={t.caption}
            rows={[
              [S.inches, t.inRow],
              [S.millimetres, t.mmRow],
              [S.px300, sqU(300)],
              [S.px600, sqU(600)],
              ...(sheetCount(50.8, 50.8, "4x6")
                ? ([[S.onSheet, S.photosN(sheetCount(50.8, 50.8, "4x6")!)]] as [string, ReactNode][])
                : []),
            ]}
          />
        </Section>
        <Section title={t.docsTitle} id="documents">
          <DocTable caption={t.docsCaption} docs={docs} cols={["head", "eye", "home"]} locale={L} />
          <p>{t.docsNote}</p>
        </Section>
        <Section title={S.mistakesTitle} id="mistakes">
          <ul className="pg-rules">
            {t.mistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Section>
        <StudioCta doc={home[0]} locale={L} />
        <Section title={S.faqTitle} id="faq">
          <FaqList items={faq} />
        </Section>
        <p className="fine-print">
          {S.figuresChecked(lead ? checkedDate(lead, L) : fmtDate("2026-09-28", L))}
        </p>
      </PageShell>
    ),
  };
}

// ---------------------------------------------------------------- 35x45
function thirtyFiveByFortyFive(L: Locale): PageDef {
  const S = strings(L).sizes;
  const t = S.thirtyFive;
  const link = (p: string) => withLocale(p, L);
  const docs = DOCUMENTS.filter((d) => nearPrint(d, 35, 45));
  const home = homeDocs(docs);
  const countries = new Set(docs.map((d) => d.country)).size;
  const at = (dpi: number) => px(mmToPx(35, dpi), mmToPx(45, dpi), L);
  const atU = (dpi: number) => pxUnit(mmToPx(35, dpi), mmToPx(45, dpi), L);
  const faq: Faq[] = [
    { q: t.faqPxQ, a: t.faqPxA(at(300), at(600)) },
    { q: t.faqSameQ, a: t.faqSameA },
    { q: t.faqHeadQ, a: t.faqHeadA },
  ];
  return {
    path: "/35x45-photo/",
    title: t.metaTitle,
    description: fitDescription(
      [t.metaLead(at(300)), t.metaDocs(docs.length, countries), t.metaTail],
      [],
    ),
    crumb: t.crumb,
    faq,
    element: (
      <PageShell
        locale={L}
        id="35x45-photo"
        eyebrow={S.eyebrowSize}
        title={t.title}
        crumbs={[{ href: link("/documents/"), label: strings(L).index.crumb }, { label: t.crumb }]}
        lede={t.lede(at(300), docs.length)}
      >
        <Section title={S.unitsTitle} id="units">
          <SpecTable
            caption={t.caption}
            rows={[
              [S.millimetres, t.mmRow],
              [S.inches, ltr(`${fmtIn(35, L)} × ${fmtIn(45, L)} in`, L)],
              [S.px300, atU(300)],
              [S.px600, atU(600)],
              ...(sheetCount(35, 45, "4x6")
                ? ([[S.onSheet, S.photosN(sheetCount(35, 45, "4x6")!)]] as [string, ReactNode][])
                : []),
            ]}
          />
        </Section>
        <Section title={t.docsTitle} id="documents">
          <DocTable caption={t.docsCaption} docs={docs} cols={["head", "bg", "home"]} locale={L} />
          <p>{t.docsNote}</p>
        </Section>
        <Section title={S.mistakesTitle} id="mistakes">
          <ul className="pg-rules">
            {t.mistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Section>
        <StudioCta doc={home[0]} locale={L} />
        <Section title={S.faqTitle} id="faq">
          <FaqList items={faq} />
        </Section>
      </PageShell>
    ),
  };
}

// -------------------------------------------------------------- 600x600
const inRange = (v: number, lo?: number, hi?: number) => v >= (lo ?? 0) && v <= (hi ?? Infinity);
function exact600(d: DocumentSpec) {
  const x = d.digital;
  return !!x && !x.originalOnly && x.widthPx === 600 && x.heightPx === 600;
}
function accepts600(d: DocumentSpec) {
  const x = d.digital;
  if (!x || x.originalOnly || exact600(d)) return false;
  if (x.widthPx || x.heightPx) return false;
  const hasBounds = x.minWidthPx || x.maxWidthPx || x.minHeightPx || x.maxHeightPx;
  return (
    !!hasBounds &&
    inRange(600, x.minWidthPx, x.maxWidthPx) &&
    inRange(600, x.minHeightPx, x.maxHeightPx) &&
    (x.aspect === undefined || Math.abs(x.aspect - 1) < 0.01)
  );
}
function sixHundred(L: Locale): PageDef {
  const S = strings(L).sizes;
  const t = S.sixHundred;
  const link = (p: string) => withLocale(p, L);
  const exact = DOCUMENTS.filter(exact600);
  const range = DOCUMENTS.filter(accepts600);
  const all = [...exact, ...range];
  const withKb = all.filter((d) => d.digital && kbRange(d.digital, L));
  const faq: Faq[] = [
    { q: t.faqSameQ, a: t.faqSameA },
    {
      q: t.faqWhichQ,
      a: exact.length ? t.faqWhichA(names(exact, L)) : t.faqWhichNone,
    },
    {
      q: t.faqKbQ,
      a: all.some((d) => d.digital && kbRange(d.digital, L))
        ? t.faqKbA(
            withKb
              .slice(0, 4)
              .map((d) => t.faqKbItem(localizeDocument(d, L).name, kbRange(d.digital!, L)!))
              .join(strings(L).fmt.semi),
          )
        : t.faqKbNone,
    },
  ];
  const e0 = exact[0];
  const dg = e0?.digital;
  return {
    path: "/600x600-photo/",
    title: t.metaTitle,
    description: fitDescription(
      [t.metaLead(exact.length, range.length), t.metaTail],
      [t.metaFiller],
    ),
    crumb: t.crumb,
    faq,
    element: (
      <PageShell
        locale={L}
        id="600x600-photo"
        eyebrow={S.eyebrowSize}
        title={t.title}
        crumbs={[{ href: link("/documents/"), label: strings(L).index.crumb }, { label: t.crumb }]}
        lede={t.lede(exact.length, range.length)}
      >
        <Section title={t.meaningTitle} id="meaning">
          <p>{t.meaningBody}</p>
          {dg && (dg.headRatioMin ?? 0) > 0 && (
            <p>
              {t.meaningHead(
                localizeDocument(e0, L).name,
                Math.round((dg.headRatioMin ?? 0) * 600),
                Math.round((dg.headRatioMax ?? 0) * 600),
                Math.round((dg.eyeRatioMin ?? 0) * 600),
                Math.round((dg.eyeRatioMax ?? 0) * 600),
              )}
            </p>
          )}
        </Section>
        {exact.length > 0 && (
          <Section title={t.exactTitle} id="exact">
            <DocTable caption={t.exactCaption} docs={exact} cols={["digital", "kb", "home"]} locale={L} />
          </Section>
        )}
        {range.length > 0 && (
          <Section title={t.rangeTitle} id="range">
            <DocTable caption={t.rangeCaption} docs={range} cols={["digital", "kb", "home"]} locale={L} />
            <p>{t.rangeNote}</p>
          </Section>
        )}
        <StudioCta doc={exact.find((d) => d.diy !== "no") ?? range[0]} locale={L} />
        <Section title={S.faqTitle} id="faq">
          <FaqList items={faq} />
        </Section>
      </PageShell>
    ),
  };
}

// ----------------------------------------------------------- under 50 KB
function under50(L: Locale): PageDef {
  const S = strings(L).sizes;
  const t = S.under50;
  const link = (p: string) => withLocale(p, L);
  const limited = DOCUMENTS.filter((d) => d.digital && (d.digital.maxKB !== undefined || d.digital.minKB !== undefined));
  const withMax = limited
    .filter((d) => d.digital!.maxKB !== undefined)
    .sort((a, b) => a.digital!.maxKB! - b.digital!.maxKB!);
  const smallest = withMax[0];
  const atOrUnder50 = withMax.filter((d) => d.digital!.maxKB! <= 50);
  const thousand = limited.filter((d) => d.digital!.kbBytes === 1000);
  const smallestText = smallest
    ? t.smallestOf(smallest.digital!.maxKB!, localizeDocument(smallest, L).name)
    : undefined;
  const faq: Faq[] = [
    { q: t.faqWhichQ, a: t.faqWhichA(limited.length, smallestText ?? t.faqWhichNone) },
    {
      q: t.faqBytesQ,
      a: thousand.length ? t.faqBytesA(names(thousand, L)) : t.faqBytesNone,
    },
    { q: t.faqSmallerQ, a: t.faqSmallerA },
  ];
  return {
    path: "/photo-under-50kb/",
    title: t.metaTitle,
    description: fitDescription(
      [t.metaLead(limited.length, smallest ? nd(smallest.digital!.maxKB!, L) : t.metaNone), t.metaTail],
      [t.metaFiller],
    ),
    crumb: t.crumb,
    faq,
    element: (
      <PageShell
        locale={L}
        id="photo-under-50kb"
        eyebrow={S.eyebrowFile}
        title={t.title}
        crumbs={[{ href: link("/documents/"), label: strings(L).index.crumb }, { label: t.crumb }]}
        lede={
          atOrUnder50.length
            ? t.ledeSome(atOrUnder50.length, names(atOrUnder50, L))
            : t.ledeNone(smallestText ?? t.notStated)
        }
      >
        <Section title={t.limitsTitle} id="limits">
          <DocTable
            caption={t.limitsCaption}
            docs={[...withMax, ...limited.filter((d) => d.digital!.maxKB === undefined)]}
            cols={["kb", "digital", "home"]}
            locale={L}
          />
        </Section>
        <Section title={t.countingTitle} id="counting">
          <p>{t.countingBody(thousand.length > 0 ? names(thousand, L) : undefined)}</p>
        </Section>
        <Section title={t.howTitle} id="how">
          <ol className="pg-steps">
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p>{t.howAfter}</p>
        </Section>
        <StudioCta doc={withMax.find((d) => d.diy !== "no")} label={t.studioLabel} locale={L} />
        <Section title={S.faqTitle} id="faq">
          <FaqList items={faq} />
        </Section>
      </PageShell>
    ),
  };
}

// ---------------------------------------------------------- print sheet
function printSheet(L: Locale): PageDef {
  const S = strings(L).sizes;
  const t = S.sheet;
  const link = (p: string) => withLocale(p, L);
  const rows = sheetRows();
  const us = DOCUMENTS.find((d) => d.id === "us-passport");
  const first = rows[0];
  const faq: Faq[] = [
    {
      q: t.faqCountQ,
      a: rows.length
        ? t.faqCountA(
            rows
              .map((r) => t.faqCountItem(r.counts["4x6"], printSizeShort(r.doc.print!, L)))
              .slice(0, 3)
              .join(strings(L).fmt.sep),
          )
        : t.faqCountNone,
    },
    { q: t.faqLinesQ, a: t.faqLinesA },
    { q: t.faqSettingQ, a: t.faqSettingA },
  ];
  return {
    path: "/passport-photo-print-sheet/",
    title: t.metaTitle,
    description: fitDescription([t.metaLead, t.metaTail], [t.metaFiller]),
    crumb: t.crumb,
    faq,
    element: (
      <PageShell
        locale={L}
        id="passport-photo-print-sheet"
        eyebrow={S.eyebrowSheet}
        title={t.title}
        crumbs={[{ href: link("/print-passport-photos/"), label: t.crumbPrinting }, { label: t.crumb }]}
        lede={t.lede(
          first?.counts["4x6"] ?? 6,
          first ? printSizeShort(first.doc.print!, L) : t.ledeSizeFallback,
        )}
      >
        <Section title={t.countsTitle} id="counts">
          <div className="pg-table-wrap">
            <table className="pg-table pg-list pg-auto">
              <caption>{t.countsCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.colSize}</th>
                  <th scope="col">{t.col4x6}</th>
                  <th scope="col">{t.colA4}</th>
                  <th scope="col">{t.colLetter}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.size}>
                    <th scope="row" className="pg-nowrap">
                      {printSize(r.doc.print!, L)}
                    </th>
                    <td>{nd(r.counts["4x6"], L)}</td>
                    <td>{nd(r.counts["a4"], L)}</td>
                    <td>{nd(r.counts["letter"], L)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>{t.countsNote}</p>
        </Section>
        <Section title={t.printingTitle} id="printing">
          <ol className="pg-steps">
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p>
            {t.seeGuideBefore}
            <a href={link("/print-passport-photos/")}>{t.seeGuideLink}</a>
            {t.seeGuideAfter}
          </p>
        </Section>
        <StudioCta doc={us} label={t.studioLabel} locale={L} />
        <Section title={S.faqTitle} id="faq">
          <FaqList items={faq} />
        </Section>
      </PageShell>
    ),
  };
}

// ---------------------------------------------------------- print guide
function printGuide(L: Locale): PageDef {
  const S = strings(L).sizes;
  const t = S.guide;
  const link = (p: string) => withLocale(p, L);
  const withPaper = DOCUMENTS.filter((d) => d.print?.paper);
  const au = DOCUMENTS.find((d) => d.id === "au-passport");
  const uk = DOCUMENTS.find((d) => d.id === "uk-passport");
  const lau = au && localizeDocument(au, L);
  const luk = uk && localizeDocument(uk, L);
  const usSix = sheetCount(50.8, 50.8, "4x6") ?? 6;
  const faq: Faq[] = [
    { q: t.faqCostQ, a: t.faqCostA },
    { q: t.faqHomeQ, a: t.faqHomeA },
    { q: t.faqCropQ, a: t.faqCropA },
  ];
  return {
    path: "/print-passport-photos/",
    title: t.metaTitle,
    description: fitDescription([t.metaLead, t.metaTail], [t.metaFiller]),
    crumb: t.crumb,
    faq,
    element: (
      <PageShell
        locale={L}
        id="print-passport-photos"
        eyebrow={S.eyebrowPrinting}
        title={t.title}
        crumbs={[{ label: t.crumb }]}
        lede={t.lede(usSix)}
      >
        <Section title={t.counterTitle} id="counter">
          <ol className="pg-steps">
            {t.counterSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p>{t.counterNote}</p>
        </Section>
        <Section title={t.homeTitle} id="home">
          <p>
            {t.homeBefore}
            <a href={link("/passport-photo-print-sheet/")}>{t.homeLink}</a>
            {t.homeAfter}
          </p>
        </Section>
        <Section title={t.rulesTitle} id="rules">
          {lau && (
            <>
              <h3>{t.auHeading}</h3>
              <p>{t.auBody(lau.diyNote ?? "", lau.print?.paper ?? "")}</p>
            </>
          )}
          {luk && (
            <>
              <h3>{t.ukHeading}</h3>
              <p>
                {luk.diyNote}
                {t.ukBefore}
                <a href={link("/uk-passport-online-photo/")}>{t.ukLink}</a>
                {t.ukAfter}
              </p>
            </>
          )}
          {withPaper.length > 0 && (
            <div className="pg-table-wrap">
              <table className="pg-table pg-list pg-auto">
                <caption>{strings(L).table.paperCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{strings(L).table.document}</th>
                    <th scope="col">{strings(L).table.paperSize}</th>
                    <th scope="col">{strings(L).table.paperPaper}</th>
                  </tr>
                </thead>
                <tbody>
                  {withPaper.map((d) => {
                    const ld = localizeDocument(d, L);
                    return (
                      <tr key={d.id}>
                        <th scope="row">
                          <a href={docPath(d, L)}>{ld.name}</a>
                        </th>
                        <td className="pg-nowrap">{printSizeShort(d.print!, L)}</td>
                        <td>{ld.print!.paper}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p>{t.noHomeNote}</p>
        </Section>
        <Section title={S.faqTitle} id="faq">
          <FaqList items={faq} />
        </Section>
        <p className="pg-note">{t.closing}</p>
      </PageShell>
    ),
  };
}

export function sizePages(locale: Locale = "en"): PageDef[] {
  return [
    twoByTwo(locale),
    thirtyFiveByFortyFive(locale),
    sixHundred(locale),
    under50(locale),
    printSheet(locale),
    printGuide(locale),
  ];
}
export { fmtMm };
