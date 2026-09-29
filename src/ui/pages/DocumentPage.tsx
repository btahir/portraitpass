import { ArrowRight } from "lucide-react";
import type { DocumentSpec } from "../../core/documents";
import { DOCUMENTS } from "../../core/documents";
import {
  Disclaimer,
  DocLinks,
  FaqList,
  PageShell,
  Section,
  Sources,
  SpecTable,
} from "./parts";
import {
  CHECK_NOTE,
  RULES_NOTE,
  backgroundRelevant,
  backgroundSentence,
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
  photoName,
  printSize,
  related,
  sameSize,
  siblings,
  studioPath,
} from "./content";

const KIND_LABEL: Record<DocumentSpec["kind"], string> = {
  passport: "Passport",
  visa: "Visa",
  "id-card": "ID card",
  residence: "Residence or immigration",
  citizenship: "Citizenship",
  lottery: "Lottery entry",
  "exam-form": "Exam application",
  other: "Application",
};

function printRows(doc: DocumentSpec): [string, string][] {
  const p = doc.print;
  if (!p) return [];
  const rows: [string, string][] = [["Photo size", printSize(p)]];
  const h = headRange(p);
  const e = eyeRange(p);
  if (h) rows.push(["Head, crown to chin", h]);
  if (e) rows.push(["Eye line, up from the bottom", e]);
  if (p.copies) rows.push(["Photos required", String(p.copies)]);
  if (p.paper) rows.push(["Paper", p.paper]);
  return rows;
}
function digitalRows(doc: DocumentSpec): [string, string][] {
  const d = doc.digital;
  if (!d) return [];
  const rows: [string, string][] = [];
  if (d.originalOnly) rows.push(["Upload", "The original camera file, unedited and uncropped"]);
  const dims = digitalDims(d);
  if (dims) rows.push([d.originalOnly ? "Minimum size" : "Image size", dims]);
  const kb = kbRange(d);
  if (kb) rows.push(["File size", `${kb}. ${kbDefinition(d)}`]);
  rows.push(["Formats", listWords(formatNames(d))]);
  const hr = headRatio(d);
  const er = eyeRatio(d);
  if (hr) rows.push(["Head, crown to chin", hr]);
  if (er) rows.push(["Eye line, up from the bottom", er]);
  return rows;
}

function HomeSection({ doc }: { doc: DocumentSpec }) {
  const others = DOCUMENTS.filter(
    (d) => d.diy !== "no" && d.country === doc.country && d.id !== doc.id,
  ).slice(0, 4);
  if (doc.diy === "no") {
    return (
      <Section title="Can you make it at home?" id="home">
        <p>
          <strong>No.</strong> {doc.diyNote ?? "The photo has to be made by the issuing authority or a provider it names."}
        </p>
        <h3>Where to go instead</h3>
        <p>
          Follow the route in the note above and confirm it on the source pages
          below before you pay anyone: how photos are captured for this document
          changes from time to time. PortraitPass does not offer a studio for
          it, because a photo you print or send yourself would be turned away.
          {doc.print &&
            " The size and position figures in the table are listed so you can check the result the photographer or booth gives you, not so you can reproduce it at home."}
        </p>
        {others.length > 0 && (
          <>
            <h3>Documents from {doc.country} you can prepare yourself</h3>
            <DocLinks docs={others} />
          </>
        )}
        <p>
          <a href="/documents/">Browse all documents</a>
        </p>
      </Section>
    );
  }
  const lead =
    doc.diy === "digital-only" && !doc.diyNote
      ? "Yes, and nothing is printed."
      : "Yes.";
  return (
    <Section title="Can you make it at home?" id="home">
      <p>
        <strong>{lead}</strong>{" "}
        {doc.diyNote ?? "The source accepts a photo you prepare yourself."}
      </p>
      <p>
        {doc.diy === "digital-only"
          ? "PortraitPass frames the photo against the head and eye lines above, then exports a file at the exact pixel size and under the size limit."
          : "PortraitPass frames the photo against the head and eye lines above and exports a single photo or a print sheet, with the measurements shown so you can check them yourself."}{" "}
        Your photo stays in your browser.
      </p>
      <div className="pg-cta">
        <a className="primary" href={studioPath(doc)}>
          Open the studio for this document <ArrowRight size={15} />
        </a>
        <Disclaimer />
      </div>
    </Section>
  );
}

export function DocumentPage({ doc }: { doc: DocumentSpec }) {
  const pr = printRows(doc);
  const dr = digitalRows(doc);
  const faq = documentFaq(doc);
  const sib = siblings(doc);
  const rel = related(doc).filter((d) => !sib.includes(d));
  const same = sameSize(doc);
  return (
    <PageShell
      id={doc.id}
      eyebrow={`${doc.country} · ${KIND_LABEL[doc.kind]}`}
      title={`${photoName(doc)}: size and rules`}
      crumbs={[
        { href: "/documents/", label: "Documents" },
        { label: doc.name },
      ]}
      lede={introSentence(doc)}
    >
      {(pr.length > 0 || dr.length > 0) && (
        <Section title="Photo specification" id="spec">
          {pr.length > 0 && (
            <SpecTable caption="Printed photo" rows={pr} />
          )}
          {dr.length > 0 && (
            <SpecTable caption="Digital upload" rows={dr} />
          )}
          <p className="pg-note">
            {CHECK_NOTE} Last checked {checkedDate(doc)}. {RULES_NOTE}
          </p>
        </Section>
      )}

      {backgroundRelevant(doc) && (
        <Section title="Background and editing" id="background">
          <p>
            {backgroundSentence(doc)} {editingSentence(doc)}
          </p>
        </Section>
      )}

      <Section title="Rules from the source" id="rules">
        <ul className="pg-rules">
          {doc.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {doc.diy !== "no" && (
          <p>
            Expression, lighting and how recent the photo is cannot be measured from a
            picture, so check them yourself.
          </p>
        )}
      </Section>

      <HomeSection doc={doc} />

      <Section title="Sources" id="sources">
        <Sources doc={doc} />
        <p>{RULES_NOTE}</p>
      </Section>

      <Section title="Common questions" id="faq">
        <FaqList items={faq} />
      </Section>

      {(sib.length > 0 || rel.length > 0 || same.length > 0) && (
        <Section title="Related documents" id="related">
          {sib.length > 0 && (
            <>
              <h3>Same document, other route</h3>
              <DocLinks docs={sib} />
            </>
          )}
          {rel.length > 0 && (
            <>
              <h3>More from {doc.country}</h3>
              <DocLinks docs={rel} />
            </>
          )}
          {same.length > 0 && (
            <>
              <h3>Other documents with a {printSize(doc.print!).split(" (")[0]} print</h3>
              <DocLinks docs={same} />
            </>
          )}
        </Section>
      )}
    </PageShell>
  );
}
