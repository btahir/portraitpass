import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  PAPERS,
  documentDigitalTarget,
  layoutSheet,
  outputSize,
  type Crop,
  type DocumentSpec,
  type DigitalTarget,
  type Preset,
  type SheetLayout,
  type SheetOrientation,
  type SheetStyle,
} from "../../core/index";
import {
  MAX_CANVAS_AREA,
  downloadBlob,
  exportDigital,
  exportPhoto,
  renderPreview,
  type LoadedPhoto,
} from "../../browser/engine";
import { DOWNLOAD_NOTE } from "../../config";
import { PrintGuide } from "./PrintGuide";
import "./output.css";

export type OutputKind = "sheet" | "single" | "digital" | "original";

export interface OutputPanelProps {
  doc?: DocumentSpec;
  preset: Preset;
  photo: LoadedPhoto;
  crop: Crop;
  /** Replacement background colour (engine `background` option). Ignored for original mode. */
  background?: string;
  checksSummary: { failing: number; unknown: number };
  /** Called after a successful download so the studio can show the tips ask. */
  onExported(kind: OutputKind): void;
  /** Optional: open on this tab when it exists for the document. */
  initialTab?: OutputKind;
  /** Optional: heading level for the panel title (default 2). */
  headingLevel?: 2 | 3;
}

type SheetFormat = "jpeg" | "pdf";
type SingleFormat = "jpeg" | "png" | "pdf";

const TAB_LABEL: Record<OutputKind, string> = {
  sheet: "Print sheet",
  single: "Single photo",
  digital: "Digital upload",
  original: "Original",
};
const STYLE_LABEL: Record<SheetStyle, string> = {
  "edge-to-edge": "Edge-to-edge (photo lab)",
  "cut-marks": "With cut marks (home printer)",
};
const FORMAT_LABEL = { jpeg: "JPG", png: "PNG", pdf: "PDF" } as const;
const MIME_LABEL: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
  "image/webp": "WebP",
};

function tabsFor(
  doc: DocumentSpec | undefined,
  preset: Preset,
  target: DigitalTarget | undefined,
): OutputKind[] {
  if (preset.mode === "original") return ["original"];
  const tabs: OutputKind[] = [];
  if (!doc || doc.print) tabs.push("sheet", "single");
  if (target) tabs.push("digital");
  if (!tabs.length) tabs.push("single");
  return tabs;
}

function messageOf(e: unknown) {
  return e instanceof Error ? e.message : "The download failed. Try again.";
}
function codeOf(e: unknown) {
  return (e as { code?: unknown } | null)?.code;
}
const oneDecimal = (n: number) => Math.round(n * 10) / 10;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const defaultStyle = (paperId: string): SheetStyle =>
  paperId === "4x6" ? "edge-to-edge" : "cut-marks";

function formatBytes(bytes: number, unit: 1000 | 1024) {
  if (bytes >= unit * unit) return `${oneDecimal(bytes / unit / unit)} MB`;
  return `${Math.round(bytes / unit)} KB`;
}

function tryLayout(
  preset: Preset,
  paperId: string,
  dpi: number,
  style: SheetStyle,
  orientation: SheetOrientation,
): { layout?: SheetLayout; error?: string } {
  try {
    return { layout: layoutSheet(preset, paperId, dpi, { style, orientation }) };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

interface Failure {
  lead?: string;
  message: string;
}
function explain(e: unknown): Failure {
  const message = messageOf(e);
  switch (codeOf(e)) {
    case "LOW_RESOLUTION":
      return { lead: "Not enough pixels.", message };
    case "FILE_SIZE_UNREACHABLE":
      return { lead: "The size limit can’t be reached.", message };
    case "SHEET_TOO_LARGE":
      return { lead: "Sheet too large for one image.", message };
    default:
      return { message };
  }
}

interface Done {
  kind: OutputKind;
  filename: string;
  /** Digital only. */
  digital?: {
    width: number;
    height: number;
    bytes: number;
    kb: string;
    quality: number;
    padded: boolean;
  };
  /** Sheet only: what the guide should describe. */
  paperId?: string;
  style?: SheetStyle;
  count?: number;
}

export function OutputPanel({
  doc,
  preset,
  photo,
  crop,
  background,
  checksSummary,
  onExported,
  initialTab,
  headingLevel = 2,
}: OutputPanelProps) {
  const uid = useId();
  const target = doc ? documentDigitalTarget(doc) : undefined;
  const tabs = tabsFor(doc, preset, target);
  const [picked, setPicked] = useState<OutputKind | undefined>(initialTab);
  const tab: OutputKind =
    picked && tabs.includes(picked) ? picked : tabs[0];

  const [paperId, setPaperId] = useState("4x6");
  const [style, setStyle] = useState<SheetStyle>("edge-to-edge");
  const [orientation, setOrientation] = useState<SheetOrientation>("auto");
  const [sheetFormat, setSheetFormat] = useState<SheetFormat>("jpeg");
  const [sheetDpi, setSheetDpi] = useState(300);
  const [singleFormat, setSingleFormat] = useState<SingleFormat>("jpeg");
  const [singleDpi, setSingleDpi] = useState(300);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const operation = useRef(0);

  const isOriginal = preset.mode === "original";
  const activeBackground = isOriginal ? undefined : background;

  // Anything that changes the output makes a shown result stale. Primitive keys only: the studio may
  // hand over a new preset or crop object on every render.
  const signature = [
    photo.name,
    photo.width,
    photo.height,
    preset.id,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    activeBackground ?? "",
    tab,
    paperId,
    style,
    orientation,
    sheetFormat,
    sheetDpi,
    singleFormat,
    singleDpi,
  ].join("|");
  const firstSignature = useRef(signature);
  useEffect(() => {
    if (firstSignature.current === signature) return;
    firstSignature.current = signature;
    operation.current++;
    setDone(null);
    setFailure(null);
    setBusy(false);
  }, [signature]);

  const sheet = tab === "sheet" ? tryLayout(preset, paperId, sheetDpi, style, orientation) : {};
  const sheetTooLarge =
    !!sheet.layout &&
    sheetFormat !== "pdf" &&
    sheet.layout.width * sheet.layout.height > MAX_CANVAS_AREA;
  const paper = PAPERS.find((p) => p.id === paperId) ?? PAPERS[0];

  const run = async (kind: OutputKind) => {
    if (busy) return;
    const mine = ++operation.current;
    setBusy(true);
    setDone(null);
    setFailure(null);
    try {
      let result: Done;
      if (kind === "digital" && target) {
        const out = await exportDigital(photo, preset, crop, target, {
          background: activeBackground,
        });
        if (mine !== operation.current) return;
        downloadBlob(out.blob, out.filename);
        const kbUnit = target.kbBytes ?? 1024;
        result = {
          kind,
          filename: out.filename,
          digital: {
            width: out.width,
            height: out.height,
            bytes: out.bytes,
            kb: `${Math.round(out.bytes / kbUnit)}`,
            quality: Math.round(out.quality * 100),
            padded: out.padded,
          },
        };
      } else {
        const isSheet = kind === "sheet";
        const out = await exportPhoto(photo, preset, crop, {
          format: isOriginal ? "jpeg" : isSheet ? sheetFormat : singleFormat,
          dpi: isSheet ? sheetDpi : singleDpi,
          sheet: isSheet,
          paperId: isSheet ? paperId : undefined,
          sheetStyle: isSheet ? style : undefined,
          sheetOrientation: isSheet ? orientation : undefined,
          background: activeBackground,
        });
        if (mine !== operation.current) return;
        downloadBlob(out.blob, out.filename);
        result = {
          kind,
          filename: out.filename,
          ...(isSheet
            ? {
                paperId,
                style,
                count: sheet.layout?.placements.length,
              }
            : {}),
        };
      }
      setDone(result);
      onExported(kind);
    } catch (e) {
      if (mine === operation.current) setFailure(explain(e));
    } finally {
      if (mine === operation.current) setBusy(false);
    }
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.indexOf(tab);
    let next = -1;
    if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setPicked(tabs[next]);
    document.getElementById(`${uid}-tab-${tabs[next]}`)?.focus();
  };

  const Heading = `h${headingLevel}` as "h2" | "h3";
  const printNotes = !isOriginal
    ? (preset.notes ?? []).filter((note) => /print/i.test(note))
    : [];
  const copies = doc?.print?.copies;
  const stock = doc?.print?.paper;
  const backgroundWarning =
    !isOriginal && activeBackground && preset.backgroundEdit !== "allowed"
      ? preset.backgroundEdit === "forbidden"
        ? `Background replaced. ${preset.name} does not accept edited photos.`
        : `Background replaced. Check that the receiver accepts this for ${preset.name}.`
      : "";

  const disclaimer = (
    <p className="op-disclaimer">{DOWNLOAD_NOTE}</p>
  );
  const gentleNote =
    !isOriginal && (checksSummary.failing > 0 || checksSummary.unknown > 0) ? (
      <p className="op-gentle">
        {checksSummary.failing > 0 &&
          `${plural(checksSummary.failing, "measurement")} ${checksSummary.failing === 1 ? "is" : "are"} outside the published range. You can still download.`}
        {checksSummary.failing > 0 && checksSummary.unknown > 0 && " "}
        {checksSummary.unknown > 0 &&
          `${plural(checksSummary.unknown, "check")} could not be measured.`}
      </p>
    ) : null;
  const printLines: ReactNode = (
    <>
      {printNotes.map((note) => (
        <p key={note} className="op-note">
          {note}
        </p>
      ))}
      {(copies || (stock && !printNotes.length)) && (
        <p className="op-note">
          The rules ask for{" "}
          {copies ? `${copies} ${copies === 1 ? "copy" : "copies"}` : "prints"}
          {stock ? ` on ${stock}` : ""}.
        </p>
      )}
    </>
  );

  return (
    <section className="op" aria-label="Download">
      <Heading className="op-title">Download</Heading>
      <div className="op-tabs" role="tablist" aria-label="Download type">
        {tabs.map((id) => (
          <button
            key={id}
            id={`${uid}-tab-${id}`}
            type="button"
            role="tab"
            className="op-tab"
            aria-selected={tab === id}
            aria-controls={`${uid}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setPicked(id)}
            onKeyDown={onTabKey}
          >
            {TAB_LABEL[id]}
          </button>
        ))}
      </div>
      <div
        className="op-panel"
        role="tabpanel"
        id={`${uid}-panel`}
        aria-labelledby={`${uid}-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "sheet" && (
          <>
            <div className="op-summary">
              {sheet.layout && (
                <SheetThumb
                  photo={photo}
                  preset={preset}
                  crop={crop}
                  background={activeBackground}
                  paperId={paperId}
                  style={style}
                  orientation={orientation}
                  layout={sheet.layout}
                />
              )}
              <div>
                {sheet.layout ? (
                  <>
                    <p className="op-count">
                      {plural(sheet.layout.placements.length, "photo")} on one{" "}
                      {paper.name} sheet
                    </p>
                    <p className="op-sub">
                      {style === "edge-to-edge" ? "Edge-to-edge" : "Cut marks"},{" "}
                      {sheet.layout.orientation} · {sheet.layout.width} ×{" "}
                      {sheet.layout.height} px at {sheetDpi} DPI
                    </p>
                  </>
                ) : (
                  <p className="op-count">No photos fit</p>
                )}
                {sheet.error && <p className="op-sub">{sheet.error}</p>}
              </div>
            </div>
            <div className="op-field">
              <label htmlFor={`${uid}-paper`}>Paper size</label>
              <select
                id={`${uid}-paper`}
                className="op-select"
                value={paperId}
                disabled={busy}
                onChange={(event) => {
                  const id = event.target.value;
                  setPaperId(id);
                  setStyle(defaultStyle(id));
                  setSheetFormat(id === "4x6" ? "jpeg" : "pdf");
                }}
              >
                {PAPERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="op-field">
              <label htmlFor={`${uid}-style`}>Layout</label>
              <select
                id={`${uid}-style`}
                className="op-select"
                value={style}
                disabled={busy}
                onChange={(event) => setStyle(event.target.value as SheetStyle)}
              >
                {(Object.keys(STYLE_LABEL) as SheetStyle[]).map((s) => (
                  <option key={s} value={s}>
                    {STYLE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="op-row">
              <Segmented<SheetFormat>
                label="File type"
                value={sheetFormat}
                options={["jpeg", "pdf"] as const}
                render={(v) => FORMAT_LABEL[v]}
                disabled={busy}
                onChange={setSheetFormat}
              />
              <Segmented<number>
                label="Resolution"
                value={sheetDpi}
                options={[300, 600] as const}
                render={(v) => `${v} DPI`}
                disabled={busy}
                onChange={setSheetDpi}
              />
            </div>
            <details className="op-more">
              <summary>Paper orientation: {orientation === "auto" ? "automatic" : orientation}</summary>
              <div className="op-field">
                <label htmlFor={`${uid}-orient`}>Orientation</label>
                <select
                  id={`${uid}-orient`}
                  className="op-select"
                  value={orientation}
                  disabled={busy}
                  onChange={(event) =>
                    setOrientation(event.target.value as SheetOrientation)
                  }
                >
                  <option value="auto">Automatic (fits the most photos)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </details>
            {sheetTooLarge && (
              <p className="op-alert" role="alert">
                <strong>Sheet too large for one image.</strong> At {sheetDpi} DPI
                this sheet is more than phones and tablets can render as a JPG.
                Choose PDF, or use 300 DPI.
              </p>
            )}
            {printLines}
            {gentleNote}
            <DownloadRow
              label="Download print sheet"
              busy={busy}
              disabled={!sheet.layout || sheetTooLarge}
              onClick={() => void run("sheet")}
              disclaimer={disclaimer}
            />
          </>
        )}

        {tab === "single" && (
          <>
            <div className="op-summary">
              <div>
                <p className="op-count">
                  {oneDecimal(preset.widthMm)} × {oneDecimal(preset.heightMm)} mm
                </p>
                <p className="op-sub">{singleSize(preset, singleDpi)}</p>
              </div>
            </div>
            <div className="op-row">
              <Segmented<SingleFormat>
                label="File type"
                value={singleFormat}
                options={["jpeg", "png", "pdf"] as const}
                render={(v) => FORMAT_LABEL[v]}
                disabled={busy}
                onChange={setSingleFormat}
              />
              <Segmented<number>
                label="Resolution"
                value={singleDpi}
                options={[300, 600] as const}
                render={(v) => `${v} DPI`}
                disabled={busy}
                onChange={setSingleDpi}
              />
            </div>
            {printLines}
            {gentleNote}
            <DownloadRow
              label="Download photo"
              busy={busy}
              onClick={() => void run("single")}
              disclaimer={disclaimer}
            />
          </>
        )}

        {tab === "digital" && target && (
          <>
            <div className="op-summary">
              <div>
                <p className="op-count">{digitalTargetText(target)}</p>
                <p className="op-sub">
                  JPEG. 1 KB = {(target.kbBytes ?? 1024).toLocaleString("en-US")}{" "}
                  bytes, as the source counts it.
                </p>
              </div>
            </div>
            {gentleNote}
            <DownloadRow
              label="Download digital photo"
              busy={busy}
              onClick={() => void run("digital")}
              disclaimer={disclaimer}
            />
          </>
        )}

        {tab === "original" && (
          <>
            <div className="op-summary">
              <div>
                <p className="op-count">Your original file, unchanged</p>
                <p className="op-sub">
                  No crop, resize or edit. The application positions the photo
                  itself.
                </p>
              </div>
            </div>
            <dl className="op-facts">
              <div>
                <dt>Your file</dt>
                <dd>
                  {MIME_LABEL[photo.mime] ?? photo.mime},{" "}
                  {formatBytes(photo.file.size, doc?.digital?.kbBytes ?? 1000)}
                  {photo.width > 0 && `, ${photo.width} × ${photo.height} px`}
                </dd>
              </div>
              {(preset.mimeTypes?.length ||
                preset.minBytes ||
                preset.maxBytes) && (
                <div>
                  <dt>Accepted</dt>
                  <dd>{acceptedText(preset, doc?.digital?.kbBytes ?? 1000)}</dd>
                </div>
              )}
            </dl>
            {doc?.diyNote && <p className="op-note">{doc.diyNote}</p>}
            <DownloadRow
              label="Download original"
              busy={busy}
              onClick={() => void run("original")}
              disclaimer={disclaimer}
            />
          </>
        )}

        {backgroundWarning && <p className="op-alert">{backgroundWarning}</p>}
        {failure && (
          <p className="op-alert" role="alert">
            {failure.lead && <strong>{failure.lead} </strong>}
            {failure.message}
          </p>
        )}
        <div className="op-status" role="status" aria-live="polite">
          {busy && <p>Preparing your download…</p>}
          {done && !busy && (
            <>
              {done.digital ? (
                <p className="op-result">
                  <strong title={`${done.digital.bytes.toLocaleString("en-US")} bytes`}>
                    {done.digital.width}×{done.digital.height} px ·{" "}
                    {done.digital.kb} KB (quality {done.digital.quality})
                  </strong>
                  <span>Downloaded {done.filename}</span>
                  {done.digital.padded && (
                    <span>
                      Padded to meet minimum. A hidden comment was added to reach
                      the minimum size; the pixels are unchanged.
                    </span>
                  )}
                </p>
              ) : done.kind === "original" ? (
                <p className="op-result">
                  <strong>Original file downloaded without edits.</strong>
                  <span>{done.filename}</span>
                </p>
              ) : (
                <p className="op-result">
                  <strong>Downloaded {done.filename}</strong>
                  {(done.kind === "sheet" || done.kind === "single") && (
                    <span>Print at actual size, with scaling turned off.</span>
                  )}
                </p>
              )}
            </>
          )}
        </div>
        {done?.kind === "sheet" && !busy && (
          <PrintGuide
            doc={doc}
            preset={preset}
            paperId={done.paperId}
            style={done.style}
            count={done.count}
          />
        )}
      </div>
    </section>
  );
}

function singleSize(preset: Preset, dpi: number) {
  try {
    const s = outputSize(preset, dpi);
    return `${s.width} × ${s.height} px at ${dpi} DPI`;
  } catch {
    return `${dpi} DPI`;
  }
}

function digitalTargetText(t: DigitalTarget) {
  const size = `${t.widthPx} × ${t.heightPx} px`;
  if (t.minKB !== undefined && t.maxKB !== undefined)
    return `${size} · ${t.minKB}–${t.maxKB} KB`;
  if (t.maxKB !== undefined) return `${size} · up to ${t.maxKB} KB`;
  if (t.minKB !== undefined) return `${size} · at least ${t.minKB} KB`;
  return size;
}

function acceptedText(preset: Preset, unit: 1000 | 1024) {
  const types = [
    ...new Set((preset.mimeTypes ?? []).map((m) => MIME_LABEL[m] ?? m)),
  ].join(", ");
  const min = preset.minBytes ? formatBytes(preset.minBytes, unit) : "";
  const max = preset.maxBytes ? formatBytes(preset.maxBytes, unit) : "";
  const size =
    min && max ? `${min} to ${max}` : max ? `up to ${max}` : min ? `at least ${min}` : "";
  return [types, size].filter(Boolean).join(", ");
}

function DownloadRow({
  label,
  busy,
  disabled,
  onClick,
  disclaimer,
}: {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onClick(): void;
  disclaimer: ReactNode;
}) {
  return (
    <div className="op-action">
      <button
        type="button"
        className="op-primary"
        disabled={busy || disabled}
        onClick={onClick}
      >
        {busy ? "Preparing…" : label}
      </button>
      {disclaimer}
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  render,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  render(v: T): string;
  disabled?: boolean;
  onChange(v: T): void;
}) {
  return (
    <div className="op-field op-seg-field">
      <span className="op-label">{label}</span>
      <div className="op-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            disabled={disabled}
            aria-pressed={value === o}
            onClick={() => onChange(o)}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The real sheet, small: the engine's own renderer, re-drawn once per frame at most. */
function SheetThumb({
  photo,
  preset,
  crop,
  background,
  paperId,
  style,
  orientation,
  layout,
}: {
  photo: LoadedPhoto;
  preset: Preset;
  crop: Crop;
  background?: string;
  paperId: string;
  style: SheetStyle;
  orientation: SheetOrientation;
  layout: SheetLayout;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cropKey = `${crop.x}|${crop.y}|${crop.width}|${crop.height}`;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const frame = requestAnimationFrame(() => {
      try {
        renderPreview(canvas, photo, preset, crop, {
          sheet: true,
          paperId,
          dpi: 300,
          sheetStyle: style,
          sheetOrientation: orientation,
          background,
        });
      } catch {
        /* the count and size text still describe the sheet */
      }
    });
    return () => cancelAnimationFrame(frame);
    // crop and preset are keyed by their values (see cropKey and preset.id); object identity may change every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, preset.id, cropKey, background, paperId, style, orientation]);
  return (
    <div
      className="op-thumb"
      data-orientation={layout.orientation}
      aria-hidden="true"
    >
      <canvas ref={ref} />
    </div>
  );
}
