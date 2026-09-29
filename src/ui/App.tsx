import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileDown,
  FolderOpen,
  Heart,
  HelpCircle,
  ImagePlus,
  LockKeyhole,
  Maximize,
  Moon,
  Move,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  TriangleAlert,
  Upload,
  X,
  LoaderCircle,
} from "lucide-react";
import {
  PRESETS,
  PAPERS,
  defaultCrop,
  clampCrop,
  zoomCrop,
  cropFromLandmarks,
  cropIssues,
  outputSize,
  layoutSheet,
  DOCUMENT_NOTICES,
  backgroundWarning,
  measurementChecks,
  landmarksValid,
  type Crop,
  type Preset,
  type Landmarks,
} from "../core/index";
import {
  loadPhoto,
  loadDemo,
  releasePhoto,
  renderPreview,
  exportPhoto,
  downloadBlob,
  autoCrop,
  prepareBackground,
  warmExportTools,
  HEIC_UNSUPPORTED_MESSAGE,
  HEIC_PRINT_MESSAGE,
  isHeifPhoto,
  saveProject,
  openProject,
  type LoadedPhoto,
} from "../browser/engine";
import {
  SUPPORT_URL,
  DONATION_LINKS,
  DISCLAIMER,
  DOWNLOAD_NOTE,
  FACE_NOTICE,
} from "../config";
import {
  CHECK_LABELS,
  checkRange,
  checkValue,
  sourceLabel,
  statusWord,
} from "./checks";
import { AccessibilityPage, PrivacyPage, TermsPage } from "./pages";
import "./styles.css";

type View = "single" | "sheet" | "compare";
type Format = "jpeg" | "png" | "pdf";
const DEFAULT_CUSTOM = { widthMm: 35, heightMm: 45 };
const COMMIT_DELAY = 450;
const keywordPages: Record<
  string,
  {
    title: string;
    h1: [string, string];
    description: string;
    preset: string;
    sheet?: boolean;
  }
> = {
  "/us-passport-photo/": {
    title: "What to know about the 2 × 2 inch photo",
    h1: ["US passport photo,", "2×2 inches"],
    description:
      "Prepare a square 2 × 2 inch photo with visible head and eye guides and a 600 × 600 pixel export at 300 DPI. Keep your natural appearance, have someone else take the photo or use a tripod, and check the State Department’s current instructions before printing.",
    preset: "us-passport",
  },
  "/uk-passport-photo/": {
    title: "What to know about the UK 35 × 45 mm photo",
    h1: ["UK passport photo,", "35×45 mm"],
    description:
      "Make a 35 × 45 mm printed photo with crown-to-chin guides for the UK’s 29–34 mm head range. Paper applications need a professionally printed photo. Applying online? Select UK passport · original to keep your file unedited: the UK says not to crop digital application photos.",
    preset: "uk-passport",
  },
  "/35x45-photo/": {
    title: "Exact 35 × 45 mm, without stretching",
    h1: ["35×45 mm photo,", "sized exactly"],
    description:
      "Prepare a 35 × 45 mm photograph without stretching the image. Choose a document format or general ID, then position your photo and export at 300 DPI. Dimensions alone do not establish whether a photo meets the receiving organisation’s requirements.",
    preset: "uk-passport",
  },
  "/passport-photo-print-sheet/": {
    title: "Print at actual size, with cut marks",
    h1: ["Passport photos on a", "4×6 print sheet"],
    description:
      "Arrange precisely sized passport photos on 4 × 6 inch paper with safe margins and cut marks. Download a PDF with an exact physical page size, then print at 100% or actual size. Turn off “fit to page” and check the dimensions with a ruler.",
    preset: "us-passport",
    sheet: true,
  },
};
const sameCrop = (a: Crop, b: Crop) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
/** Keep crown < eyes < chin, at least `gap` apart, inside the photo. `moved` wins. */
function orderLandmarks(
  l: Landmarks,
  height: number,
  moved: "crownY" | "eyesY" | "chinY" | null = null,
): Landmarks {
  const gap = height * 0.01;
  let { crownY, eyesY, chinY } = l;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  if (moved === "crownY") {
    crownY = clamp(crownY, 0, height - 2 * gap);
    eyesY = Math.max(eyesY, crownY + gap);
    chinY = Math.max(chinY, eyesY + gap);
  } else if (moved === "chinY") {
    chinY = clamp(chinY, 2 * gap, height);
    eyesY = Math.min(eyesY, chinY - gap);
    crownY = Math.min(crownY, eyesY - gap);
  }
  // Whichever value moved, the order is now settled around the eyes.
  eyesY = clamp(eyesY, gap, height - gap);
  crownY = clamp(Math.min(crownY, eyesY - gap), 0, height);
  chinY = clamp(Math.max(chinY, eyesY + gap), 0, height);
  return { ...l, crownY, eyesY, chinY };
}
/** Only width and height ever come from the custom size. */
function withCustomSize(p: Preset, size: { widthMm: number; heightMm: number }) {
  return p.mode === "general"
    ? { ...p, widthMm: size.widthMm, heightMm: size.heightMm }
    : p;
}
function normalizePath(path: string) {
  return path === "/" ? path : `${path.replace(/\/+$/, "")}/`;
}
function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try another photo.";
}
function Logo() {
  return (
    <a href="/" className="brand" aria-label="PortraitPass home">
      <svg
        className="brand-mark"
        viewBox="0 0 34 38"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 11V3h8M24 3h8v8M32 27v8h-8M10 35H2v-8"
          stroke="currentColor"
          strokeWidth="2.3"
        />
        <ellipse
          cx="17"
          cy="14"
          rx="5.7"
          ry="6.8"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 30c.8-6 4.5-8.5 10-8.5S26.2 24 27 30"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      PortraitPass<span style={{ color: "var(--accent)" }}>.</span>
    </a>
  );
}
function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  display,
  disabled = false,
  onChange,
  onCommit,
}: {
  disabled?: boolean;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
  onChange: (value: number) => void;
  /** Called once a drag has ended, or a burst of key presses has settled. */
  onCommit?: () => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const held = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    onCommit?.();
  }, [onCommit]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div className="slider-field">
      <div className="slider-title">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{display ?? `${Math.round(value)}%`}</output>
      </div>
      <input
        id={id}
        className="range"
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => {
          held.current = true;
          const release = () => {
            window.removeEventListener("pointerup", release);
            window.removeEventListener("pointercancel", release);
            held.current = false;
            commit();
          };
          window.addEventListener("pointerup", release);
          window.addEventListener("pointercancel", release);
        }}
        onBlur={commit}
        onChange={(event) => {
          onChange(Number(event.target.value));
          if (!held.current) {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(commit, COMMIT_DELAY);
          }
        }}
      />
    </div>
  );
}

export default function App({ initialPath }: { initialPath?: string } = {}) {
  const path = normalizePath(
    initialPath ??
      (typeof window === "undefined" ? "/" : window.location.pathname),
  );
  const keyword = keywordPages[path];
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [presetId, setPresetId] = useState(keyword?.preset ?? "us-passport");
  const [customSize, setCustomSize] = useState(DEFAULT_CUSTOM);
  const [customDraft, setCustomDraft] = useState({
    widthMm: "35",
    heightMm: "45",
  });
  useEffect(() => {
    setCustomDraft({
      widthMm: String(customSize.widthMm),
      heightMm: String(customSize.heightMm),
    });
  }, [customSize]);
  const preset = useMemo(() => {
    const p = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0]!;
    return withCustomSize(p, customSize);
  }, [presetId, customSize]);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [landmarks, setLandmarks] = useState<Landmarks | null>(null);
  // False while the head positions are only rough defaults nobody has set.
  const [landmarksSet, setLandmarksSet] = useState(false);
  const [view, setView] = useState<View>(keyword?.sheet ? "sheet" : "single");
  const [paperId, setPaperId] = useState("4x6");
  const [format, setFormat] = useState<Format>("jpeg");
  const [dpi, setDpi] = useState(300);
  const [guides, setGuides] = useState(false);
  const [manualGuides, setManualGuides] = useState(false);
  const [background, setBackground] = useState<string | undefined>();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [exported, setExported] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<Crop[]>([]);
  const historyRef = useRef<Crop[]>([]);
  // The crop as it was before the drag, slider move or key burst now in progress.
  const gestureRef = useRef<Crop | null>(null);
  const [gestureOpen, setGestureOpen] = useState(false);
  const commitTimer = useRef<number | undefined>(undefined);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const anchorRef = useRef<{
    crop: Crop;
    x: number;
    y: number;
    dist: number;
    width: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<LoadedPhoto | null>(null);
  const cropRef = useRef<Crop | null>(null);
  const versionRef = useRef(0);
  cropRef.current = crop;
  const isOriginal = preset.mode === "original";
  // HEIC/HEIF is only for original mode: passed through untouched, never decoded for prints.
  const heicPhoto = !!photo && isHeifPhoto(photo);
  // iOS Safari converts a HEIC to JPEG unless the input lists it, which would break the print flow,
  // so HEIC is offered only where the selected document takes it as-is.
  const acceptsHeic = isOriginal && !!preset.mimeTypes?.includes("image/heic");
  /** A HEIC photo only fits an original-mode document that lists its type. */
  const heicFits = (item: { mode: string; mimeTypes?: string[] }) =>
    !photo || !heicPhoto || (item.mode === "original" && !!item.mimeTypes?.includes(photo.mime));
  const fileAccept = acceptsHeic
    ? "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
    : "image/jpeg,image/png,image/webp";
  const size = useMemo(() => outputSize(preset, dpi), [preset, dpi]);
  const sheet = useMemo(() => {
    if (isOriginal) return null;
    try {
      return layoutSheet(preset, paperId, dpi);
    } catch {
      return null;
    }
  }, [preset, paperId, isOriginal, dpi]);
  const issues =
    photo && crop && !photo.bytesOnly
      ? // Eye-line and head range are shown as measurements, not used to block downloads.
        cropIssues(crop, photo.width, photo.height, preset, dpi)
      : [];
  if (photo?.bytesOnly && !isOriginal)
    issues.push({ code: "HEIC_UNSUPPORTED", message: HEIC_UNSUPPORTED_MESSAGE });
  if (photo && isOriginal) {
    if (preset.mimeTypes && !preset.mimeTypes.includes(photo.file.type))
      issues.push({
        code: "FILE_TYPE",
        message: `This application needs ${preset.mimeTypes.map((type) => type.replace("image/", "").toUpperCase()).join(" or ")}. Choose an accepted original file.`,
      });
    if (
      (preset.minBytes && photo.file.size < preset.minBytes) ||
      (preset.maxBytes && photo.file.size > preset.maxBytes)
    )
      issues.push({
        code: "FILE_SIZE",
        message: `Original file must be ${Math.round((preset.minBytes ?? 0) / 1000)} KB–${Math.round((preset.maxBytes ?? 0) / 1000000)} MB. Choose another original.`,
      });
    if (
      photo.width > 0 &&
      ((preset.minWidth && photo.width < preset.minWidth) ||
        (preset.minHeight && photo.height < preset.minHeight))
    )
      issues.push({
        code: "DIMENSIONS",
        message: `Original must be at least ${preset.minWidth} × ${preset.minHeight} pixels.`,
      });
  }
  const checks = useMemo(
    () =>
      photo && crop && landmarks && !isOriginal
        ? measurementChecks(
            preset,
            crop,
            landmarksSet ? landmarks : undefined,
            { width: photo.width, height: photo.height },
            dpi,
          )
        : [],
    [photo, crop, landmarks, landmarksSet, preset, isOriginal, dpi],
  );
  const baseCrop =
    photo && photo.width > 0 && photo.height > 0
      ? defaultCrop(photo.width, photo.height, preset)
      : null;
  const zoom = crop && baseCrop ? baseCrop.width / crop.width : 1;
  const clearHistory = useCallback(() => {
    window.clearTimeout(commitTimer.current);
    gestureRef.current = null;
    historyRef.current = [];
    setGestureOpen(false);
    setHistory([]);
  }, []);
  /** Close the open gesture: one undo step for the whole drag, slider move or key burst. */
  const commitGesture = useCallback(() => {
    window.clearTimeout(commitTimer.current);
    const start = gestureRef.current;
    if (!start) return;
    gestureRef.current = null;
    setGestureOpen(false);
    const now = cropRef.current;
    if (now && !sameCrop(start, now)) {
      historyRef.current = [...historyRef.current.slice(-24), start];
      setHistory(historyRef.current);
    }
  }, []);
  /** Move the crop as part of the current gesture, without adding an undo step yet. */
  const liveCrop = useCallback((next: Crop) => {
    if (!gestureRef.current && cropRef.current) {
      gestureRef.current = cropRef.current;
      setGestureOpen(true);
    }
    cropRef.current = next;
    setCrop(next);
    setExported(false);
  }, []);
  const settleSoon = useCallback(() => {
    window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(commitGesture, COMMIT_DELAY);
  }, [commitGesture]);
  const setNextCrop = useCallback(
    (next: Crop, remember = true) => {
      commitGesture();
      const before = cropRef.current;
      if (remember && before && !sameCrop(before, next)) {
        historyRef.current = [...historyRef.current.slice(-24), before];
        setHistory(historyRef.current);
      }
      cropRef.current = next;
      setCrop(next);
      setExported(false);
    },
    [commitGesture],
  );

  useEffect(() => {
    void warmExportTools().catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.style.background = dark ? "#13272e" : "#f7f6f0";
  }, [dark]);
  useEffect(
    () => () => {
      window.clearTimeout(commitTimer.current);
      if (photoRef.current) releasePhoto(photoRef.current);
    },
    [],
  );
  const acceptPhoto = useCallback(
    (
      next: LoadedPhoto,
      nextCrop?: Crop,
      nextPreset = preset,
      nextLandmarks?: Landmarks,
    ) => {
      if (photoRef.current) releasePhoto(photoRef.current);
      photoRef.current = next;
      setPhoto(next);
      // A HEIC this browser cannot decode may not state its size; it is only ever passed through.
      const startCrop =
        nextCrop ??
        defaultCrop(next.width || 1, next.height || 1, nextPreset);
      cropRef.current = startCrop;
      setCrop(startCrop);
      setLandmarks(
        nextLandmarks
          ? orderLandmarks(nextLandmarks, next.height)
          : {
              centerX: next.width / 2,
              crownY: next.height * 0.18,
              eyesY: next.height * 0.36,
              chinY: next.height * 0.63,
            },
      );
      setLandmarksSet(!!nextLandmarks);
      setBackground(undefined);
      setError("");
      setStatus("");
      setExported(false);
      clearHistory();
    },
    [preset, clearHistory],
  );
  const importFile = useCallback(
    async (file: File) => {
      const version = ++versionRef.current;
      setBusy("Opening your photo…");
      setError("");
      try {
        const next = await loadPhoto(file);
        if (version !== versionRef.current) {
          releasePhoto(next);
          return;
        }
        if (
          isHeifPhoto(next) &&
          !(preset.mode === "original" && preset.mimeTypes?.includes(next.mime))
        ) {
          // HEIC is only ever passed through untouched, so only a digital-original document can use
          // it. Switch to the first one that takes this type; the crop is built for that document.
          const original = PRESETS.find(
            (item) =>
              item.mode === "original" && item.mimeTypes?.includes(next.mime),
          );
          if (!original) {
            releasePhoto(next);
            setError(
              next.bytesOnly ? HEIC_UNSUPPORTED_MESSAGE : HEIC_PRINT_MESSAGE,
            );
            return;
          }
          acceptPhoto(next, undefined, original);
          setPresetId(original.id);
          setView("single");
          setStatus(
            `${HEIC_PRINT_MESSAGE} Switched to ${original.name}, where the file is kept unchanged.`,
          );
          return;
        }
        acceptPhoto(next);
      } catch (e) {
        if (version === versionRef.current) setError(messageOf(e));
      } finally {
        if (version === versionRef.current) setBusy("");
      }
    },
    [acceptPhoto, preset],
  );
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      if (file && !busy) {
        event.preventDefault();
        void importFile(file);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [importFile, busy]);
  const guideLandmarks =
    guides && landmarksSet && landmarks ? landmarks : undefined;
  useEffect(() => {
    if (!photo || !crop || !canvasRef.current) return;
    try {
      renderPreview(canvasRef.current, photo, preset, crop, {
        paperId,
        dpi,
        sheet: view === "sheet" && !isOriginal,
        guides: guides && view !== "sheet" && !isOriginal,
        background: isOriginal ? undefined : background,
        landmarks: guideLandmarks,
      });
    } catch (e) {
      setError(messageOf(e));
    }
  }, [
    photo,
    crop,
    preset,
    paperId,
    view,
    guides,
    background,
    isOriginal,
    dpi,
    guideLandmarks,
  ]);

  const sample = async () => {
    const version = ++versionRef.current;
    setBusy("Opening the synthetic sample…");
    setError("");
    try {
      const next = await loadDemo();
      if (version !== versionRef.current) {
        releasePhoto(next);
        return;
      }
      const demoLandmarks = {
        centerX: next.width * 0.5,
        crownY: next.height * 0.155,
        eyesY: next.height * 0.416,
        chinY: next.height * 0.624,
      };
      acceptPhoto(
        next,
        cropFromLandmarks(next.width, next.height, preset, demoLandmarks),
        preset,
        demoLandmarks,
      );
    } catch (e) {
      if (version === versionRef.current) setError(messageOf(e));
    } finally {
      if (version === versionRef.current) setBusy("");
    }
  };
  const selectPreset = (id: string) => {
    const next = PRESETS.find((item) => item.id === id)!;
    const actual = withCustomSize(next, customSize);
    if (!heicFits(next)) {
      setError(HEIC_PRINT_MESSAGE);
      return;
    }
    setPresetId(id);
    if (photo && !heicPhoto && baseCrop)
      setNextCrop(defaultCrop(photo.width, photo.height, actual), false);
    if (next.mode === "original") setView("single");
    setBackground(undefined);
    clearHistory();
    setExported(false);
    setError("");
    setStatus("");
  };
  const commitCustom = (key: "widthMm" | "heightMm") => {
    const text = customDraft[key].trim();
    const value = Number(text),
      maximum = key === "widthMm" ? 100 : 150;
    if (!text || !Number.isFinite(value) || value < 10 || value > maximum) {
      setError(
        `${key === "widthMm" ? "Width" : "Height"} must be between 10 and ${maximum} mm. Your previous size was kept.`,
      );
      setCustomDraft((draft) => ({ ...draft, [key]: String(customSize[key]) }));
      return;
    }
    if (value === customSize[key]) return;
    const next = { ...customSize, [key]: value };
    setCustomSize(next);
    if (photo)
      setNextCrop(
        defaultCrop(photo.width, photo.height, { ...preset, ...next }),
        false,
      );
    clearHistory();
    setExported(false);
    setError("");
  };
  const reset = () => {
    if (photo && !heicPhoto) {
      setNextCrop(defaultCrop(photo.width, photo.height, preset));
      setStatus("Position reset.");
    }
  };
  const undo = () => {
    commitGesture();
    const previous = historyRef.current.at(-1);
    if (previous) {
      historyRef.current = historyRef.current.slice(0, -1);
      setHistory(historyRef.current);
      cropRef.current = previous;
      setCrop(previous);
      setExported(false);
    }
  };
  const startOver = () => {
    ++versionRef.current;
    if (photoRef.current) releasePhoto(photoRef.current);
    photoRef.current = null;
    setPhoto(null);
    cropRef.current = null;
    setCrop(null);
    setLandmarks(null);
    setLandmarksSet(false);
    setBackground(undefined);
    clearHistory();
    setExported(false);
    setError("");
    setStatus("");
    setBusy("");
  };
  const assist = async () => {
    if (!photo || isOriginal || busy) return;
    const operation = versionRef.current;
    setBusy("Finding the face, on your device…");
    setError("");
    try {
      const result = await autoCrop(photo, preset);
      if (operation !== versionRef.current) return;
      setNextCrop(result.crop);
      setLandmarks(orderLandmarks(result.landmarks, photo.height));
      setLandmarksSet(true);
      setGuides(false);
      setManualGuides(true);
      setStatus(result.message);
    } catch (e) {
      if (operation === versionRef.current) setError(messageOf(e));
    } finally {
      if (operation === versionRef.current) setBusy("");
    }
  };
  const save = async () => {
    if (!photo || !crop || busy) return;
    const operation = versionRef.current;
    setBusy("Saving your portable project…");
    setError("");
    try {
      const blob = await saveProject(photo, preset, crop, {
        paperId,
        background,
        format,
        dpi,
        sheet: view === "sheet",
        // Only head positions the user set (or face assist found) are saved, never the rough defaults.
        landmarks: landmarksSet && !isOriginal && landmarks ? landmarks : undefined,
        customSize:
          preset.mode === "general"
            ? { widthMm: customSize.widthMm, heightMm: customSize.heightMm }
            : undefined,
      });
      if (operation !== versionRef.current) return;
      downloadBlob(blob, "portraitpass.project.json");
      setStatus(
        "Project saved with your source photo and exact settings. Keep this file private.",
      );
    } catch (e) {
      if (operation === versionRef.current) setError(messageOf(e));
    } finally {
      if (operation === versionRef.current) setBusy("");
    }
  };
  const open = async (file: File) => {
    setBusy("Opening your project…");
    setError("");
    const version = ++versionRef.current;
    try {
      const result = await openProject(file);
      if (version !== versionRef.current) {
        releasePhoto(result.photo);
        return;
      }
      const p = PRESETS.find((item) => item.id === result.presetId)!;
      const restored = result as typeof result & {
        customSize?: { widthMm: number; heightMm: number };
        landmarks?: Landmarks;
      };
      // Everything below comes from the project. Nothing carries over from the
      // previous session, so an old custom size, DPI, paper or background cannot leak in.
      setCustomSize(
        restored.customSize
          ? {
              widthMm: restored.customSize.widthMm,
              heightMm: restored.customSize.heightMm,
            }
          : DEFAULT_CUSTOM,
      );
      setPresetId(result.presetId);
      setPaperId(result.paperId);
      setDpi(result.dpi);
      setView(result.sheet && p.mode !== "original" ? "sheet" : "single");
      setFormat(
        ["png", "jpeg", "pdf"].includes(result.format ?? "")
          ? (result.format as Format)
          : "jpeg",
      );
      setGuides(false);
      setManualGuides(false);
      acceptPhoto(
        result.photo,
        result.crop,
        withCustomSize(p, restored.customSize ?? DEFAULT_CUSTOM),
        restored.landmarks,
      );
      setBackground(p.mode === "original" ? undefined : result.background);
      setStatus("Project restored. Your photo stays on this device.");
    } catch (e) {
      if (version === versionRef.current) setError(messageOf(e));
    } finally {
      if (version === versionRef.current) setBusy("");
    }
  };
  const download = async () => {
    if (!photo || !crop || busy) return;
    const operation = versionRef.current;
    setBusy(
      isOriginal ? "Preparing your original file…" : "Preparing your download…",
    );
    setError("");
    try {
      const result = await exportPhoto(photo, preset, crop, {
        format,
        dpi,
        sheet: view === "sheet",
        paperId,
        background: isOriginal ? undefined : background,
      });
      if (operation !== versionRef.current) return;
      downloadBlob(result.blob, result.filename);
      setExported(true);
      setStatus(
        isOriginal
          ? "Your original file was downloaded without edits."
          : "Your photo is ready. Print at actual size, with scaling turned off.",
      );
    } catch (e) {
      if (operation === versionRef.current) setError(messageOf(e));
    } finally {
      if (operation === versionRef.current) setBusy("");
    }
  };
  const changeBackground = async (color: string | undefined) => {
    if (!color) {
      setBackground(undefined);
      setExported(false);
      return;
    }
    if (!photo || busy) return;
    const operation = versionRef.current;
    setBusy("Preparing the background, on your device…");
    setError("");
    try {
      await prepareBackground(photo);
      if (operation !== versionRef.current) return;
      setBackground(color);
      setExported(false);
    } catch (e) {
      if (operation === versionRef.current) setError(messageOf(e));
    } finally {
      if (operation === versionRef.current) setBusy("");
    }
  };
  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy)
      void (file.name.endsWith(".json") ? open(file) : importFile(file));
  };
  const adjustPosition = (axis: "x" | "y", percent: number) => {
    const current = cropRef.current;
    if (!current || !photo) return;
    liveCrop({
      ...current,
      [axis]:
        ((axis === "x"
          ? photo.width - current.width
          : photo.height - current.height) *
          percent) /
        100,
    });
  };
  /** Re-base the gesture on the pointers now down, so adding or lifting a finger never jumps. */
  const anchorPointers = (canvas: HTMLCanvasElement) => {
    const points = [...pointersRef.current.values()];
    const current = cropRef.current;
    if (!points.length || !current) {
      anchorRef.current = null;
      return;
    }
    anchorRef.current = {
      crop: current,
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      dist:
        points.length > 1
          ? Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y)
          : 0,
      width: canvas.getBoundingClientRect().width || 1,
    };
  };
  const movePointers = () => {
    const anchor = anchorRef.current;
    if (!anchor || !photo || busy) return;
    const points = [...pointersRef.current.values()];
    if (!points.length) return;
    const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    let next = anchor.crop;
    if (points.length > 1 && anchor.dist > 0 && baseCrop) {
      const dist = Math.hypot(
        points[0]!.x - points[1]!.x,
        points[0]!.y - points[1]!.y,
      );
      // Spreading the fingers zooms in, up to the same 300% the slider allows.
      const factor = Math.min(
        Math.max(0.05, dist / anchor.dist),
        anchor.crop.width / (baseCrop.width / 3),
      );
      next = zoomCrop(anchor.crop, factor, photo.width, photo.height);
    }
    const scale = next.width / anchor.width;
    liveCrop(
      clampCrop(
        {
          ...next,
          x: next.x - (x - anchor.x) * scale,
          y: next.y - (y - anchor.y) * scale,
        },
        photo.width,
        photo.height,
      ),
    );
  };
  const releasePointer = (id: number, canvas: HTMLCanvasElement) => {
    if (!pointersRef.current.delete(id)) return;
    if (pointersRef.current.size === 0) {
      anchorRef.current = null;
      commitGesture();
    } else anchorPointers(canvas);
  };
  const canvasKey = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!crop || !photo || isOriginal || view === "sheet" || busy) return;
    const factor = event.shiftKey ? 15 : 3;
    const diff: Record<string, [number, number]> = {
      ArrowLeft: [-factor, 0],
      ArrowRight: [factor, 0],
      ArrowUp: [0, -factor],
      ArrowDown: [0, factor],
    };
    if (diff[event.key]) {
      event.preventDefault();
      const [x, y] = diff[event.key]!;
      const current = cropRef.current ?? crop;
      liveCrop(
        clampCrop(
          { ...current, x: current.x + x, y: current.y + y },
          photo.width,
          photo.height,
        ),
      );
      settleSoon();
    }
  };
  const updateLandmark = (key: keyof Landmarks, value: number) => {
    if (!landmarks || !photo) return;
    const moved = {
      ...landmarks,
      [key]: (value / 100) * (key === "centerX" ? photo.width : photo.height),
    };
    // Crown stays above the eyes and the eyes above the chin, so Fit can never fail on order.
    setLandmarks(
      key === "centerX"
        ? moved
        : orderLandmarks(moved, photo.height, key),
    );
    setLandmarksSet(true);
    setExported(false);
  };
  const applyLandmarks = () => {
    if (!photo || !landmarks) return;
    try {
      if (!landmarksValid(landmarks, photo.width, photo.height))
        throw new Error(
          "Place crown, eyes and chin in that order inside the photo.",
        );
      setNextCrop(
        cropFromLandmarks(photo.width, photo.height, preset, landmarks),
      );
      setLandmarksSet(true);
      setStatus(
        "Head guides applied. Check the crown, eyes and chin against your photo.",
      );
      setError("");
    } catch (e) {
      setError(messageOf(e));
    }
  };
  const formatSize = `${preset.widthMm} × ${preset.heightMm} mm`;
  const backgroundNote = isOriginal ? null : backgroundWarning(preset);
  const printNotes = isOriginal
    ? []
    : (preset.notes ?? []).filter((note) => /print/i.test(note));

  return (
    <div
      className={`app${dark ? " dark" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={drop}
    >
      <a className="skip-link" href="#main">
        Skip to studio
      </a>
      <header className="site-header">
        <Logo />
        <nav className="site-nav" aria-label="Main navigation">
          <a className="nav-about" href="/about/">
            About
          </a>
          <a className="header-support" href={SUPPORT_URL}>
            <Heart size={13} /> Support the studio
          </a>
          <button
            className="icon-button"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </nav>
      </header>
      <div className="header-rule" />
      <input
        ref={fileRef}
        disabled={!!busy}
        type="file"
        className="input-hidden"
        aria-label="Choose a photo"
        accept={fileAccept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={projectRef}
        disabled={!!busy}
        type="file"
        className="input-hidden"
        aria-label="Open a PortraitPass project"
        accept=".json,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void open(file);
          event.target.value = "";
        }}
      />
      {error && (
        <div className="notice error" role="alert">
          <X size={15} />
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={13} />
          </button>
        </div>
      )}
      {status && (
        <div className="notice" role="status">
          <Check size={15} />
          <span>{status}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setStatus("")}
          >
            <X size={13} />
          </button>
        </div>
      )}
      {path === "/support/" ? (
        <SupportPage />
      ) : path === "/about/" ? (
        <AboutPage />
      ) : path === "/privacy/" ? (
        <PrivacyPage />
      ) : path === "/terms/" ? (
        <TermsPage />
      ) : path === "/accessibility/" ? (
        <AccessibilityPage />
      ) : (
        <main id="main">
          {!photo ? (
            <>
              <section className="intro">
                <div>
                  <div className="eyebrow">Free, in your browser</div>
                  {keyword ? (
                    <h1 className="keyword-h1">
                      {keyword.h1[0]} <br />
                      <em>{keyword.h1[1]}</em>
                    </h1>
                  ) : (
                    <>
                      <h1>
                        Places to go.
                        <br />
                        <em>A photo to match.</em>
                      </h1>
                      <h2 className="intro-sub">
                        Free passport photo maker, sized exactly
                      </h2>
                    </>
                  )}
                  <p className="intro-copy">
                    Your next chapter starts here. Prepare a precisely sized
                    passport or ID photo, right in your browser.
                  </p>
                  <div
                    className={`upload-box${dragging ? " dragging" : ""}`}
                    onDragEnter={() => setDragging(true)}
                    onDragLeave={() => setDragging(false)}
                  >
                    <button
                      className="primary"
                      disabled={!!busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImagePlus size={18} /> Bring your photo{" "}
                      <ArrowRight size={17} />
                    </button>
                    <p className="upload-hint">
                      or drop it here / paste from your clipboard
                      <br />
                      JPG, PNG, WebP or HEIC · up to 20 MB
                    </p>
                  </div>
                  <div className="upload-extra">
                    <button
                      className="text-button"
                      onClick={() => void sample()}
                      disabled={!!busy}
                    >
                      Try a sample <ArrowRight size={13} />
                    </button>
                    <span>or</span>
                    <button
                      className="text-button"
                      onClick={() => projectRef.current?.click()}
                      disabled={!!busy}
                    >
                      Open a project
                    </button>
                  </div>
                  <div className="privacy-line">
                    <LockKeyhole size={13} /> Your photo stays on your device.
                    Always.
                  </div>
                </div>
                <div
                  className="portrait-scene"
                  aria-label="A synthetic sample portrait in a printed photo proof"
                >
                  <span className="eyebrow scene-heading">
                    The portrait studio
                  </span>
                  <span className="scene-number">No. 001</span>
                  <div className="dimension-line">
                    <span>PRECISELY YOUR SIZE</span>
                  </div>
                  <div className="ghost-proof" />
                  <div className="photo-proof">
                    <img
                      src="/demo-portrait.webp"
                      fetchPriority="high"
                      decoding="async"
                      alt="Synthetic demo portrait of a fictional person"
                      width="220"
                      height="272"
                    />
                    <div className="proof-footer">
                      <span>SYNTHETIC DEMO</span>
                      <span>PORTRAIT / 001</span>
                    </div>
                  </div>
                  <div className="scene-tag">
                    READY FOR YOUR<strong>next chapter.</strong>PRINT · CUT · GO
                  </div>
                  <div className="scene-bottom">
                    <span>LOCAL. PRIVATE. YOURS.</span>
                    <span>SYNTHETIC DEMO</span>
                  </div>
                </div>
              </section>
              <div className="format-strip">
                <span>
                  Familiar formats.
                  <br />
                  Thoughtfully prepared.
                </span>
                <div className="format-item">
                  <i className="format-outline square" />
                  <div>
                    <strong>United States</strong>
                    <small>2 × 2 inches</small>
                  </div>
                </div>
                <div className="format-item">
                  <i className="format-outline" />
                  <div>
                    <strong>United Kingdom</strong>
                    <small>35 × 45 mm</small>
                  </div>
                </div>
                <div className="format-item">
                  <i className="format-outline" />
                  <div>
                    <strong>Australia</strong>
                    <small>35 × 45 mm</small>
                  </div>
                </div>
                <div className="format-item">
                  <Maximize size={23} strokeWidth={1} />
                  <div>
                    <strong>Your own format</strong>
                    <small>Custom dimensions</small>
                  </div>
                </div>
              </div>
              <section className="how-section" aria-label="How it works">
                <h2 className="how-title">
                  A little care.{" "}
                  <br />A better photo.
                </h2>
                <div className="how-step">
                  <span className="step-index">01</span>
                  <h3>Bring your best original.</h3>
                  <p>
                    Face the camera in even light. Choose a plain background and
                    a natural expression.
                  </p>
                </div>
                <div className="how-step">
                  <span className="step-index">02</span>
                  <h3>Find the right fit.</h3>
                  <p>
                    Choose your document. Position your photo with clear,
                    measurable head guides.
                  </p>
                </div>
                <div className="how-step">
                  <span className="step-index">03</span>
                  <h3>Make your next move.</h3>
                  <p>
                    Download a single photo or a precise print sheet. No signup.
                    No watermark.
                  </p>
                </div>
              </section>
            </>
          ) : (
            <section className="studio" aria-label="Photo preparation studio">
              <div className="studio-heading">
                <div>
                  <div className="eyebrow">Your private portrait studio</div>
                  <h1>
                    {keyword
                      ? `${keyword.h1[0]} ${keyword.h1[1]}`
                      : "A good fit for what’s next."}
                  </h1>
                </div>
                <div className="studio-top-actions">
                  <button
                    className="secondary"
                    disabled={!!busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus size={14} /> Change photo
                  </button>
                  <button
                    className="secondary"
                    disabled={!!busy}
                    onClick={() => void save()}
                  >
                    <FileDown size={14} /> Save project
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Start over"
                    disabled={!!busy}
                    onClick={startOver}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="workspace">
                <aside
                  className="control-panel left"
                  aria-label="Photo settings"
                >
                  <section>
                    <div className="panel-heading">
                      <span className="step-dot">1</span> The right document
                    </div>
                    <label className="field-label" htmlFor="document-preset">
                      Photo format
                    </label>
                    <select
                      id="document-preset"
                      className="select"
                      value={presetId}
                      disabled={!!busy}
                      onChange={(event) => selectPreset(event.target.value)}
                    >
                      <optgroup label="Printed photographs">
                        {PRESETS.filter((item) => item.mode === "print").map(
                          (item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={!heicFits(item)}
                            >
                              {item.name}
                            </option>
                          ),
                        )}
                      </optgroup>
                      <optgroup label="Digital application originals">
                        {PRESETS.filter((item) => item.mode === "original").map(
                          (item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={!heicFits(item)}
                            >
                              {item.name}
                            </option>
                          ),
                        )}
                      </optgroup>
                      <optgroup label="Other uses">
                        <option
                          value="general-id"
                          disabled={
                            !heicFits(PRESETS.find((item) => item.id === "general-id")!)
                          }
                        >
                          General ID · custom
                        </option>
                      </optgroup>
                      <optgroup label="Can’t be made at home">
                        {DOCUMENT_NOTICES.map((item) => (
                          <option key={item.id} value={item.id} disabled>
                            {item.name} · not available
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {heicPhoto && (
                      <p className="fine-print" id="heic-hint">
                        HEIC photos work with US renewal · original only. For prints and other documents, use a JPEG.
                      </p>
                    )}
                    {!isOriginal ? (
                      <>
                        <div className="spec-summary">
                          <div className="mini-frame" />
                          <div>
                            <strong>
                              {preset.id === "us-passport"
                                ? "2 × 2 inches"
                                : formatSize}
                            </strong>
                            <small>
                              {size.width} × {size.height} px · {dpi} DPI
                            </small>
                          </div>
                        </div>
                        {preset.mode === "general" && (
                          <div className="custom-size-fields">
                            <label className="field-label">
                              Width (mm)
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={!!busy}
                                value={customDraft.widthMm}
                                onChange={(event) =>
                                  setCustomDraft((draft) => ({
                                    ...draft,
                                    widthMm: event.target.value,
                                  }))
                                }
                                onBlur={() => commitCustom("widthMm")}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter")
                                    event.currentTarget.blur();
                                }}
                              />
                            </label>
                            <label className="field-label">
                              Height (mm)
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={!!busy}
                                value={customDraft.heightMm}
                                onChange={(event) =>
                                  setCustomDraft((draft) => ({
                                    ...draft,
                                    heightMm: event.target.value,
                                  }))
                                }
                                onBlur={() => commitCustom("heightMm")}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter")
                                    event.currentTarget.blur();
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="spec-summary">
                        <ShieldCheck size={27} strokeWidth={1} />
                        <div>
                          <strong>Original, unchanged</strong>
                          <small>
                            {photo.width && photo.height
                              ? `${photo.width} × ${photo.height} px`
                              : "Size not readable in this browser"}
                          </small>
                        </div>
                      </div>
                    )}
                    <p className="fine-print">{preset.editingPolicy}</p>
                    {preset.notes && preset.notes.length > 0 && (
                      <ul className="preset-notes" aria-label="Notes for this document">
                        {preset.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                    {preset.sourceUrl && (
                      <>
                        <a
                          className="source-link"
                          href={preset.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {sourceLabel(preset)} <ExternalLink size={10} />
                        </a>
                        <p className="fine-print">
                          Requirements checked {preset.checkedAt}.
                        </p>
                      </>
                    )}
                    <details className="doc-notices">
                      <summary>
                        Can’t be made at home ({DOCUMENT_NOTICES.length})
                      </summary>
                      <ul>
                        {DOCUMENT_NOTICES.map((item) => (
                          <li key={item.id}>
                            <strong>{item.name}.</strong> {item.reason}{" "}
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Source <ExternalLink size={9} />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </section>
                  <div className="control-divider" />
                  {!isOriginal ? (
                    <section>
                      <div className="panel-heading">
                        <span className="step-dot">2</span> A little adjustment
                      </div>
                      <Slider
                        disabled={!!busy}
                        label="Zoom"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.01}
                        display={`${Math.round(zoom * 100)}%`}
                        onCommit={commitGesture}
                        onChange={(value) => {
                          const current = cropRef.current;
                          if (photo && current)
                            liveCrop(
                              zoomCrop(
                                current,
                                baseCrop ? value / (baseCrop.width / current.width) : 1,
                                photo.width,
                                photo.height,
                              ),
                            );
                        }}
                      />
                      <Slider
                        disabled={!!busy}
                        label="Horizontal position"
                        value={
                          crop && photo.width > crop.width
                            ? (crop.x / (photo.width - crop.width)) * 100
                            : 50
                        }
                        onCommit={commitGesture}
                        onChange={(value) => adjustPosition("x", value)}
                      />
                      <Slider
                        disabled={!!busy}
                        label="Vertical position"
                        value={
                          crop && photo.height > crop.height
                            ? (crop.y / (photo.height - crop.height)) * 100
                            : 50
                        }
                        onCommit={commitGesture}
                        onChange={(value) => adjustPosition("y", value)}
                      />
                      <div className="controls-row">
                        <label className="check-control">
                          <input
                            type="checkbox"
                            disabled={!!busy}
                            checked={guides}
                            onChange={(event) =>
                              setGuides(event.target.checked)
                            }
                          />{" "}
                          Framing guide
                        </label>
                        <button
                          className="secondary small-button"
                          onClick={reset}
                          disabled={!!busy}
                        >
                          <RotateCcw size={11} /> Reset
                        </button>
                      </div>
                      <button
                        className="secondary assist-button"
                        onClick={() => void assist()}
                        disabled={!!busy}
                      >
                        <Sparkles size={12} />{" "}
                        {busy ? "Working…" : "Load local face assist"}
                      </button>
                      <p className="assist-label">{FACE_NOTICE}</p>
                      <p className="assist-label">
                        Optional · about 12 MB of local tools.
                        <br />
                        Proposes a crop. You make the final check.
                      </p>
                      <details
                        className="detail-control"
                        open={manualGuides}
                        style={{ marginTop: 17 }}
                        onToggle={(event) =>
                          setManualGuides(event.currentTarget.open)
                        }
                      >
                        <summary>
                          Manual head measurements <ChevronDown size={12} />
                        </summary>
                        {landmarks && (
                          <>
                            <Slider
                              disabled={!!busy}
                              label="Head centre"
                              value={(landmarks.centerX / photo.width) * 100}
                              onChange={(value) =>
                                updateLandmark("centerX", value)
                              }
                            />
                            <Slider
                              disabled={!!busy}
                              label="Crown from top"
                              value={(landmarks.crownY / photo.height) * 100}
                              onChange={(value) =>
                                updateLandmark("crownY", value)
                              }
                            />
                            <Slider
                              disabled={!!busy}
                              label="Eyes from top"
                              value={(landmarks.eyesY / photo.height) * 100}
                              onChange={(value) =>
                                updateLandmark("eyesY", value)
                              }
                            />
                            <Slider
                              disabled={!!busy}
                              label="Chin from top"
                              value={(landmarks.chinY / photo.height) * 100}
                              onChange={(value) =>
                                updateLandmark("chinY", value)
                              }
                            />
                            <button
                              className="secondary small-button"
                              style={{ width: "100%" }}
                              disabled={!!busy}
                              onClick={applyLandmarks}
                            >
                              Fit to these measurements
                            </button>
                            <p className="fine-print">
                              Positions are percentages of the original photo.
                              Crown, eyes and chin stay in that order. The
                              results appear under Measurements.
                            </p>
                          </>
                        )}
                      </details>
                    </section>
                  ) : (
                    <div className="digital-note">
                      <LockKeyhole size={18} />
                      <p>Online application? Keep your original.</p>
                      <span>
                        Cropping, print sheets and editing are disabled. Your
                        downloaded file will be byte-for-byte identical to the
                        source.
                      </span>
                    </div>
                  )}
                  {!isOriginal && (
                    <section>
                      <div className="panel-heading">Background</div>
                      <label className="check-control">
                        <input
                          type="checkbox"
                          checked={!!background}
                          disabled={!!busy}
                          aria-describedby={
                            backgroundNote ? "background-note" : undefined
                          }
                          onChange={(event) => {
                            void changeBackground(
                              event.target.checked ? "#ffffff" : undefined,
                            );
                          }}
                        />{" "}
                        Replace background locally
                      </label>
                      {backgroundNote && (
                        <p
                          id="background-note"
                          className={`background-note${preset.backgroundEdit === "forbidden" ? " warn" : ""}`}
                        >
                          <TriangleAlert size={12} aria-hidden="true" />
                          <span>{backgroundNote}</span>
                        </p>
                      )}
                      {background && (
                        <>
                          <div className="color-options">
                            {["#ffffff", "#eeeeee", "#dce9f5"].map((color) => (
                              <button
                                key={color}
                                aria-label={`Use ${color === "#ffffff" ? "white" : color === "#eeeeee" ? "light grey" : "light blue"} background`}
                                className={`color-option${background === color ? " active" : ""}`}
                                style={{ background: color }}
                                disabled={!!busy}
                                onClick={() => setBackground(color)}
                              />
                            ))}
                          </div>
                          <p className="fine-print">
                            Uses local portrait segmentation (~12 MB), loaded
                            only on request. Inspect hair and edges.
                          </p>
                        </>
                      )}
                    </section>
                  )}
                  <details className="tips">
                    <summary>Tips for a better original</summary>
                    <p>
                      Use soft, even light and a plain light background. Face
                      the camera straight on. Keep hair away from your eyes,
                      avoid shadows and filters, and follow your destination’s
                      expression, glasses and recency rules.
                    </p>
                  </details>
                </aside>
                <section className="stage" aria-label="Photo preview">
                  <div className="stage-toolbar">
                    <div
                      className="segmented"
                      role="group"
                      aria-label="Preview mode"
                    >
                      <button
                        className={view === "single" ? "active" : ""}
                        aria-pressed={view === "single"}
                        disabled={!!busy}
                        onClick={() => setView("single")}
                      >
                        {isOriginal ? "Original" : "Single photo"}
                      </button>
                      <button
                        className={view === "sheet" ? "active" : ""}
                        aria-pressed={view === "sheet"}
                        disabled={isOriginal || !!busy}
                        onClick={() => setView("sheet")}
                      >
                        Print sheet
                      </button>
                      <button
                        className={view === "compare" ? "active" : ""}
                        aria-pressed={view === "compare"}
                        disabled={!!busy || photo.bytesOnly}
                        onClick={() => setView("compare")}
                      >
                        Compare
                      </button>
                    </div>
                    <span className="stage-label">
                      <LockKeyhole size={10} /> On-device
                    </span>
                  </div>
                  <div className="preview-area">
                    <div
                      className={
                        view === "compare" ? "source-preview" : "preview-wrap"
                      }
                    >
                      {view === "compare" && (
                        <div>
                          <img
                            src={photo.url}
                            alt="Original source photograph"
                          />
                          <div className="preview-caption">Original</div>
                        </div>
                      )}
                      <div className="preview-wrap">
                        <div
                          className={`canvas-frame${isOriginal ? " digital" : ""}`}
                        >
                          <canvas
                            ref={canvasRef}
                            className={
                              !isOriginal && view !== "sheet" ? "interactive" : undefined
                            }
                            aria-label={
                              isOriginal
                                ? "Unedited original preview"
                                : view === "sheet"
                                  ? "Print sheet preview"
                                  : "Cropped photo preview. Drag or use arrow keys to position; hold Shift for larger steps."
                            }
                            tabIndex={0}
                            role="img"
                            onKeyDown={canvasKey}
                            onPointerDown={(event) => {
                              if (
                                !crop ||
                                isOriginal ||
                                view === "sheet" ||
                                busy ||
                                pointersRef.current.size >= 2
                              )
                                return;
                              try {
                                event.currentTarget.setPointerCapture(
                                  event.pointerId,
                                );
                              } catch {
                                /* Pointer already gone; the gesture still tracks moves. */
                              }
                              pointersRef.current.set(event.pointerId, {
                                x: event.clientX,
                                y: event.clientY,
                              });
                              anchorPointers(event.currentTarget);
                            }}
                            onPointerMove={(event) => {
                              if (!pointersRef.current.has(event.pointerId))
                                return;
                              pointersRef.current.set(event.pointerId, {
                                x: event.clientX,
                                y: event.clientY,
                              });
                              movePointers();
                            }}
                            onPointerUp={(event) =>
                              releasePointer(event.pointerId, event.currentTarget)
                            }
                            onPointerCancel={(event) =>
                              releasePointer(event.pointerId, event.currentTarget)
                            }
                            onLostPointerCapture={(event) =>
                              releasePointer(event.pointerId, event.currentTarget)
                            }
                          />
                          {manualGuides &&
                            landmarks &&
                            crop &&
                            !isOriginal &&
                            view !== "sheet" && (
                              <div
                                className="landmark-overlay"
                                aria-hidden="true"
                              >
                                {(
                                  [
                                    ["crownY", "Crown"],
                                    ["eyesY", "Eyes"],
                                    ["chinY", "Chin"],
                                  ] as const
                                ).map(([key, label]) => {
                                  const top =
                                    ((landmarks[key] - crop.y) / crop.height) *
                                    100;
                                  return top >= 0 && top <= 100 ? (
                                    <div
                                      className="landmark-line"
                                      key={key}
                                      style={{ top: `${top}%` }}
                                    >
                                      <span>{label}</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            )}
                        </div>
                        <div className="preview-caption">
                          {view === "sheet"
                            ? `${PAPERS.find((p) => p.id === paperId)?.name} paper · ${sheet?.placements.length ?? 0} photos`
                            : isOriginal
                              ? "Your original file · no edits"
                              : `${formatSize} · print dimensions`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="stage-footer">
                    <span>
                      {!isOriginal && view !== "sheet" ? (
                        <>
                          <Move size={11} /> Drag photo to position
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={11} />{" "}
                          {isOriginal
                            ? "Original bytes preserved"
                            : "Print at 100% / actual size"}
                        </>
                      )}
                    </span>
                    {photo.isDemo ? (
                      <span className="demo-badge">
                        Synthetic demo · not for applications
                      </span>
                    ) : (
                      <span>
                        {photo.name.length > 30
                          ? photo.name.slice(0, 27) + "…"
                          : photo.name}
                      </span>
                    )}
                  </div>
                </section>
                <aside
                  className="control-panel right"
                  aria-label="Download settings"
                >
                  <section>
                    <div className="panel-heading">
                      <span className="step-dot">3</span> Ready when you are
                    </div>
                    {!isOriginal && (
                      <>
                        <label className="field-label" htmlFor="paper-format">
                          Paper size
                        </label>
                        <select
                          className="select"
                          id="paper-format"
                          value={paperId}
                          disabled={!!busy}
                          onChange={(event) => {
                            setPaperId(event.target.value);
                            setView("sheet");
                            setExported(false);
                          }}
                        >
                          {PAPERS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <div className="download-summary">
                      <strong>
                        {isOriginal
                          ? "As you took it."
                          : view === "sheet"
                            ? `${sheet?.placements.length ?? 0} little possibilities.`
                            : "One perfect size."}
                      </strong>
                      <p>
                        {isOriginal
                          ? "The original file, ready for the application’s own positioning tool."
                          : view === "sheet"
                            ? `A ${PAPERS.find((p) => p.id === paperId)?.name} sheet, with precise cut marks and room at the edges.`
                            : `A ${formatSize} photo, rendered at ${dpi} DPI without stretching.`}
                      </p>
                    </div>
                  </section>
                  <section>
                    {!isOriginal && (
                      <>
                        <label className="field-label" htmlFor="print-density">
                          Print resolution
                        </label>
                        <select
                          id="print-density"
                          className="select"
                          disabled={!!busy}
                          value={dpi}
                          style={{ marginBottom: 14 }}
                          onChange={(event) => {
                            setDpi(Number(event.target.value));
                            setExported(false);
                          }}
                        >
                          {![300, 600].includes(dpi) && (
                            <option value={dpi}>{dpi} DPI (project)</option>
                          )}
                          <option value={300}>300 DPI · standard print</option>
                          <option value={600}>600 DPI · fine print</option>
                        </select>
                        <span className="field-label">Download format</span>
                        <div
                          className="format-choices"
                          role="group"
                          aria-label="Download file type"
                        >
                          {(["jpeg", "png", "pdf"] as Format[]).map((item) => (
                            <button
                              key={item}
                              disabled={!!busy}
                              className={format === item ? "active" : ""}
                              aria-pressed={format === item}
                              onClick={() => {
                                setFormat(item);
                                setExported(false);
                              }}
                            >
                              {item === "jpeg" ? "JPG" : item.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button
                      className="primary download-button"
                      disabled={
                        !!busy ||
                        issues.length > 0 ||
                        (view === "sheet" && !sheet)
                      }
                      onClick={() => void download()}
                    >
                      <ArrowDownToLine size={15} />
                      {isOriginal
                        ? "Download original"
                        : view === "sheet"
                          ? "Download print sheet"
                          : "Download photo"}
                    </button>
                    <p className="fine-print download-note">{DOWNLOAD_NOTE}</p>
                    {issues.map((issue) => (
                      <p
                        key={issue.code}
                        className="fine-print"
                        style={{ color: "var(--accent)" }}
                      >
                        {issue.message}
                      </p>
                    ))}
                    {background && !isOriginal && preset.backgroundEdit === "forbidden" && (
                      <p className="export-warning">
                        <TriangleAlert size={12} aria-hidden="true" />
                        <span>
                          Background edited — not accepted for {preset.name}.
                        </span>
                      </p>
                    )}
                    {background && !isOriginal && preset.backgroundEdit === "unspecified" && (
                      <p className="export-warning">
                        <TriangleAlert size={12} aria-hidden="true" />
                        <span>
                          Background edited. Check that the receiver accepts
                          this for {preset.name}.
                        </span>
                      </p>
                    )}
                    {printNotes.map((note) => (
                      <p key={note} className="fine-print print-note">
                        {note}
                      </p>
                    ))}
                    <p className="fine-print" style={{ textAlign: "center" }}>
                      Free. No watermark. No account.
                    </p>
                    {exported && (
                      <div className="export-success" role="status">
                        <strong>
                          <Check size={12} /> Your download is ready.
                        </strong>
                        Tips keep this little studio free.
                        <a className="support-inline" href={SUPPORT_URL}>
                          Leave a tip <Heart size={11} />
                        </a>
                      </div>
                    )}
                  </section>
                  {!isOriginal && checks.length > 0 && (
                    <>
                      <div className="control-divider" />
                      <section
                        className="check-section"
                        aria-label="Measurements"
                      >
                        <div className="panel-heading">Measurements</div>
                        <ul className="measure-list">
                          {checks.map((check) => {
                            const value = checkValue(check),
                              range = checkRange(check);
                            const Icon =
                              check.status === "pass"
                                ? Check
                                : check.status === "fail"
                                  ? X
                                  : HelpCircle;
                            return (
                              <li
                                key={check.id}
                                className={`measure ${check.status}`}
                                data-check={check.id}
                              >
                                <Icon size={12} aria-hidden="true" />
                                <div>
                                  <div className="measure-line">
                                    <span className="measure-label">
                                      {CHECK_LABELS[check.id]}
                                    </span>
                                    <span className="measure-status">
                                      {statusWord(check)}
                                    </span>
                                  </div>
                                  {(value || range) && (
                                    <div className="measure-values">
                                      {value}
                                      {value && range ? " · " : ""}
                                      {range && `allowed ${range}`}
                                    </div>
                                  )}
                                  {(check.status !== "pass" ||
                                    check.id === "resolution") && (
                                    <div className="measure-message">
                                      {check.message}
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="fine-print">
                          Measured from the head positions you set or face
                          assist found. Check them against your photo.
                        </p>
                      </section>
                    </>
                  )}
                  <div className="control-divider" />
                  <section className="check-section">
                    <div className="panel-heading">One last look</div>
                    <ul className="review-list">
                      <li>
                        <Check size={12} />
                        <span>Check head position, eyes and expression.</span>
                      </li>
                      <li>
                        <Check size={12} />
                        <span>Look for shadows and an even background.</span>
                      </li>
                      <li>
                        <Check size={12} />
                        <span>
                          Check the issuing authority’s current photo rules.
                        </span>
                      </li>
                      {!isOriginal && (
                        <li>
                          <Check size={12} />
                          <span>
                            Print at actual size. Measure before cutting.
                          </span>
                        </li>
                      )}
                    </ul>
                    <p className="fine-print">
                      These are reminders for you to check. The issuing authority
                      decides acceptance.
                    </p>
                  </section>
                </aside>
              </div>
              <div className="studio-bottom">
                <span>
                  <LockKeyhole size={11} /> Your photo is processed in this
                  browser. Nothing is uploaded.
                </span>
                <span>
                  <button
                    className="text-button"
                    disabled={
                      (!history.length && !gestureOpen) || !!busy || isOriginal
                    }
                    onClick={undo}
                  >
                    <RotateCcw size={11} /> Undo position
                  </button>
                  <span style={{ margin: "0 7px" }}>·</span>
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() => projectRef.current?.click()}
                  >
                    <FolderOpen size={11} /> Open project
                  </button>
                </span>
              </div>
            </section>
          )}
          {keyword && (
            <section className="keyword-note">
              <h2>{keyword.title}</h2>
              <p>{keyword.description}</p>
              <a
                className="source-link"
                target="_blank"
                rel="noreferrer"
                href={
                  PRESETS.find((item) => item.id === keyword.preset)!.sourceUrl
                }
              >
                {sourceLabel(PRESETS.find((item) => item.id === keyword.preset)!)}{" "}
                <ExternalLink size={11} />
              </a>
            </section>
          )}
        </main>
      )}
      <footer className="site-footer">
        <span className="footer-signature">
          <LockKeyhole size={12} /> A little studio. Entirely yours.
        </span>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="/about/">About</a>
          <a href="/privacy/">Privacy</a>
          <a href="/terms/">Terms</a>
          <a href="/accessibility/">Accessibility</a>
          <a href={SUPPORT_URL}>Support</a>
          <a href="/llms.txt">For agents</a>
          <a href="/us-passport-photo/">Photo formats</a>
        </nav>
        <p className="footer-legal">{DISCLAIMER}</p>
      </footer>
      {busy && (
        <div className="busy-indicator" role="status">
          <LoaderCircle size={15} className="spin" />
          {busy}
        </div>
      )}
    </div>
  );
}

function SupportPage() {
  return (
    <main id="main" className="content-page">
      <a className="text-button" href="/">
        <ArrowLeft size={13} /> Back to the studio
      </a>
      <div className="eyebrow" style={{ marginTop: 35 }}>
        Tips are optional
      </div>
      <h1>
        Keep a good
        <br />
        <em>little thing going.</em>
      </h1>
      <p className="lede">
        PortraitPass is free, private, and open source. Every photo, every
        format, every export. If it made your day a little easier, you can help
        keep the studio going.
      </p>
      <div className="support-main">
        <a
          className="primary"
          href={DONATION_LINKS.once}
          target="_blank"
          rel="noreferrer"
        >
          <Heart size={16} /> Leave a one-time tip{" "}
          <ArrowRight size={15} />
        </a>
      </div>
      <p>Choose your own amount. Tips are always optional.</p>
      <div className="content-rule" />
      <h2>Monthly tips</h2>
      <div className="support-tiers">
        {DONATION_LINKS.monthly.map((tier) => (
          <a
            className="support-tier"
            key={tier.label}
            href={tier.href}
            target="_blank"
            rel="noreferrer"
          >
            <span>{tier.note}</span>
            <strong>
              {tier.label}
              <small style={{ fontSize: 14 }}> / mo</small>
            </strong>
            <span>
              Support monthly <ArrowRight size={12} />
            </span>
          </a>
        ))}
      </div>
      <p>
        Tips support the maker’s open-source work. They don’t unlock features
        and have no effect on any photo. Stripe handles payments under its own
        privacy policy; your photos never go there. See the{" "}
        <a href="/privacy/">privacy page</a>.
      </p>
    </main>
  );
}
function AboutPage() {
  return (
    <main id="main" className="content-page">
      <a className="text-button" href="/">
        <ArrowLeft size={13} /> Back to the studio
      </a>
      <div className="eyebrow" style={{ marginTop: 35 }}>
        About PortraitPass
      </div>
      <h1>
        A little studio.
        <br />
        <em>Entirely yours.</em>
      </h1>
      <p className="lede">
        A passport photo is a small part of a big moment. PortraitPass helps you
        prepare it with clear dimensions, careful positioning and a print sheet
        you can understand.
      </p>
      <h2>Your photo stays with you.</h2>
      <p>
        Your source photo lives in this browser’s memory. It is never uploaded,
        and closing the page clears it. The{" "}
        <a href="/privacy/">privacy page</a> has the details: what the host
        logs, why there are no cookies or analytics, how face detection stays on
        your device, and what a saved project file contains.
      </p>
      <h2>Careful preparation. Honest limits.</h2>
      <p>
        Photo dimensions and head measurements can be calculated. Whether a
        photograph meets an authority’s full requirements still needs a person’s
        review. Check the rules linked beside each document; they change.
        PortraitPass checks sizes and positions, and the issuing authority
        decides acceptance. It gives no guarantee. Some documents, such as
        Canadian and German passports, cannot be made at home and are listed as
        such.
      </p>
      <p>
        Print modes preserve your appearance unless you turn on background
        replacement yourself. For documents whose rules forbid edited photos,
        that option is off by default and carries a warning. Digital-original
        modes preserve the exact original bytes and never edit anything.
      </p>
      <h2>Open to people and their agents.</h2>
      <p>
        The same deterministic geometry powers this studio, a local command line
        tool and a local MCP server. Projects are portable, versioned JSON. An
        agent can prepare the settings and hand the file to you for a final
        look.
      </p>
      <p>
        <a href="/llms.txt">Read the agent guide</a> or{" "}
        <a href={SUPPORT_URL}>leave a tip</a>. See also the{" "}
        <a href="/terms/">terms</a> and{" "}
        <a href="/accessibility/">accessibility statement</a>.
      </p>
      <div className="keyword-links">
        {Object.entries(keywordPages).map(([url, page]) => (
          <a href={url} key={url}>
            {page.h1[0]} {page.h1[1]}
          </a>
        ))}
      </div>
    </main>
  );
}
