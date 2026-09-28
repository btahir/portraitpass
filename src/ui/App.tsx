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
  ImagePlus,
  LockKeyhole,
  Maximize,
  Moon,
  Move,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
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
  headMeasurement,
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
  saveProject,
  openProject,
  type LoadedPhoto,
} from "../browser/engine";
import { SUPPORT_URL, DONATION_LINKS } from "../config";
import "./styles.css";

type View = "single" | "sheet" | "compare";
type Format = "jpeg" | "png" | "pdf";
const keywordPages: Record<
  string,
  { title: string; description: string; preset: string; sheet?: boolean }
> = {
  "/us-passport-photo/": {
    title: "US passport photos, at 2 × 2 inches.",
    description:
      "Prepare a square 2 × 2 inch photo with visible head guides and a 600 × 600 pixel export at 300 DPI. Keep your natural appearance, use an appropriate original photograph, and check the current State Department instructions before printing.",
    preset: "us-passport",
  },
  "/uk-passport-photo/": {
    title: "A properly sized UK passport print.",
    description:
      "Make a 35 × 45 mm printed photo with crown-to-chin guides for the UK’s 29–34 mm head range. Applying online? Select UK passport · original to keep your file unedited: the UK says not to crop digital application photos.",
    preset: "uk-passport",
  },
  "/35x45-photo/": {
    title: "Your photo. Exactly 35 × 45 mm.",
    description:
      "Prepare a 35 × 45 mm photograph without stretching the image. Choose a verified document format or general ID, then position your photo and export at 300 DPI. Dimensions alone do not establish whether a photo meets the receiving organisation’s requirements.",
    preset: "uk-passport",
  },
  "/passport-photo-print-sheet/": {
    title: "A print sheet that makes sense.",
    description:
      "Arrange precisely sized passport photos on 4 × 6 inch paper with safe margins and cut marks. Download a PDF with an exact physical page size, then print at 100% or actual size. Turn off “fit to page” and check the dimensions with a ruler.",
    preset: "us-passport",
    sheet: true,
  },
};
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
}: {
  disabled?: boolean;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, "-");
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
        onChange={(event) => onChange(Number(event.target.value))}
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
  const [customSize, setCustomSize] = useState({ widthMm: 35, heightMm: 45 });
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
    return p.mode === "general" ? { ...p, ...customSize } : p;
  }, [presetId, customSize]);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [landmarks, setLandmarks] = useState<Landmarks | null>(null);
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<LoadedPhoto | null>(null);
  const cropRef = useRef<Crop | null>(null);
  const versionRef = useRef(0);
  const dragRef = useRef<{
    x: number;
    y: number;
    crop: Crop;
    scale: number;
  } | null>(null);
  cropRef.current = crop;
  const isOriginal = preset.mode === "original";
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
    photo && crop
      ? cropIssues(crop, photo.width, photo.height, preset, dpi)
      : [];
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
      (preset.minWidth && photo.width < preset.minWidth) ||
      (preset.minHeight && photo.height < preset.minHeight)
    )
      issues.push({
        code: "DIMENSIONS",
        message: `Original must be at least ${preset.minWidth} × ${preset.minHeight} pixels.`,
      });
  }
  const measurement =
    crop && landmarks && !isOriginal
      ? headMeasurement(crop, preset, landmarks)
      : null;
  const baseCrop = photo
    ? defaultCrop(photo.width, photo.height, preset)
    : null;
  const zoom = crop && baseCrop ? baseCrop.width / crop.width : 1;
  const setNextCrop = useCallback((next: Crop, remember = true) => {
    if (remember && cropRef.current)
      setHistory((previous) => [...previous.slice(-24), cropRef.current!]);
    setCrop(next);
    setExported(false);
  }, []);

  useEffect(() => {
    void warmExportTools().catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.style.background = dark ? "#13272e" : "#f7f6f0";
  }, [dark]);
  useEffect(
    () => () => {
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
      setCrop(nextCrop ?? defaultCrop(next.width, next.height, nextPreset));
      setLandmarks(
        nextLandmarks ?? {
          centerX: next.width / 2,
          crownY: next.height * 0.18,
          eyesY: next.height * 0.36,
          chinY: next.height * 0.63,
        },
      );
      setBackground(undefined);
      setError("");
      setStatus("");
      setExported(false);
      setHistory([]);
    },
    [preset],
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
        acceptPhoto(next);
      } catch (e) {
        if (version === versionRef.current) setError(messageOf(e));
      } finally {
        if (version === versionRef.current) setBusy("");
      }
    },
    [acceptPhoto],
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
  useEffect(() => {
    if (!photo || !crop || !canvasRef.current) return;
    try {
      renderPreview(canvasRef.current, photo, preset, crop, {
        paperId,
        dpi,
        sheet: view === "sheet" && !isOriginal,
        guides: guides && view !== "sheet" && !isOriginal,
        background,
      });
    } catch (e) {
      setError(messageOf(e));
    }
  }, [photo, crop, preset, paperId, view, guides, background, isOriginal, dpi]);

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
    const actual = next.mode === "general" ? { ...next, ...customSize } : next;
    setPresetId(id);
    if (photo) setCrop(defaultCrop(photo.width, photo.height, actual));
    if (next.mode === "original") setView("single");
    setBackground(undefined);
    setHistory([]);
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
      setCrop(defaultCrop(photo.width, photo.height, { ...preset, ...next }));
    setHistory([]);
    setExported(false);
    setError("");
  };
  const reset = () => {
    if (photo) {
      setNextCrop(defaultCrop(photo.width, photo.height, preset));
      setStatus("Position reset.");
    }
  };
  const undo = () => {
    const previous = history.at(-1);
    if (previous) {
      setCrop(previous);
      setHistory((items) => items.slice(0, -1));
      setExported(false);
    }
  };
  const startOver = () => {
    ++versionRef.current;
    if (photoRef.current) releasePhoto(photoRef.current);
    photoRef.current = null;
    setPhoto(null);
    setCrop(null);
    setLandmarks(null);
    setBackground(undefined);
    setHistory([]);
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
      setLandmarks(result.landmarks);
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
        landmarks: landmarks ?? undefined,
        customSize: preset.mode === "general" ? customSize : undefined,
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
      if (restored.customSize) setCustomSize(restored.customSize);
      setPresetId(result.presetId);
      setPaperId(result.paperId);
      setView(result.sheet ? "sheet" : "single");
      setDpi(result.dpi);
      if (["png", "jpeg", "pdf"].includes(result.format ?? ""))
        setFormat(result.format as Format);
      if (p.mode === "original") setView("single");
      acceptPhoto(result.photo, result.crop, p, restored.landmarks);
      setBackground(result.background);
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
        background,
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
    if (!crop || !photo) return;
    setNextCrop({
      ...crop,
      [axis]:
        ((axis === "x"
          ? photo.width - crop.width
          : photo.height - crop.height) *
          percent) /
        100,
    });
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
      setNextCrop(
        clampCrop(
          { ...crop, x: crop.x + x, y: crop.y + y },
          photo.width,
          photo.height,
        ),
      );
    }
  };
  const updateLandmark = (key: keyof Landmarks, value: number) => {
    if (!landmarks || !photo) return;
    setLandmarks({
      ...landmarks,
      [key]: (value / 100) * (key === "centerX" ? photo.width : photo.height),
    });
    setExported(false);
  };
  const applyLandmarks = () => {
    if (!photo || !landmarks) return;
    try {
      setNextCrop(
        cropFromLandmarks(photo.width, photo.height, preset, landmarks),
      );
      setStatus(
        "Head guides applied. Check the crown, eyes and chin against your photo.",
      );
      setError("");
    } catch (e) {
      setError(messageOf(e));
    }
  };
  const formatSize = `${preset.widthMm} × ${preset.heightMm} mm`;

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
            About & privacy
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
        accept="image/jpeg,image/png,image/webp"
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
      ) : (
        <main id="main">
          {!photo ? (
            <>
              <section className="intro">
                <div>
                  <div className="eyebrow">
                    A small photo. A world of possibility.
                  </div>
                  <h1>
                    Places to go.
                    <br />
                    <em>A photo to match.</em>
                  </h1>
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
                      JPG, PNG or WebP · up to 20 MB
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
                      <span>PORTRAIT / 001</span>
                      <span>SYNTHETIC DEMO</span>
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
                  A little care.
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
                  <h1>A good fit for what’s next.</h1>
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
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ),
                        )}
                      </optgroup>
                      <optgroup label="Digital application originals">
                        {PRESETS.filter((item) => item.mode === "original").map(
                          (item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ),
                        )}
                      </optgroup>
                      <optgroup label="Other uses">
                        <option value="general-id">General ID · custom</option>
                      </optgroup>
                    </select>
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
                            {photo.width} × {photo.height} px
                          </small>
                        </div>
                      </div>
                    )}
                    <p className="fine-print">{preset.editingPolicy}</p>
                    {preset.sourceUrl && (
                      <>
                        <a
                          className="official-link"
                          href={preset.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Official photo requirements <ExternalLink size={10} />
                        </a>
                        <p className="fine-print">
                          Requirements checked {preset.checkedAt}.
                        </p>
                      </>
                    )}
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
                        onChange={(value) =>
                          photo &&
                          crop &&
                          setNextCrop(
                            zoomCrop(
                              crop,
                              value / zoom,
                              photo.width,
                              photo.height,
                            ),
                          )
                        }
                      />
                      <Slider
                        disabled={!!busy}
                        label="Horizontal position"
                        value={
                          crop && photo.width > crop.width
                            ? (crop.x / (photo.width - crop.width)) * 100
                            : 50
                        }
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
                              Set crown, eyes and chin in order.
                              {measurement && (
                                <>
                                  {" "}
                                  Current head:{" "}
                                  {measurement.heightMm.toFixed(1)} mm
                                  {preset.headMinMm
                                    ? ` · target ${preset.headMinMm}–${preset.headMaxMm} mm`
                                    : ""}
                                  .
                                </>
                              )}
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
                  {preset.mode === "general" && (
                    <section>
                      <div className="panel-heading">
                        Background · general ID only
                      </div>
                      <label className="check-control">
                        <input
                          type="checkbox"
                          checked={!!background}
                          disabled={!!busy}
                          onChange={(event) => {
                            void changeBackground(
                              event.target.checked ? "#ffffff" : undefined,
                            );
                          }}
                        />{" "}
                        Replace background locally
                      </label>
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
                            only on request. Inspect hair and edges. Never used
                            for passport modes.
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
                        disabled={!!busy}
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
                                busy
                              )
                                return;
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              dragRef.current = {
                                x: event.clientX,
                                y: event.clientY,
                                crop,
                                scale:
                                  crop.width /
                                  event.currentTarget.getBoundingClientRect()
                                    .width,
                              };
                            }}
                            onPointerMove={(event) => {
                              const drag = dragRef.current;
                              if (!drag || busy) return;
                              setCrop(
                                clampCrop(
                                  {
                                    ...drag.crop,
                                    x:
                                      drag.crop.x -
                                      (event.clientX - drag.x) * drag.scale,
                                    y:
                                      drag.crop.y -
                                      (event.clientY - drag.y) * drag.scale,
                                  },
                                  photo.width,
                                  photo.height,
                                ),
                              );
                              setExported(false);
                            }}
                            onPointerUp={() => {
                              const drag = dragRef.current;
                              if (drag)
                                setHistory((items) => [
                                  ...items.slice(-24),
                                  drag.crop,
                                ]);
                              dragRef.current = null;
                            }}
                            onPointerCancel={() => {
                              dragRef.current = null;
                            }}
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
                          ? "The original file, ready for the official application’s own positioning tool."
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
                    {issues.map((issue) => (
                      <p
                        key={issue.code}
                        className="fine-print"
                        style={{ color: "var(--accent)" }}
                      >
                        {issue.message}
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
                        This little studio runs on support.
                        <a className="support-inline" href={SUPPORT_URL}>
                          Leave a little thank-you <Heart size={11} />
                        </a>
                      </div>
                    )}
                  </section>
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
                        <span>Review the official document requirements.</span>
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
                      These are reminders for you to check, not automatic
                      approval. Acceptance is decided by the issuing authority.
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
                    disabled={!history.length || !!busy || isOriginal}
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
                className="official-link"
                target="_blank"
                rel="noreferrer"
                href={
                  PRESETS.find((item) => item.id === keyword.preset)!.sourceUrl
                }
              >
                Read the official requirements <ExternalLink size={11} />
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
          <a href="/about/">About & privacy</a>
          <a href={SUPPORT_URL}>Support</a>
          <a href="/llms.txt">For agents</a>
          <a href="/us-passport-photo/">Photo formats</a>
        </nav>
        <span>PortraitPass · made for the next chapter.</span>
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
        A small thank-you goes a long way
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
          <Heart size={16} /> Leave a one-time thank-you{" "}
          <ArrowRight size={15} />
        </a>
      </div>
      <p>Choose your own amount. Support is always optional.</p>
      <div className="content-rule" />
      <h2>A little ongoing support</h2>
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
        These contributions support the maker’s open-source work. They don’t
        unlock features or buy photo approval. Stripe handles payments; your
        photos never go there.
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
        A tool that respects your likeness
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
        Your source photo lives in this browser’s memory. No account, upload,
        analytics, remote image processing or advertising. Closing the page
        clears the working photo. We only save a project when you ask us to;
        that project includes your photo, so keep it private.
      </p>
      <p>
        The app’s assets load from its own site. Optional face assistance and
        general-ID background segmentation load local model files only when
        requested. Inference stays on your device. Support links open Stripe
        only when you choose them.
      </p>
      <h2>Careful preparation. Honest limits.</h2>
      <p>
        Photo dimensions and head measurements can be calculated. Whether a
        photograph meets an authority’s full requirements still needs a person’s
        review. Check the official source linked beside each document.
        PortraitPass does not certify biometric compliance or guarantee
        acceptance.
      </p>
      <p>
        Passport print modes preserve your appearance. Digital-original modes
        preserve the exact original bytes. Background replacement is available
        only for general ID uses; it is never applied to passport exports.
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
        <a href={SUPPORT_URL}>support the studio</a>.
      </p>
      <div className="keyword-links">
        {Object.entries(keywordPages).map(([url, page]) => (
          <a href={url} key={url}>
            {page.title}
          </a>
        ))}
      </div>
    </main>
  );
}
