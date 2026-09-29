import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  Camera,
  Check,
  FileDown,
  FolderOpen,
  Heart,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  X,
} from "lucide-react";
import {
  DOCUMENTS,
  clampCrop,
  cropFromLandmarks,
  defaultCrop,
  documentPreset,
  getPreset,
  landmarksValid,
  measurementChecks,
  zoomCrop,
  type Crop,
  type Landmarks,
  type Preset,
} from "../../core/index";
import type { AnalysisBox, PhotoCheck } from "../../core/analysis";
import {
  HEIC_PRINT_MESSAGE,
  HEIC_UNSUPPORTED_MESSAGE,
  autoCrop,
  downloadBlob,
  getBackgroundMask,
  isHeifPhoto,
  loadDemo,
  loadPhoto,
  openProject,
  prepareBackground,
  releasePhoto,
  saveProject,
  warmExportTools,
  type LoadedPhoto,
} from "../../browser/engine";
import { analyzeLoadedPhoto } from "../../browser/analysis";
import { SUPPORT_URL } from "../../config";
import { DocumentPicker } from "../home/DocumentPicker";
import { NotDiyExplainer } from "../home/NotDiyExplainer";
import { fileChecks } from "../checks";
import { AdjustPrecisely } from "./AdjustPrecisely";
import { BackgroundControls } from "./BackgroundControls";
import { type StageView, zoomOf } from "./Canvas";
import { CheckDetails, Verdict, YouCheck, summarize } from "./ChecksPanel";
import { DocumentCard } from "./DocumentCard";
import { Intake as IntakePanel } from "./Intake";
import {
  DEFAULT_OUTPUT,
  OutputPanel,
  defaultStyle,
  effectiveTab,
  type OutputState,
} from "./OutputPanel";
import { Stage, type FrameNote } from "./Stage";
import { StepsRail } from "./StepsRail";
import type { Intake } from "./handoff";
import {
  faceNoticeSeen,
  messageOf,
  orderLandmarks,
  projectPreset,
  rememberFaceNotice,
  resolveDocument,
  roughLandmarks,
  sameCrop,
  withCustomSize,
} from "./lib";
import "./studio.css";

// The camera pulls in the live face detector; load it only when someone opens it.
const CameraCapture = lazy(() =>
  import("../camera/CameraCapture").then((m) => ({ default: m.CameraCapture })),
);

const DEFAULT_CUSTOM = { widthMm: 35, heightMm: 45 };
const COMMIT_DELAY = 450;
const HEIC_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const PLAIN_TYPES = "image/jpeg,image/png,image/webp";

export interface StudioProps {
  docId: string;
  intake: Intake | null;
  onIntakeDone(): void;
  onDocChange(id: string): void;
}

const presetKey = (p: Preset) => `${p.id}|${p.widthMm}x${p.heightMm}`;

export default function Studio({ docId, intake, onIntakeDone, onDocChange }: StudioProps) {
  const resolved = useMemo(() => resolveDocument(docId), [docId]);
  const { doc } = resolved;
  // A document that cannot be made at home has no frame; keep the last one so the hooks below stay steady.
  const lastPreset = useRef<Preset | undefined>(undefined);
  if (resolved.preset) lastPreset.current = resolved.preset;
  const basePreset = resolved.preset ?? lastPreset.current ?? getPreset("us-passport");

  const [customSize, setCustomSize] = useState(DEFAULT_CUSTOM);
  const [customDraft, setCustomDraft] = useState({ widthMm: "35", heightMm: "45" });
  useEffect(() => {
    setCustomDraft({
      widthMm: String(customSize.widthMm),
      heightMm: String(customSize.heightMm),
    });
  }, [customSize]);
  const preset = useMemo(() => withCustomSize(basePreset, customSize), [basePreset, customSize]);
  const key = presetKey(preset);
  const isOriginal = preset.mode === "original";

  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [landmarks, setLandmarks] = useState<Landmarks | null>(null);
  // False while the head positions are only rough defaults nobody has set.
  const [landmarksSet, setLandmarksSet] = useState(false);
  // What the detector found, in source pixels, and the segmentation mask once it has run. Memory only.
  const [faceBox, setFaceBox] = useState<AnalysisBox | undefined>();
  const [mask, setMask] = useState<HTMLCanvasElement | undefined>();
  const [output, setOutput] = useState<OutputState>(DEFAULT_OUTPUT);
  const outputTab = effectiveTab(doc, preset, output.tab);
  const patchOutput = useCallback((patch: Partial<OutputState>) => {
    setOutput((o) => ({ ...o, ...patch }));
    setExported(false);
  }, []);
  const [view, setView] = useState<StageView>("frame");
  const [guides, setGuides] = useState(true);
  const [background, setBackground] = useState<string | undefined>();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [frameNote, setFrameNote] = useState<FrameNote | null>(null);
  const [noticePending, setNoticePending] = useState(false);
  const [exported, setExported] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [canCamera, setCanCamera] = useState(false);
  const [photoChecks, setPhotoChecks] = useState<PhotoCheck[]>([]);
  const [history, setHistory] = useState<Crop[]>([]);
  const [gestureOpen, setGestureOpen] = useState(false);

  const historyRef = useRef<Crop[]>([]);
  // The crop as it was before the drag, wheel turn or key burst now in progress.
  const gestureRef = useRef<Crop | null>(null);
  const commitTimer = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<LoadedPhoto | null>(null);
  const cropRef = useRef<Crop | null>(null);
  const versionRef = useRef(0);
  const homeCropRef = useRef<Crop | null>(null);
  const cropKeyRef = useRef(key);
  const dragDepth = useRef(0);
  cropRef.current = crop;

  const heicPhoto = !!photo && isHeifPhoto(photo);
  // iOS Safari turns a HEIC into a JPEG unless the input lists it, which would break the print flow,
  // so HEIC is offered only where the selected document takes it as-is.
  const acceptsHeic = isOriginal && !!preset.mimeTypes?.includes("image/heic");
  const fileAccept = acceptsHeic ? HEIC_TYPES : PLAIN_TYPES;
  const baseCrop =
    photo && photo.width > 0 && photo.height > 0
      ? defaultCrop(photo.width, photo.height, preset)
      : null;
  const zoom = crop ? zoomOf(crop, baseCrop) : 1;

  const clearHistory = useCallback(() => {
    window.clearTimeout(commitTimer.current);
    gestureRef.current = null;
    historyRef.current = [];
    setGestureOpen(false);
    setHistory([]);
  }, []);
  /** Close the open gesture: one undo step for the whole drag, wheel turn or key burst. */
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
    setCanCamera(!!navigator.mediaDevices?.getUserMedia);
  }, []);
  useEffect(
    () => () => {
      window.clearTimeout(commitTimer.current);
      if (photoRef.current) releasePhoto(photoRef.current);
    },
    [],
  );

  /** Replace the photo. `nextPreset` is the frame the crop is built for. */
  const acceptPhoto = useCallback(
    (
      next: LoadedPhoto,
      nextPreset: Preset,
      opts: { crop?: Crop; landmarks?: Landmarks } = {},
    ) => {
      if (photoRef.current) releasePhoto(photoRef.current);
      photoRef.current = next;
      setPhoto(next);
      // A HEIC this browser cannot decode may not state its size; it is only ever passed through.
      const start = opts.crop ?? defaultCrop(next.width || 1, next.height || 1, nextPreset);
      cropRef.current = start;
      homeCropRef.current = start;
      cropKeyRef.current = presetKey(nextPreset);
      setCrop(start);
      setLandmarks(
        opts.landmarks
          ? orderLandmarks(opts.landmarks, next.height)
          : roughLandmarks(next.width, next.height),
      );
      setLandmarksSet(!!opts.landmarks);
      setFaceBox(undefined);
      setMask(getBackgroundMask(next));
      setPhotoChecks([]);
      setBackground(undefined);
      setView("frame");
      setError("");
      setStatus("");
      setFrameNote(null);
      setNoticePending(false);
      setExported(false);
      clearHistory();
    },
    [clearHistory],
  );

  /** Find the face on this device and frame the photo from it. */
  const frameFace = useCallback(
    async (target: LoadedPhoto, p: Preset, version: number) => {
      setBusy("Finding the face, on your device…");
      setError("");
      setFrameNote(null);
      try {
        const result = await autoCrop(target, p);
        if (version !== versionRef.current) return;
        setNextCrop(result.crop);
        homeCropRef.current = result.crop;
        setLandmarks(orderLandmarks(result.landmarks, target.height));
        setLandmarksSet(true);
        setFaceBox(result.face);
        setMask(getBackgroundMask(target));
        setFrameNote({ tone: "ok", text: "Auto-framed. Check the lines." });
      } catch (e) {
        if (version !== versionRef.current) return;
        setFrameNote({
          tone: "warn",
          text: `${messageOf(e)} Drag the photo to line the head up with the bands, or use Adjust precisely.`,
        });
      } finally {
        if (version === versionRef.current) setBusy("");
      }
    },
    [setNextCrop],
  );
  /** After a new photo: auto-frame if the person has seen the face notice, otherwise ask first. */
  const afterAccept = useCallback(
    async (target: LoadedPhoto, p: Preset, version: number) => {
      if (p.mode === "original" || target.bytesOnly || isHeifPhoto(target)) return;
      if (faceNoticeSeen()) await frameFace(target, p, version);
      else setNoticePending(true);
    },
    [frameFace],
  );

  const importFile = useCallback(
    async (file: File) => {
      if (resolved.notDiy) return;
      const version = ++versionRef.current;
      setBusy("Opening your photo…");
      setError("");
      try {
        const next = await loadPhoto(file);
        if (version !== versionRef.current) {
          releasePhoto(next);
          return;
        }
        let target = preset;
        if (isHeifPhoto(next) && !(preset.mode === "original" && preset.mimeTypes?.includes(next.mime))) {
          // HEIC is only ever passed through untouched, so only a digital-original document can use
          // it. Switch to the first one that takes this type; the crop is built for that document.
          const original = DOCUMENTS.map((d) => ({ d, p: documentPreset(d) })).find(
            (x) => x.p?.mode === "original" && x.p.mimeTypes?.includes(next.mime),
          );
          if (!original?.p) {
            releasePhoto(next);
            setError(next.bytesOnly ? HEIC_UNSUPPORTED_MESSAGE : HEIC_PRINT_MESSAGE);
            return;
          }
          target = original.p;
          acceptPhoto(next, target);
          onDocChange(original.d.id);
          setStatus(
            `${HEIC_PRINT_MESSAGE} Switched to ${original.d.name}, where the file is kept unchanged.`,
          );
          return;
        }
        acceptPhoto(next, target);
        setBusy("");
        await afterAccept(next, target, version);
      } catch (e) {
        if (version === versionRef.current) setError(messageOf(e));
      } finally {
        if (version === versionRef.current) setBusy((b) => (b.startsWith("Finding") ? b : ""));
      }
    },
    [acceptPhoto, afterAccept, onDocChange, preset, resolved.notDiy],
  );

  const loadSample = useCallback(async () => {
    if (resolved.notDiy) return;
    const version = ++versionRef.current;
    setBusy("Opening the synthetic sample…");
    setError("");
    try {
      const next = await loadDemo();
      if (version !== versionRef.current) {
        releasePhoto(next);
        return;
      }
      acceptPhoto(next, preset);
      setBusy("");
      await afterAccept(next, preset, version);
    } catch (e) {
      if (version === versionRef.current) setError(messageOf(e));
    } finally {
      if (version === versionRef.current) setBusy((b) => (b.startsWith("Finding") ? b : ""));
    }
  }, [acceptPhoto, afterAccept, preset, resolved.notDiy]);

  const openSaved = useCallback(
    async (file: File) => {
      const version = ++versionRef.current;
      setBusy("Opening your project…");
      setError("");
      try {
        const result = await openProject(file);
        if (version !== versionRef.current) {
          releasePhoto(result.photo);
          return;
        }
        const restored = resolveDocument(result.presetId);
        const size = result.customSize ?? DEFAULT_CUSTOM;
        const p = restored.preset ? withCustomSize(restored.preset, size) : preset;
        // Everything below comes from the project. Nothing carries over from the previous session.
        setCustomSize({ widthMm: size.widthMm, heightMm: size.heightMm });
        acceptPhoto(result.photo, p, { crop: result.crop, landmarks: result.landmarks });
        onDocChange(restored.doc?.id ?? result.presetId);
        const sheet = result.sheet && p.mode !== "original";
        const snapDpi = (dpi: number) => (dpi >= 450 ? 600 : 300);
        setOutput({
          ...DEFAULT_OUTPUT,
          tab: sheet ? "sheet" : "single",
          paperId: result.paperId,
          style: result.sheetStyle ?? defaultStyle(result.paperId),
          orientation: result.sheetOrientation ?? "auto",
          ...(sheet
            ? {
                sheetFormat: result.format === "pdf" ? "pdf" : "jpeg",
                sheetDpi: snapDpi(result.dpi),
              }
            : {
                singleFormat:
                  result.format === "png" || result.format === "pdf" ? result.format : "jpeg",
                singleDpi: snapDpi(result.dpi),
              }),
        });
        setView(sheet ? "sheet" : "frame");
        setBackground(p.mode === "original" ? undefined : result.background);
        setStatus("Project restored. Your photo stays on this device.");
      } catch (e) {
        if (version === versionRef.current) setError(messageOf(e));
      } finally {
        if (version === versionRef.current) setBusy("");
      }
    },
    [acceptPhoto, onDocChange, preset],
  );

  // What Home handed over: a file, the sample, the camera or a project. Taken once.
  const handled = useRef<Intake | null>(null);
  useEffect(() => {
    if (!intake || handled.current === intake) return;
    handled.current = intake;
    onIntakeDone();
    if (intake.kind === "file") void importFile(intake.file);
    else if (intake.kind === "sample") void loadSample();
    else if (intake.kind === "project") void openSaved(intake.file);
    else setCameraOpen(true);
  }, [intake, importFile, onIntakeDone, openSaved, loadSample]);

  // When the camera dialog closes, focus goes back to a button that opens it.
  const cameraWas = useRef(false);
  useEffect(() => {
    if (cameraWas.current && !cameraOpen)
      document.querySelector<HTMLElement>("[data-camera-opener]")?.focus();
    cameraWas.current = cameraOpen;
  }, [cameraOpen]);

  // Paste an image anywhere on the studio.
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

  // A new document or custom size re-frames the photo that is already loaded.
  useEffect(() => {
    if (!photo || photo.bytesOnly || heicPhoto || resolved.notDiy) return;
    if (cropKeyRef.current === key) return;
    cropKeyRef.current = key;
    let next: Crop;
    try {
      next =
        landmarksSet && landmarks && preset.mode !== "original"
          ? cropFromLandmarks(photo.width, photo.height, preset, landmarks)
          : defaultCrop(photo.width, photo.height, preset);
    } catch {
      next = defaultCrop(photo.width, photo.height, preset);
    }
    commitGesture();
    cropRef.current = next;
    homeCropRef.current = next;
    setCrop(next);
    setBackground(undefined);
    setFrameNote(null);
    setView("frame");
    clearHistory();
    setExported(false);
  }, [key, photo, heicPhoto, landmarks, landmarksSet, preset, resolved.notDiy, commitGesture, clearHistory]);

  // Analysis checks: measured on the photo pixels, a moment after the crop settles.
  const backgroundColours = doc?.background.colors;
  useEffect(() => {
    if (!photo || !crop || photo.bytesOnly || isOriginal) {
      setPhotoChecks([]);
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        setPhotoChecks(
          analyzeLoadedPhoto(photo.image, photo.width, photo.height, {
            crop,
            face: faceBox,
            mask,
            expected: backgroundColours?.length ? { backgroundColors: backgroundColours } : undefined,
          }),
        );
      } catch {
        setPhotoChecks([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [photo, crop, faceBox, mask, isOriginal, backgroundColours]);

  const measure = useMemo(
    () =>
      photo && crop && landmarks && !isOriginal && !photo.bytesOnly
        ? measurementChecks(
            preset,
            crop,
            landmarksSet ? landmarks : undefined,
            { width: photo.width, height: photo.height },
            300,
          )
        : [],
    [photo, crop, landmarks, landmarksSet, preset, isOriginal],
  );
  const file = useMemo(
    () => (photo && isOriginal ? fileChecks(preset, photo) : []),
    [photo, preset, isOriginal],
  );
  const summary = summarize(isOriginal, measure, photoChecks, file);

  const selectDoc = (id: string) => {
    const next = resolveDocument(id);
    if (
      photo &&
      heicPhoto &&
      next.preset &&
      !(next.preset.mode === "original" && next.preset.mimeTypes?.includes(photo.mime))
    ) {
      setError(HEIC_PRINT_MESSAGE);
      return;
    }
    setError("");
    setStatus("");
    onDocChange(id);
  };
  const commitCustom = (which: "widthMm" | "heightMm") => {
    const text = customDraft[which].trim();
    const value = Number(text),
      maximum = which === "widthMm" ? 100 : 150;
    if (!text || !Number.isFinite(value) || value < 10 || value > maximum) {
      setError(
        `${which === "widthMm" ? "Width" : "Height"} must be between 10 and ${maximum} mm. Your previous size was kept.`,
      );
      setCustomDraft((draft) => ({ ...draft, [which]: String(customSize[which]) }));
      return;
    }
    if (value === customSize[which]) return;
    setCustomSize({ ...customSize, [which]: value });
    setError("");
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
    setFaceBox(undefined);
    setMask(undefined);
    setPhotoChecks([]);
    setBackground(undefined);
    clearHistory();
    setExported(false);
    setError("");
    setStatus("");
    setFrameNote(null);
    setNoticePending(false);
    setBusy("");
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
  const reset = () => {
    if (!photo || heicPhoto) return;
    setNextCrop(homeCropRef.current ?? defaultCrop(photo.width, photo.height, preset));
    setStatus("Position reset.");
  };
  const autoFrame = () => {
    if (!photo || isOriginal || busy) return;
    if (!faceNoticeSeen()) {
      // The face notice comes first, next to the button that starts it.
      setNoticePending(true);
      return;
    }
    void frameFace(photo, preset, versionRef.current);
  };
  const confirmNotice = () => {
    if (!photo || isOriginal || busy) return;
    rememberFaceNotice();
    setNoticePending(false);
    void frameFace(photo, preset, versionRef.current);
  };
  const skipNotice = () => {
    setNoticePending(false);
    setFrameNote({
      tone: "info",
      text: "Drag the photo to line the head up with the bands. Auto-frame is in the toolbar when you want it.",
    });
  };

  const save = async () => {
    if (!photo || !crop || busy) return;
    const operation = versionRef.current;
    setBusy("Saving your portable project…");
    setError("");
    try {
      const sheet = !isOriginal && outputTab === "sheet";
      const blob = await saveProject(photo, projectPreset(preset), crop, {
        paperId: output.paperId,
        background,
        format: isOriginal
          ? "jpeg"
          : outputTab === "sheet"
            ? output.sheetFormat
            : outputTab === "digital"
              ? "jpeg"
              : output.singleFormat,
        dpi: sheet ? output.sheetDpi : output.singleDpi,
        sheet,
        sheetStyle: output.style,
        sheetOrientation: output.orientation,
        // Only head positions the user set (or face assist found) are saved, never the rough defaults.
        landmarks: landmarksSet && !isOriginal && landmarks ? landmarks : undefined,
        customSize:
          preset.mode === "general"
            ? { widthMm: customSize.widthMm, heightMm: customSize.heightMm }
            : undefined,
      });
      if (operation !== versionRef.current) return;
      downloadBlob(blob, "portraitpass.project.json");
      setStatus("Project saved with your source photo and exact settings. Keep this file private.");
    } catch (e) {
      if (operation === versionRef.current) setError(messageOf(e));
    } finally {
      if (operation === versionRef.current) setBusy("");
    }
  };

  const changeBackground = async (colour: string | undefined) => {
    if (!colour) {
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
      setMask(getBackgroundMask(photo));
      setBackground(colour);
      setExported(false);
    } catch (e) {
      if (operation === versionRef.current) setError(messageOf(e));
    } finally {
      if (operation === versionRef.current) setBusy("");
    }
  };

  const adjustPosition = (axis: "x" | "y", percent: number) => {
    const current = cropRef.current;
    if (!current || !photo) return;
    liveCrop({
      ...current,
      [axis]:
        ((axis === "x" ? photo.width - current.width : photo.height - current.height) * percent) / 100,
    });
  };
  const setZoom = (value: number) => {
    const current = cropRef.current;
    if (!photo || !current || !baseCrop) return;
    liveCrop(zoomCrop(current, value / (baseCrop.width / current.width), photo.width, photo.height));
  };
  const updateLandmark = (which: keyof Landmarks, percent: number) => {
    if (!landmarks || !photo) return;
    const moved = {
      ...landmarks,
      [which]: (percent / 100) * (which === "centerX" ? photo.width : photo.height),
    };
    // Crown stays above the eyes and the eyes above the chin, so Fit can never fail on order.
    setLandmarks(which === "centerX" ? moved : orderLandmarks(moved, photo.height, which));
    setLandmarksSet(true);
    setExported(false);
  };
  const applyLandmarks = () => {
    if (!photo || !landmarks) return;
    try {
      if (!landmarksValid(landmarks, photo.width, photo.height))
        throw new Error("Place crown, eyes and chin in that order inside the photo.");
      const next = cropFromLandmarks(photo.width, photo.height, preset, landmarks);
      setNextCrop(next);
      homeCropRef.current = next;
      setLandmarksSet(true);
      setFrameNote({
        tone: "info",
        text: "Head positions applied. Check the crown, eyes and chin against your photo.",
      });
      setError("");
    } catch (e) {
      setError(messageOf(e));
    }
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped && !busy)
      void (dropped.name.endsWith(".json") ? openSaved(dropped) : importFile(dropped));
  };
  const hasFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const name = doc?.name ?? preset.name;
  const step = !photo ? 2 : exported ? 4 : 3;
  const clamp = (next: Crop) =>
    photo ? clampCrop(next, photo.width, photo.height) : next;

  const inputs = (
    <>
      <input
        ref={fileRef}
        disabled={!!busy}
        type="file"
        className="input-hidden"
        aria-label="Choose a photo"
        accept={fileAccept}
        tabIndex={-1}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) void importFile(chosen);
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
        tabIndex={-1}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) void openSaved(chosen);
          event.target.value = "";
        }}
      />
    </>
  );
  const notices = (
    <>
      {error && (
        <div className="notice error" role="alert">
          <X size={15} aria-hidden="true" />
          <span>{error}</span>
          <button className="icon-button" aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={13} />
          </button>
        </div>
      )}
      {status && (
        <div className="notice" role="status">
          <Check size={15} aria-hidden="true" />
          <span>{status}</span>
          <button className="icon-button" aria-label="Dismiss message" onClick={() => setStatus("")}>
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
  const busyIndicator = busy && (
    <div className="busy-indicator" role="status">
      <LoaderCircle size={15} className="spin" aria-hidden="true" />
      {busy}
    </div>
  );

  if (resolved.notDiy && doc) {
    return (
      <main id="main" className="studio-page">
        {notices}
        <div className="studio-simple">
          <h1 className="visually-hidden">{doc.name} photo</h1>
          <NotDiyExplainer
            doc={doc}
            onPickAnother={() => document.getElementById("studio-pick")?.querySelector("input")?.focus()}
          />
          <div className="studio-pick" id="studio-pick" role="group" aria-label="Choose another document">
            <DocumentPicker compact value={doc.id} onChange={selectDoc} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main"
      className={`studio-page${dragging ? " is-dragging" : ""}`}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (hasFiles(event)) event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={drop}
    >
      {inputs}
      {notices}
      <div className="studio-head">
        <h1 className="studio-title serif">{name} photo</h1>
        <p className="studio-sub">Frame it against the size guides. Everything runs on this device.</p>
      </div>
      <div className="studio-grid" aria-label="Photo preparation studio" role="region">
        <div className="studio-top">
          <StepsRail current={step} />
          <DocumentCard
            doc={doc}
            preset={preset}
            busy={!!busy}
            customDraft={customDraft}
            onCustomDraft={setCustomDraft}
            onCustomCommit={commitCustom}
            onDocChange={selectDoc}
          />
          {heicPhoto && (
            <p className="fine-print" id="heic-hint">
              HEIC photos work with the US passport renewal upload, original only. For prints and other
              documents, use a JPEG.
            </p>
          )}
        </div>
        <div className="studio-stage">
          {photo && crop ? (
            <Stage
              photo={photo}
              preset={preset}
              crop={crop}
              landmarks={landmarksSet && landmarks ? landmarks : undefined}
              guides={guides}
              background={isOriginal ? undefined : background}
              view={view}
              paperId={output.paperId}
              sheetStyle={output.style}
              sheetOrientation={output.orientation}
              baseCrop={baseCrop}
              zoom={zoom}
              busy={!!busy}
              canUndo={history.length > 0 || gestureOpen}
              frameNote={frameNote}
              noticePending={noticePending}
              onView={setView}
              onGuides={setGuides}
              onAutoFrame={autoFrame}
              onConfirmNotice={confirmNotice}
              onSkipNotice={skipNotice}
              onUndo={undo}
              onReset={reset}
              onZoom={setZoom}
              onLive={(next) => liveCrop(clamp(next))}
              onCommit={commitGesture}
              onSettle={settleSoon}
              onError={setError}
            />
          ) : (
            <IntakePanel
              documentName={name}
              canCamera={canCamera}
              dragging={dragging}
              busy={!!busy}
              onChoose={() => fileRef.current?.click()}
              onCamera={() => setCameraOpen(true)}
              onSample={() => void loadSample()}
              onOpenProject={() => projectRef.current?.click()}
            />
          )}
        </div>
        <div className="studio-side">
          {photo && <Verdict summary={summary} />}
          {photo && crop && (
            <div className="output-slot">
              <OutputPanel
                doc={doc}
                preset={preset}
                photo={photo}
                crop={crop}
                background={isOriginal ? undefined : background}
                checksSummary={{ failing: summary.failing, unknown: summary.unknown }}
                state={output}
                onState={patchOutput}
                onExported={() => {
                  setExported(true);
                  setStatus("");
                }}
              />
              {exported && (
                <div className="export-success" role="status">
                  <strong>
                    <Check size={14} aria-hidden="true" /> Your download is ready.
                  </strong>
                  <span>PortraitPass is free and has no ads. Tips keep it going.</span>
                  <a className="support-inline" href={SUPPORT_URL}>
                    Leave a tip <Heart size={13} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          )}
          {photo && (
            <CheckDetails
              preset={preset}
              measure={measure}
              photoChecks={photoChecks}
              file={file}
              summary={summary}
            />
          )}
          <YouCheck doc={doc} hasPhoto={!!photo} />
        </div>
        {photo && (
          <div className="tools studio-tools">
            {photo && (
              <section className="tool-section" aria-label="Photo">
                <h3>Photo</h3>
                <div className="tool-buttons">
                  <button className="secondary small-button" disabled={!!busy} onClick={() => fileRef.current?.click()}>
                    <ImagePlus size={14} aria-hidden="true" /> Change photo
                  </button>
                  {canCamera && (
                    <button className="secondary small-button" data-camera-opener disabled={!!busy} onClick={() => setCameraOpen(true)}>
                      <Camera size={14} aria-hidden="true" /> Take photo
                    </button>
                  )}
                  <button className="secondary small-button" disabled={!!busy} onClick={() => void save()}>
                    <FileDown size={14} aria-hidden="true" /> Save project
                  </button>
                  <button className="secondary small-button" disabled={!!busy} onClick={() => projectRef.current?.click()}>
                    <FolderOpen size={14} aria-hidden="true" /> Open project
                  </button>
                  <button className="secondary small-button" disabled={!!busy} onClick={startOver}>
                    <X size={14} aria-hidden="true" /> Start over
                  </button>
                </div>
              </section>
            )}
            {photo && crop && landmarks && !isOriginal && (
              <AdjustPrecisely
                photo={photo}
                crop={crop}
                landmarks={landmarks}
                busy={!!busy}
                onPosition={adjustPosition}
                onLandmark={updateLandmark}
                onApply={applyLandmarks}
                onCommit={commitGesture}
              />
            )}
            {photo && !isOriginal && (
              <BackgroundControls
                preset={preset}
                background={background}
                busy={!!busy}
                onToggle={(on) => void changeBackground(on ? "#ffffff" : undefined)}
                onColour={(colour) => {
                  setBackground(colour);
                  setExported(false);
                }}
              />
            )}
            {photo && isOriginal && (
              <div className="digital-note">
                <LockKeyhole size={16} aria-hidden="true" />
                <p>Online application? Keep your original.</p>
                <span>
                  Cropping, print sheets and editing are off. The downloaded file is identical to the source.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {cameraOpen && (
        <Suspense fallback={null}>
          <CameraCapture
            preset={preset}
            onClose={() => setCameraOpen(false)}
            onCapture={(captured) => {
              setCameraOpen(false);
              void importFile(captured);
            }}
          />
        </Suspense>
      )}
      {busyIndicator}
    </main>
  );
}
