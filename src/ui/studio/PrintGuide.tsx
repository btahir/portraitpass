import type { DocumentSpec, Preset, SheetStyle } from "../../core/index";

export interface PrintGuideProps {
  doc?: DocumentSpec;
  preset: Preset;
  /** Paper the sheet was made for ("4x6", "a4", "letter"). Default "4x6". */
  paperId?: string;
  /** Sheet style that was exported. Default: edge-to-edge on 4x6, cut marks otherwise. */
  style?: SheetStyle;
  /** Photos on the sheet, for the cutting step. */
  count?: number;
}

export const PRINT_GUIDE_URL = "/print-passport-photos/";

/** "Print for about 40¢" card shown after a sheet export. Plain steps, one link out, no icons. */
export function PrintGuide({
  doc,
  preset,
  paperId = "4x6",
  style,
  count,
}: PrintGuideProps) {
  const lab = paperId === "4x6";
  const marks = (style ?? (lab ? "edge-to-edge" : "cut-marks")) === "cut-marks";
  const country = doc?.countryCode ?? "";
  const australia = country === "AU" || preset.country === "Australia";
  const uk = country === "GB" || preset.country === "United Kingdom";
  const size = `${round(preset.widthMm)} × ${round(preset.heightMm)} mm`;

  return (
    <section className="op-guide" aria-labelledby="op-guide-title">
      <h3 id="op-guide-title">
        {lab ? "Print for about 40¢" : "Print at home, at actual size"}
      </h3>
      {lab ? (
        <ol>
          <li>
            Order a 4 × 6 in print at CVS, Walgreens or Walmart Photo, or any
            photo lab. Upload the file you just downloaded, or use the in-store
            kiosk.
          </li>
          <li>
            Choose “no borders” or “don’t crop” if it is offered, and print at
            actual size.
          </li>
          <li>
            Cut along the guides
            {count ? `: ${count} photos, each ${size}` : `. Each photo is ${size}`}
            .
          </li>
        </ol>
      ) : (
        <ol>
          <li>
            Open the file and print at 100% or “actual size”. Turn off “fit to
            page”.
          </li>
          <li>Use photo paper if you have it. Plain paper prints look flat.</li>
          <li>
            Cut {marks ? "along the corner marks" : "along the guides"}
            {count ? `: ${count} photos, each ${size}` : `. Each photo is ${size}`}
            .
          </li>
        </ol>
      )}
      {australia && (
        <p className="op-guide-note">
          Australia: take the file to a photo lab and ask for glossy
          dye-sublimation prints, 200 gsm or heavier. A home printer will not
          do.
        </p>
      )}
      {uk && (
        <p className="op-guide-note">
          UK paper forms: ask the lab or booth for professional prints, plain
          white photographic paper, no border. Check there are no creases or
          marks before you send them.
        </p>
      )}
      {!lab && (
        <p className="op-guide-note">
          A lab print is usually sharper and cheaper. Choose the 4 × 6 in sheet
          for about 40¢.
        </p>
      )}
      <a className="op-link" href={PRINT_GUIDE_URL}>
        More on printing passport photos
      </a>
    </section>
  );
}

const round = (n: number) => Math.round(n * 10) / 10;
