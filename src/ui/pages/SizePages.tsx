import type { ReactElement, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { DOCUMENTS, type DocumentSpec } from "../../core/documents";
import { DocTable } from "./lists";
import { Disclaimer, FaqList, PageShell, Section, SpecTable } from "./parts";
import {
  type Faq,
  checkedDate,
  docPath,
  fmtIn,
  fmtMm,
  kbRange,
  listWords,
  mmToPx,
  printSize,
  printSizeShort,
  sheetRows,
  studioPath,
  fitDescription,
} from "./content";

export interface PageDef {
  path: string;
  title: string;
  description: string;
  crumb: string;
  faq?: Faq[];
  element: ReactElement;
}

const nearPrint = (d: DocumentSpec, w: number, h: number, tol = 0.6) =>
  !!d.print && Math.abs(d.print.widthMm - w) < tol && Math.abs(d.print.heightMm - h) < tol;
const names = (docs: DocumentSpec[], n = 4) =>
  listWords(docs.slice(0, n).map((d) => d.name)) + (docs.length > n ? ` and ${docs.length - n} more` : "");
function sheetCount(w: number, h: number, paper: "4x6" | "a4" | "letter") {
  const row = sheetRows().find(
    (r) => Math.abs(r.doc.print!.widthMm - w) < 0.6 && Math.abs(r.doc.print!.heightMm - h) < 0.6,
  );
  return row?.counts[paper];
}
function StudioCta({ doc, label }: { doc?: DocumentSpec; label?: string }) {
  if (!doc) return null;
  return (
    <div className="pg-cta">
      <a className="primary" href={studioPath(doc)}>
        {label ?? `Open the studio for the ${doc.name}`} <ArrowRight size={15} />
      </a>
      <Disclaimer />
    </div>
  );
}
const homeDocs = (docs: DocumentSpec[]) => docs.filter((d) => d.diy !== "no");

// ------------------------------------------------------------------ 2x2
function twoByTwo(): PageDef {
  const docs = DOCUMENTS.filter((d) => nearPrint(d, 50.8, 50.8, 1));
  const lead = docs[0];
  const home = homeDocs(docs);
  const faq: Faq[] = [
    {
      q: "How many pixels is a 2×2 inch photo?",
      a: `${mmToPx(50.8)} × ${mmToPx(50.8)} pixels at 300 DPI, ${mmToPx(50.8, 600)} × ${mmToPx(50.8, 600)} at 600 DPI and ${mmToPx(50.8, 200)} × ${mmToPx(50.8, 200)} at 200 DPI. A print is defined by its physical size, so the pixel count matters only for uploads.`,
    },
    {
      q: "Is 2×2 inches the same as 51×51 mm?",
      a: "Almost. Two inches is 50.8 mm, and some forms round it to 51 mm. A sheet printed at actual size will measure 50.8 mm each way, which is what the 2 inch rule means.",
    },
    {
      q: "Which documents use a 2×2 inch photo?",
      a: docs.length
        ? `In our dataset: ${names(docs, 6)}.`
        : "No document in our dataset currently asks for this size.",
    },
  ];
  return {
    path: "/2x2-photo/",
    title: "2×2 inch photo: size, pixels and documents — PortraitPass",
    description: fitDescription(
      [
        `2×2 inch photo: 50.8 mm, ${mmToPx(50.8)} × ${mmToPx(50.8)} px at 300 DPI.`,
        `${docs.length} documents use it, including ${lead?.name ?? "the US passport"}.`,
        "Head and eye positions, common mistakes and a free browser tool.",
      ],
      [],
    ),
    crumb: "2×2 inch photo",
    faq,
    element: (
      <PageShell
        id="2x2-photo"
        eyebrow="Photo size"
        title="2×2 inch photo: size, pixels and documents"
        crumbs={[{ href: "/documents/", label: "Documents" }, { label: "2×2 inch photo" }]}
        lede={`A 2×2 inch photo is 50.8 × 50.8 mm, or ${mmToPx(50.8)} × ${mmToPx(50.8)} pixels at 300 DPI. In our dataset ${docs.length} documents ask for a print this size${docs.length ? `, including ${names(docs, 3)}` : ""}.`}
      >
        <Section title="The same size in every unit" id="units">
          <SpecTable
            caption="2×2 inch photo"
            rows={[
              ["Inches", "2 × 2 in"],
              ["Millimetres", "50.8 × 50.8 mm (often rounded to 51 × 51)"],
              ["Pixels at 300 DPI", `${mmToPx(50.8)} × ${mmToPx(50.8)} px`],
              ["Pixels at 600 DPI", `${mmToPx(50.8, 600)} × ${mmToPx(50.8, 600)} px`],
              ...(sheetCount(50.8, 50.8, "4x6")
                ? ([["On a 4×6 in sheet", `${sheetCount(50.8, 50.8, "4x6")} photos`]] as [string, ReactNode][])
                : []),
            ]}
          />
        </Section>
        <Section title="Documents that use a 2×2 inch print" id="documents">
          <DocTable
            caption="2×2 inch documents"
            docs={docs}
            cols={["head", "eye", "home"]}
          />
          <p>
            Head and eye positions differ by document even when the paper size is the same, so
            take them from the page for the document you are applying for.
          </p>
        </Section>
        <Section title="Common mistakes" id="mistakes">
          <ul className="pg-rules">
            <li>Stretching a rectangular photo into a square. Crop instead, so the face keeps its proportions.</li>
            <li>Treating 2×2 as a pixel size. It is a physical size, so the print has to come out at 2 inches, not merely 600 pixels.</li>
            <li>Printing with “fit to page” switched on. The print comes out a little too big or too small; measure it with a ruler.</li>
            <li>Cropping too loosely. The head has to fill a set part of the height, so a small face on a large square is out of range.</li>
          </ul>
        </Section>
        <StudioCta doc={home[0]} />
        <Section title="Common questions" id="faq">
          <FaqList items={faq} />
        </Section>
        <p className="fine-print">Figures checked {lead ? checkedDate(lead) : "28 Sep 2026"}.</p>
      </PageShell>
    ),
  };
}

// ---------------------------------------------------------------- 35x45
function thirtyFiveByFortyFive(): PageDef {
  const docs = DOCUMENTS.filter((d) => nearPrint(d, 35, 45));
  const home = homeDocs(docs);
  const countries = new Set(docs.map((d) => d.country)).size;
  const faq: Faq[] = [
    {
      q: "How many pixels is a 35×45 mm photo?",
      a: `${mmToPx(35)} × ${mmToPx(45)} pixels at 300 DPI, and ${mmToPx(35, 600)} × ${mmToPx(45, 600)} at 600 DPI.`,
    },
    {
      q: "Is 35×45 mm the same as 2×2 inches?",
      a: "No. A 35×45 mm photo is taller than it is wide (1.38 × 1.77 in), while 2×2 inches is square. Stretching one to fit the other distorts the face, so crop to the right shape instead.",
    },
    {
      q: "Do all 35×45 mm documents use the same head size?",
      a: "No. The paper size is shared but the head range is set per document, for example between 29 and 36 mm depending on the authority. The table on this page shows each one.",
    },
  ];
  return {
    path: "/35x45-photo/",
    title: "35×45 mm photo: size, pixels and documents — PortraitPass",
    description: fitDescription(
      [
        `35×45 mm photo: ${mmToPx(35)} × ${mmToPx(45)} px at 300 DPI.`,
        `${docs.length} documents in ${countries} countries use it, with each head range and background rule.`,
        "Free, in your browser.",
      ],
      [],
    ),
    crumb: "35×45 mm photo",
    faq,
    element: (
      <PageShell
        id="35x45-photo"
        eyebrow="Photo size"
        title="35×45 mm photo: size, pixels and documents"
        crumbs={[{ href: "/documents/", label: "Documents" }, { label: "35×45 mm photo" }]}
        lede={`35×45 mm is the most common passport photo size outside the United States: 1.38 × 1.77 in, or ${mmToPx(35)} × ${mmToPx(45)} pixels at 300 DPI. ${docs.length} documents in our dataset use it.`}
      >
        <Section title="The same size in every unit" id="units">
          <SpecTable
            caption="35×45 mm photo"
            rows={[
              ["Millimetres", "35 × 45 mm"],
              ["Inches", `${fmtIn(35)} × ${fmtIn(45)} in`],
              ["Pixels at 300 DPI", `${mmToPx(35)} × ${mmToPx(45)} px`],
              ["Pixels at 600 DPI", `${mmToPx(35, 600)} × ${mmToPx(45, 600)} px`],
              ...(sheetCount(35, 45, "4x6")
                ? ([["On a 4×6 in sheet", `${sheetCount(35, 45, "4x6")} photos`]] as [string, ReactNode][])
                : []),
            ]}
          />
        </Section>
        <Section title="Documents that use 35×45 mm" id="documents">
          <DocTable caption="35×45 mm documents" docs={docs} cols={["head", "bg", "home"]} />
          <p>
            The shape is shared but the rules are not. Head height, background color and whether
            a home photo is accepted at all vary by document, so open the page for yours.
          </p>
        </Section>
        <Section title="Common mistakes" id="mistakes">
          <ul className="pg-rules">
            <li>Stretching a 4:3 or square photo to 35×45. Crop to the 7:9 shape and keep the face proportions.</li>
            <li>Printing a 35×45 file at the wrong physical size. Print at actual size and measure the result.</li>
            <li>Using the head size from another country. The table above shows how the ranges differ.</li>
            <li>Sending a home print where the document needs a photographer or booth. Those documents are marked “Not at home”.</li>
          </ul>
        </Section>
        <StudioCta doc={home[0]} />
        <Section title="Common questions" id="faq">
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
function sixHundred(): PageDef {
  const exact = DOCUMENTS.filter(exact600);
  const range = DOCUMENTS.filter(accepts600);
  const all = [...exact, ...range];
  const faq: Faq[] = [
    {
      q: "Is a 600×600 pixel photo the same as 2×2 inches?",
      a: "Only at 300 DPI. Two inches at 300 pixels per inch is 600 pixels, which is why the sizes are often mentioned together. For an upload the pixel count is what counts; for a print the physical size is.",
    },
    {
      q: "Which documents ask for exactly 600×600 pixels?",
      a: exact.length
        ? `In our dataset: ${names(exact)}.`
        : "No document in our dataset asks for exactly this size at the moment.",
    },
    {
      q: "What file size goes with 600×600 pixels?",
      a: all.some((d) => d.digital && kbRange(d.digital))
        ? `It depends on the document: ${all
            .filter((d) => d.digital && kbRange(d.digital))
            .slice(0, 4)
            .map((d) => `${d.name} is ${kbRange(d.digital!)}`)
            .join("; ")}. The table on this page lists each one.`
        : "The sources for these documents do not state a file size limit.",
    },
  ];
  return {
    path: "/600x600-photo/",
    title: "600×600 pixel photo: uploads and size limits — PortraitPass",
    description: fitDescription(
      [
        `600×600 pixel photo: ${exact.length} documents ask for exactly this size, ${range.length} accept it within a range.`,
        "File size limits, head position and a free browser tool.",
      ],
      ["Nothing is uploaded."],
    ),
    crumb: "600×600 pixel photo",
    faq,
    element: (
      <PageShell
        id="600x600-photo"
        eyebrow="Photo size"
        title="600×600 pixel photo: uploads and size limits"
        crumbs={[{ href: "/documents/", label: "Documents" }, { label: "600×600 pixel photo" }]}
        lede={`A 600×600 pixel square is the upload size for the US Diversity Visa lottery and fits inside several other limits. ${exact.length} documents in our dataset ask for exactly 600×600 and ${range.length} accept it within a range.`}
      >
        <Section title="What 600×600 means" id="meaning">
          <p>
            It is a pixel size, not a print size. At 300 pixels per inch it is 2×2 inches, but an
            upload form only checks the pixels and the file size. The photo should be a square
            crop with the head inside the range the document sets.
          </p>
          {exact[0]?.digital && (exact[0].digital.headRatioMin ?? 0) > 0 && (
            <p>
              For {exact[0].name}, the head is {Math.round((exact[0].digital.headRatioMin ?? 0) * 600)} to{" "}
              {Math.round((exact[0].digital.headRatioMax ?? 0) * 600)} pixels tall in a 600 pixel frame, and
              the eye line {Math.round((exact[0].digital.eyeRatioMin ?? 0) * 600)} to{" "}
              {Math.round((exact[0].digital.eyeRatioMax ?? 0) * 600)} pixels up from the bottom.
            </p>
          )}
        </Section>
        {exact.length > 0 && (
          <Section title="Documents that ask for exactly 600×600" id="exact">
            <DocTable caption="Exactly 600×600 px" docs={exact} cols={["digital", "kb", "home"]} />
          </Section>
        )}
        {range.length > 0 && (
          <Section title="Documents that accept 600×600 within a range" id="range">
            <DocTable caption="Range includes 600×600 px" docs={range} cols={["digital", "kb", "home"]} />
            <p>
              For these the exact size is your choice inside the range. A square crop of at least
              600 pixels is a safe pick where the range allows it.
            </p>
          </Section>
        )}
        <StudioCta doc={exact.find((d) => d.diy !== "no") ?? range[0]} />
        <Section title="Common questions" id="faq">
          <FaqList items={faq} />
        </Section>
      </PageShell>
    ),
  };
}

// ----------------------------------------------------------- under 50 KB
function under50(): PageDef {
  const limited = DOCUMENTS.filter((d) => d.digital && (d.digital.maxKB !== undefined || d.digital.minKB !== undefined));
  const withMax = limited
    .filter((d) => d.digital!.maxKB !== undefined)
    .sort((a, b) => a.digital!.maxKB! - b.digital!.maxKB!);
  const smallest = withMax[0];
  const atOrUnder50 = withMax.filter((d) => d.digital!.maxKB! <= 50);
  const thousand = limited.filter((d) => d.digital!.kbBytes === 1000);
  const faq: Faq[] = [
    {
      q: "Which documents have a KB limit?",
      a: `In our dataset ${limited.length} documents set a file size limit, from ${smallest ? `${smallest.digital!.maxKB} KB (${smallest.name})` : "none"} upward. The table on this page lists each one.`,
    },
    {
      q: "Is 1 KB 1,000 or 1,024 bytes?",
      a: thousand.length
        ? `It depends on the source. ${names(thousand)} count 1,000 bytes; the others count 1,024 or do not say. Near a limit, use the smaller reading.`
        : "Sources mostly count 1,024 bytes. Near a limit, leave a few percent of room.",
    },
    {
      q: "How do I make a photo smaller without ruining it?",
      a: "Reduce the pixel dimensions to what the form asks for first, then lower the JPEG quality a little at a time. A plain, evenly lit background also compresses better than a busy one.",
    },
  ];
  return {
    path: "/photo-under-50kb/",
    title: "Photo under 50 KB: documents with a limit — PortraitPass",
    description: fitDescription(
      [
        `Photo under 50 KB? ${limited.length} documents set a file size limit; the smallest maximum we found is ${smallest ? smallest.digital!.maxKB : "n/a"} KB.`,
        "How KB is counted and how to reduce file size.",
      ],
      ["Free, in your browser."],
    ),
    crumb: "Photo under 50 KB",
    faq,
    element: (
      <PageShell
        id="photo-under-50kb"
        eyebrow="File size"
        title="Photo under 50 KB: which documents set a limit"
        crumbs={[{ href: "/documents/", label: "Documents" }, { label: "Photo under 50 KB" }]}
        lede={
          atOrUnder50.length
            ? `${atOrUnder50.length} documents in our dataset cap the photo at 50 KB or less: ${names(atOrUnder50)}.`
            : `No document in our dataset caps the photo at 50 KB or less. The smallest maximum we found is ${smallest ? `${smallest.digital!.maxKB} KB (${smallest.name})` : "not stated"}. If your form asks for 50 KB, its own limit applies; this page shows what the documents we have read actually require.`
        }
      >
        <Section title="Documents with a file size limit" id="limits">
          <DocTable
            caption="Sorted by the largest file allowed"
            docs={[...withMax, ...limited.filter((d) => d.digital!.maxKB === undefined)]}
            cols={["kb", "digital", "home"]}
          />
        </Section>
        <Section title="How KB is counted" id="counting">
          <p>
            A kilobyte is 1,000 bytes to some sources and 1,024 to others, and a few do not say.
            {thousand.length > 0 && ` ${names(thousand)} count 1,000 bytes.`} When a file is
            close to a maximum, aim a few percent under it rather than exactly on it.
          </p>
        </Section>
        <Section title="Getting a photo under a limit" id="how">
          <ol className="pg-steps">
            <li>Crop to the shape the document asks for first, with the head in the right range.</li>
            <li>Set the pixel size to what the form asks for. A 4000×3000 phone photo is about 12 million pixels; a 600×600 upload is 0.36 million.</li>
            <li>Save as JPEG and lower the quality a step at a time until the file is under the limit.</li>
            <li>Check the result at full size. If the face looks blocky, choose a larger size limit or a smaller pixel size, not both.</li>
          </ol>
          <p>
            Choose a document in the studio and the digital export does these steps to that
            document’s limits and shows the final size before you download.
          </p>
        </Section>
        <StudioCta doc={withMax.find((d) => d.diy !== "no")} label="Open the studio" />
        <Section title="Common questions" id="faq">
          <FaqList items={faq} />
        </Section>
      </PageShell>
    ),
  };
}

// ---------------------------------------------------------- print sheet
function printSheet(): PageDef {
  const rows = sheetRows();
  const us = DOCUMENTS.find((d) => d.id === "us-passport");
  const first = rows[0];
  const faq: Faq[] = [
    {
      q: "How many passport photos fit on a 4×6 print?",
      a: rows.length
        ? `${rows.map((r) => `${r.counts["4x6"]} at ${printSizeShort(r.doc.print!)}`).slice(0, 3).join(", ")}. The table on this page has every size we know.`
        : "It depends on the photo size.",
    },
    {
      q: "Why are there lines between the photos?",
      a: "On a 4×6 sheet the photos tile edge to edge with thin guides on the shared edges, so you cut along them. On A4 and Letter each photo has corner cut marks and a margin for home printers.",
    },
    {
      q: "What print setting keeps the size exact?",
      a: "Actual size or 100 percent, with fit to page and borderless scaling off. Measure one photo with a ruler afterwards.",
    },
  ];
  return {
    path: "/passport-photo-print-sheet/",
    title: "Passport photo print sheet: 4×6, A4 or Letter — PortraitPass",
    description: fitDescription(
      [
        "Passport photo sheet: how many photos fit on 4×6, A4 and Letter paper, with cut marks.",
        "Print at actual size. Free, in your browser.",
      ],
      ["Nothing is uploaded."],
    ),
    crumb: "Print sheet",
    faq,
    element: (
      <PageShell
        id="passport-photo-print-sheet"
        eyebrow="Print sheet"
        title="Passport photos on a 4×6 print sheet"
        crumbs={[{ href: "/print-passport-photos/", label: "Printing" }, { label: "Print sheet" }]}
        lede={`A 4×6 inch sheet holds ${first?.counts["4x6"] ?? 6} photos of ${first ? printSizeShort(first.doc.print!) : "the usual size"}. The studio lays them out at exact physical size, in a PDF or JPG you can send to a photo counter or print yourself.`}
      >
        <Section title="Photos per sheet" id="counts">
          <div className="pg-table-wrap">
            <table className="pg-table pg-list">
              <caption>Photos on one sheet, at 300 DPI</caption>
              <thead>
                <tr>
                  <th scope="col">Photo size</th>
                  <th scope="col">4×6 in</th>
                  <th scope="col">A4</th>
                  <th scope="col">US Letter</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.size}>
                    <th scope="row">{r.size}</th>
                    <td>{r.counts["4x6"]}</td>
                    <td>{r.counts["a4"]}</td>
                    <td>{r.counts["letter"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            The counts come from the same layout the studio uses, with print margins on A4 and
            Letter. The paper is turned to whichever direction holds more photos.
          </p>
        </Section>
        <Section title="Printing it right" id="printing">
          <ol className="pg-steps">
            <li>Export the sheet from the studio as PDF or JPG.</li>
            <li>Print at actual size or 100 percent. Turn off “fit to page” and any borderless scaling.</li>
            <li>Measure one photo with a ruler against the size on the document’s page.</li>
            <li>Cut along the guides. On 4×6 they sit on the shared edges; on A4 and Letter they are corner marks.</li>
          </ol>
          <p>
            For photo counter prices, paper and the documents with special print rules, see the{" "}
            <a href="/print-passport-photos/">printing guide</a>.
          </p>
        </Section>
        <StudioCta doc={us} label="Open the studio and make a sheet" />
        <Section title="Common questions" id="faq">
          <FaqList items={faq} />
        </Section>
      </PageShell>
    ),
  };
}

// ---------------------------------------------------------- print guide
function printGuide(): PageDef {
  const withPaper = DOCUMENTS.filter((d) => d.print?.paper);
  const au = DOCUMENTS.find((d) => d.id === "au-passport");
  const uk = DOCUMENTS.find((d) => d.id === "uk-passport");
  const usSix = sheetCount(50.8, 50.8, "4x6") ?? 6;
  const faq: Faq[] = [
    {
      q: "How much does it cost to print passport photos?",
      a: "A 4×6 print at a US drugstore or big-box photo counter is typically around 40 cents, and one sheet holds several photos. Prices vary by store, so check before you order.",
    },
    {
      q: "Can I print passport photos at home?",
      a: "Sometimes. Some documents accept a home print on photo paper and some require a lab or professional print. Australia asks for a dye-sublimation print of at least 200 gsm, so a home inkjet print does not qualify.",
    },
    {
      q: "What should I choose when the photo counter asks about cropping?",
      a: "Choose no borders or do not crop if offered, and print at actual size. A shop that auto-crops or scales the sheet changes the photo size.",
    },
  ];
  return {
    path: "/print-passport-photos/",
    title: "Print passport photos: 4×6, home or lab — PortraitPass",
    description: fitDescription(
      [
        "Print passport photos for about 40¢: a 4×6 sheet at a photo counter, at home, or at a lab.",
        "Actual-size settings and per-document print rules.",
      ],
      ["Free, in your browser."],
    ),
    crumb: "Printing",
    faq,
    element: (
      <PageShell
        id="print-passport-photos"
        eyebrow="Printing"
        title="Print passport photos for about 40¢"
        crumbs={[{ label: "Printing" }]}
        lede={`Export a 4×6 sheet with ${usSix} photos and order it as an ordinary 4×6 print at a photo counter. A US drugstore or big-box counter typically charges around 40 cents for one; prices vary, so check before you order.`}
      >
        <Section title="At a photo counter" id="counter">
          <ol className="pg-steps">
            <li>Export the 4×6 sheet from the studio as a JPG.</li>
            <li>Upload it for pickup at CVS, Walgreens, Walmart Photo or a similar counter and choose a 4×6 print.</li>
            <li>Choose “no borders” or “do not crop” if offered. The print must be at actual size.</li>
            <li>Measure one photo with a ruler before you leave, then cut along the guides.</li>
          </ol>
          <p>
            The counter sees only the sheet you upload. PortraitPass never receives it.
          </p>
        </Section>
        <Section title="At home" id="home">
          <p>
            Use photo paper, print at actual size or 100 percent, and turn off “fit to page”.
            A4 and Letter sheets have corner
            cut marks and a margin for home printers. See the{" "}
            <a href="/passport-photo-print-sheet/">print sheet page</a> for how many photos fit.
          </p>
        </Section>
        <Section title="Documents with special print rules" id="rules">
          {au && (
            <>
              <h3>Australia</h3>
              <p>
                {au.diyNote} The paper the source names: {au.print?.paper}. Take the sheet to a photo
                lab that offers this, rather than a home or drugstore inkjet print.
              </p>
            </>
          )}
          {uk && (
            <>
              <h3>United Kingdom</h3>
              <p>
                {uk.diyNote} Applying online instead? Use the{" "}
                <a href="/uk-passport-online-photo/">online upload page</a>: it takes the original,
                uncropped photo, so nothing is printed.
              </p>
            </>
          )}
          {withPaper.length > 0 && (
            <div className="pg-table-wrap">
              <table className="pg-table pg-list">
                <caption>Paper named in the sources</caption>
                <thead>
                  <tr>
                    <th scope="col">Document</th>
                    <th scope="col">Size</th>
                    <th scope="col">Paper</th>
                  </tr>
                </thead>
                <tbody>
                  {withPaper.map((d) => (
                    <tr key={d.id}>
                      <th scope="row">
                        <a href={docPath(d)}>{d.name}</a>
                      </th>
                      <td>{printSize(d.print!).split(" (")[0]}</td>
                      <td>{d.print!.paper}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            Some documents cannot be printed at home at all: Canada asks for a commercial
            photographer and Germany takes the photo digitally at the authority or a certified
            provider. Their pages explain the route.
          </p>
        </Section>
        <Section title="Common questions" id="faq">
          <FaqList items={faq} />
        </Section>
        <p className="pg-note">
          We check sizes and positions; the issuing authority decides acceptance. Prices are typical
          and change; we do not have a partnership with any retailer named here.
        </p>
      </PageShell>
    ),
  };
}

export function sizePages(): PageDef[] {
  return [twoByTwo(), thirtyFiveByFortyFive(), sixHundred(), under50(), printSheet(), printGuide()];
}
export { fmtMm };
