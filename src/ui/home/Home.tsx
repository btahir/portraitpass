import { useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, Upload } from "lucide-react";
import {
  DOCUMENTS,
  getDocumentById,
  popularDocuments,
} from "../../core/index";
import { DocumentPicker } from "./DocumentPicker";
import { NotDiyExplainer } from "./NotDiyExplainer";
import {
  docPagePath,
  firstSentence,
  keySize,
  notDiy,
} from "./docInfo";
import { formatChecked } from "../format";
import "./home.css";

// The shell (App.tsx) renders SiteHeader / SiteFooter around every route, so
// Home renders neither.

/** No HEIC here on purpose: iOS converts HEIC to JPEG when it isn't listed. */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export interface HomeProps {
  onUpload(file: File, docId?: string): void;
  onCamera(docId?: string): void;
  onSample(docId?: string): void;
  onOpenProject(file: File): void;
}

const SHEET_PHOTOS = [0, 1, 2, 3, 4, 5];

function isProjectFile(file: File) {
  return /\.json$/i.test(file.name) || file.type === "application/json";
}

const hasFiles = (e: DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes("Files");

const NO_HOME_FIRST = [
  "ca-passport",
  "de-passport",
  "in-passport",
  "fr-passport",
  "ca-pr",
  "us-naturalization",
];

export function Home({ onUpload, onCamera, onSample, onOpenProject }: HomeProps) {
  const [docId, setDocId] = useState<string | undefined>();
  const [dragging, setDragging] = useState(false);
  const [canCamera, setCanCamera] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const doc = docId ? getDocumentById(docId) : undefined;
  const blocked = !!doc && notDiy(doc);
  // A not-DIY document never travels with a photo: the studio can't frame it.
  const passDocId = blocked ? undefined : docId;
  const latest = useRef({ onUpload, passDocId });
  latest.current = { onUpload, passDocId };

  useEffect(() => {
    setCanCamera(!!navigator.mediaDevices?.getUserMedia);
  }, []);

  // Paste an image from the clipboard anywhere on the page. Captured first so
  // the shell's own paste handler doesn't import it a second time.
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (!file) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      latest.current.onUpload(file, latest.current.passDocId);
    };
    window.addEventListener("paste", paste, true);
    return () => window.removeEventListener("paste", paste, true);
  }, []);

  const popular = popularDocuments();
  const noHome = DOCUMENTS.filter(notDiy);
  // The most searched first; the rest are one link away on the documents index.
  const noHomeShown = NO_HOME_FIRST.map((id) => noHome.find((d) => d.id === id))
    .filter((d): d is (typeof noHome)[number] => !!d)
    .concat(noHome.filter((d) => !NO_HOME_FIRST.includes(d.id)))
    .slice(0, 6);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (isProjectFile(file)) onOpenProject(file);
    else onUpload(file, passDocId);
  };

  return (
    <div
      className={`hm${dragging ? " is-dragging" : ""}`}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current = 0;
        setDragging(false);
        pickFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={fileRef}
        type="file"
        className="hm-hidden"
        aria-label="Upload a photo file"
        accept={PHOTO_ACCEPT}
        tabIndex={-1}
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={projectRef}
        type="file"
        className="hm-hidden"
        aria-label="Open a saved project file"
        accept=".json,application/json"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onOpenProject(file);
          e.target.value = "";
        }}
      />

      <section className="hm-hero" aria-labelledby="hm-h1">
        <div className="hm-hero-copy">
          <h1 id="hm-h1">
            Passport photos, <em>measured to the millimetre.</em>
          </h1>
          <p className="hm-lede">
            Pick your document, take or upload a photo, and print six on a 4×6
            for about 40¢. Free, and your photo never leaves your device.
          </p>

          <div className="hm-picker">
            <p className="hm-picker-label">Which document is it for?</p>
            <DocumentPicker value={docId} onChange={setDocId} />
            {doc && !blocked && (
              <p className="hm-picked">
                <strong>{doc.name}</strong> · {keySize(doc)} · checked{" "}
                {formatChecked(doc.sources[0]?.checkedAt ?? "")}.{" "}
                <a href={docPagePath(doc)}>Rules and sources</a>
              </p>
            )}
            {blocked && doc ? (
              <NotDiyExplainer
                doc={doc}
                compact
                headingLevel={3}
                onPickAnother={() => setDocId(undefined)}
              />
            ) : (
              <>
                <div className="hm-actions">
                  {canCamera && (
                    <button
                      type="button"
                      className="hm-btn hm-btn--primary"
                      onClick={() => onCamera(passDocId)}
                    >
                      <Camera size={18} aria-hidden="true" />
                      Take photo
                    </button>
                  )}
                  <button
                    type="button"
                    className={`hm-btn${canCamera ? "" : " hm-btn--primary"}`}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={18} aria-hidden="true" />
                    Upload a photo
                  </button>
                </div>
                <p className="hm-fine">
                  JPG, PNG or WebP. You can also drop a photo here or paste one.
                </p>
                <p className="hm-extra">
                  <button type="button" onClick={() => onSample(passDocId)}>
                    Try a sample
                  </button>
                  <span aria-hidden="true">·</span>
                  <button type="button" onClick={() => projectRef.current?.click()}>
                    Open a project
                  </button>
                </p>
              </>
            )}
          </div>
        </div>

        <figure className="hm-proof">
          <div className="hm-proof-stage">
            <div
              className="hm-sheet"
              role="img"
              aria-label="A 4 by 6 inch print sheet holding six 2 by 2 inch photos of a synthetic portrait"
            >
              {SHEET_PHOTOS.map((n) => (
                <span key={n} className="hm-sheet-photo" />
              ))}
            </div>
            <dl className="hm-price">
              <div className="hm-price-main">
                <dt>One 4×6 print at a pharmacy</dt>
                <dd>≈ $0.40</dd>
              </div>
              <div className="hm-price-row">
                <dt>Typical studio</dt>
                <dd>
                  <s>$15–17</s>
                </dd>
              </div>
            </dl>
          </div>
          <figcaption>
            <span>Synthetic demo portrait</span>
            <span>101.6 × 152.4 mm sheet, six 50.8 mm squares</span>
          </figcaption>
        </figure>
      </section>

      <section className="hm-section" aria-labelledby="hm-how">
        <h2 id="hm-how">How it works</h2>
        <ol className="hm-steps">
          <li>
            <h3>Pick the document</h3>
            <p>
              Search {DOCUMENTS.length} passports, visas and ID photos. Each one
              carries its published size and a link to its source.
            </p>
          </li>
          <li>
            <h3>Add a photo</h3>
            <p>
              Take one or upload one. Face detection runs in your browser and
              frames the photo to the size, and you can nudge it.
            </p>
          </li>
          <li>
            <h3>Check and print</h3>
            <p>
              Every measurement is shown next to its allowed range. Download the
              sheet and print it at a pharmacy.
            </p>
          </li>
        </ol>
      </section>

      <section className="hm-section" aria-labelledby="hm-check">
        <h2 id="hm-check">What we check, and what you check</h2>
        <div>
          <div className="hm-cols">
            <div>
              <h3>We measure</h3>
              <ul className="hm-list">
                <li>Head height, crown to chin, against the allowed range</li>
                <li>Eye line height and centring</li>
                <li>Size and resolution, without upscaling</li>
                <li>Background evenness, shadows, lighting and sharpness</li>
              </ul>
            </div>
            <div>
              <h3>You look at</h3>
              <ul className="hm-list">
                <li>Expression, glasses and head coverings</li>
                <li>How recent the photo has to be</li>
                <li>The rules on the source page, which we link and date</li>
              </ul>
            </div>
          </div>
          <p className="hm-note">
            We check sizes and positions. The issuing authority decides
            acceptance.
          </p>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-print">
        <h2 id="hm-print">Printing for about 40¢</h2>
        <div className="hm-print">
          <ol className="hm-list hm-list--num">
            <li>Download the print sheet, a 4×6 JPG with six photos.</li>
            <li>
              Upload it to the photo service at CVS, Walgreens or Walmart and
              order one 4×6 print.
            </li>
            <li>
              Choose “no borders” or “don’t crop” if offered, and print at actual
              size.
            </li>
            <li>Cut the six photos apart along their edges.</li>
          </ol>
          <p>
            Prices vary by store. Australia asks for a lab dye-sublimation
            print, and UK paper forms want a professional print.{" "}
            <a href="/print-passport-photos/">Read the printing guide</a>
          </p>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-docs">
        <h2 id="hm-docs">Popular documents</h2>
        <div>
          <ul className="hm-docs">
            {popular.map((d) => (
              <li key={d.id}>
                <a href={docPagePath(d)}>{d.name}</a>
                <span>{keySize(d)}</span>
              </li>
            ))}
          </ul>
          <p className="hm-more">
            <a href="/documents/">All {DOCUMENTS.length} documents, by country</a>
          </p>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-nodiy">
        <h2 id="hm-nodiy">Can’t be made at home</h2>
        <div>
          <p className="hm-intro">
            For these, the authority takes the photo or accepts only certain
            providers. Each page explains what to do instead.
          </p>
          <ul className="hm-docs hm-docs--why">
            {noHomeShown.map((d) => (
              <li key={d.id}>
                <a href={docPagePath(d)}>{d.name}</a>
                <span>{firstSentence(d.diyNote ?? "")}</span>
              </li>
            ))}
          </ul>
          {noHome.length > noHomeShown.length && (
            <p className="hm-more">
              <a href="/documents/">See all {noHome.length}</a>
            </p>
          )}
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-privacy">
        <h2 id="hm-privacy">Your photo stays on your device</h2>
        <div className="hm-privacy">
          <p>
            Framing, face detection and export all run in your browser. Nothing
            is uploaded, and there are no accounts, cookies or analytics. Face
            detection runs only in your browser; we never receive your photo or
            face data.
          </p>
          <p>
            <a href="/privacy/">What the host does log</a>
          </p>
        </div>
      </section>

      <p className="hm-drop-hint" aria-hidden="true">
        Drop your photo to use it{doc && !blocked ? ` for ${doc.name}` : ""}
      </p>
    </div>
  );
}
