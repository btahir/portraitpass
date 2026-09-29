// A small to-scale drawing of a document's photo frame: the frame itself, the eye-line band and the
// head range, all taken from the dataset. The words and numbers are HTML beside it (localized and
// direction-safe); the SVG carries no text, so it needs no translation and never flips in a
// right-to-left page (a photo frame is not a reading direction).
import type { DocumentSpec } from "../../core/documents";
import type { Locale } from "../../i18n";
import { strings } from "../../i18n/strings";
import { compactMm, compactRatio, digitalDims, ltr, printSizeShort } from "./content";

type Range = [number, number];
interface Frame {
  /** Frame size in one unit (mm for prints; percent of the image height for uploads). */
  w: number;
  h: number;
  head?: Range;
  eye?: Range;
  /** True when the unit is a percentage of the height (the numbers are ratios). */
  ratio: boolean;
}

const range = (lo?: number, hi?: number): Range | undefined =>
  lo === undefined && hi === undefined ? undefined : [lo ?? hi!, hi ?? lo!];

/** The frame to draw, or undefined when the dataset gives no head or eye position to show. */
export function frameOf(doc: DocumentSpec): Frame | undefined {
  const p = doc.print;
  if (p) {
    const head = range(p.headMinMm, p.headMaxMm);
    const eye = range(p.eyeMinMm, p.eyeMaxMm);
    if (head || eye) return { w: p.widthMm, h: p.heightMm, head, eye, ratio: false };
  }
  const d = doc.digital;
  if (d && !d.originalOnly) {
    const head = range(d.headRatioMin, d.headRatioMax);
    const eye = range(d.eyeRatioMin, d.eyeRatioMax);
    if (!head && !eye) return undefined;
    let aspect = d.aspect;
    if (d.widthPx && d.heightPx) aspect = d.widthPx / d.heightPx;
    else if (!aspect && d.minWidthPx && d.minHeightPx && d.maxWidthPx && d.maxHeightPx) {
      const lo = d.minWidthPx / d.minHeightPx;
      if (Math.abs(lo - d.maxWidthPx / d.maxHeightPx) < 0.01) aspect = lo;
    }
    if (!aspect) return undefined;
    const s = (r?: Range): Range | undefined => r && [r[0] * 100, r[1] * 100];
    return { w: 100 * aspect, h: 100, head: s(head), eye: s(eye), ratio: true };
  }
  return undefined;
}

export function DocDiagram({ doc, locale = "en" }: { doc: DocumentSpec; locale?: Locale }) {
  const frame = frameOf(doc);
  if (!frame) return null;
  const t = strings(locale).doc;
  const { w: W, h: H, head, eye } = frame;
  const m = Math.max(W, H) * 0.03;
  const y = (fromBottom: number) => H - fromBottom;

  // Where to put the head: eyes sit about halfway down the head. With an eye range the head is
  // placed around it; with only a head range it goes in the upper middle of the frame.
  const headH = head ? (head[0] + head[1]) / 2 : H * 0.62;
  const eyeMid = eye ? (eye[0] + eye[1]) / 2 : undefined;
  let chin = eyeMid !== undefined ? eyeMid - headH * 0.5 : (H - headH) * 0.55;
  chin = Math.max(H * 0.02, Math.min(chin, H - headH - H * 0.01));
  const crown = chin + headH;
  const eyeAt = eyeMid ?? chin + headH * 0.5;
  const cx = W / 2;
  const rx = Math.min(headH * 0.36, W * 0.4);
  const neck = rx * 0.42;
  const shoulder = Math.min(W * 0.48, rx * 2.6);
  const sTop = Math.min(y(chin) + headH * 0.3, H * 0.985);
  const bx = Math.min(cx + rx + W * 0.06, W - m * 2); // bracket x
  const tick = W * 0.035;
  const clip = `pgd-${doc.id}`;

  const headText = head
    ? frame.ratio
      ? compactRatio(head[0] / 100, head[1] / 100, locale)
      : compactMm(head[0], head[1], locale)
    : undefined;
  const eyeText = eye
    ? frame.ratio
      ? compactRatio(eye[0] / 100, eye[1] / 100, locale)
      : compactMm(eye[0], eye[1], locale)
    : undefined;
  const size =
    (frame.ratio ? digitalDims(doc.digital!, locale) : printSizeShort(doc.print!, locale)) ??
    ltr(`${Math.round(W)}:${Math.round(H)}`, locale);

  return (
    <figure className="pg-figure">
      <svg
        className="pgd-svg"
        viewBox={`${-m} ${-m} ${W + 2 * m} ${H + 2 * m}`}
        role="img"
        aria-label={t.diagramAlt(size)}
      >
        <defs>
          <clipPath id={clip}>
            <rect x={0} y={0} width={W} height={H} />
          </clipPath>
        </defs>
        <rect className="pgd-frame" x={0} y={0} width={W} height={H} />
        <g clipPath={`url(#${clip})`}>
          <path
            className="pgd-body"
            d={`M ${cx - shoulder} ${H} Q ${cx - shoulder} ${sTop} ${cx - neck} ${sTop} L ${cx - neck} ${y(chin) - 1} L ${cx + neck} ${y(chin) - 1} L ${cx + neck} ${sTop} Q ${cx + shoulder} ${sTop} ${cx + shoulder} ${H} Z`}
          />
          <ellipse className="pgd-head" cx={cx} cy={y(chin + headH / 2)} rx={rx} ry={headH / 2} />
          {eye && (
            <rect
              className="pgd-eyeband"
              x={0}
              y={y(eye[1])}
              width={W}
              height={Math.max(eye[1] - eye[0], H * 0.012)}
            />
          )}
          {[-1, 1].map((k) => (
            <circle
              key={k}
              className="pgd-eye"
              cx={cx + k * rx * 0.42}
              cy={y(eyeAt)}
              r={Math.max(headH * 0.022, 0.4)}
            />
          ))}
          {head && (
            <g className="pgd-bracket">
              <line x1={bx} x2={bx} y1={y(chin)} y2={y(chin + head[1])} />
              <line x1={bx - tick} x2={bx + tick} y1={y(chin)} y2={y(chin)} />
              <line className="pgd-strong" x1={bx - tick} x2={bx + tick} y1={y(chin + head[0])} y2={y(chin + head[0])} />
              <line className="pgd-strong" x1={bx - tick} x2={bx + tick} y1={y(chin + head[1])} y2={y(chin + head[1])} />
            </g>
          )}
        </g>
      </svg>
      <ul className="pgd-legend">
        {head && headText && (
          <li>
            <i className="pgd-sw pgd-sw-head" aria-hidden="true" />
            <b>{t.diagramHead}</b> <span>{headText}</span>
          </li>
        )}
        {eye && eyeText && (
          <li>
            <i className="pgd-sw pgd-sw-eye" aria-hidden="true" />
            <b>{t.diagramEye}</b> <span>{eyeText}</span>
          </li>
        )}
      </ul>
      <figcaption>{t.diagramNote}</figcaption>
    </figure>
  );
}
