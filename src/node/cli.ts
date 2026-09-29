#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  PRESETS,
  PAPERS,
  PortraitError,
  getPreset,
  defaultCrop,
  cropFromLandmarks,
  layoutSheet,
  type Project,
  type SheetOptions,
} from "../core/index.js";
import {
  EXIT_CODES,
  errorPayload,
  exitCodeFor,
  assertHeifAllowed,
  inspectFile,
  parseJsonObject,
  prepareProject,
  renderDigital,
  renderFile,
  saveFile,
} from "./operations.js";
export { EXIT_CODES };
const LANDMARK_KEYS = ["centerX", "crownY", "chinY", "eyesY"] as const;
const CROP_KEYS = ["x", "y", "width", "height"] as const;
/**
 * `--layout` and `--orientation` as layoutSheet options ("layout" command) or as project fields
 * (render/sheet commands). Values are validated here so a typo is INVALID_ARGUMENT, not silently ignored.
 */
function sheetOptions(layout?: string, orientation?: string): SheetOptions;
function sheetOptions(
  layout: string | undefined,
  orientation: string | undefined,
  as: "project",
): { sheetStyle?: Project["sheetStyle"]; sheetOrientation?: Project["sheetOrientation"] };
function sheetOptions(
  layout?: string,
  orientation?: string,
  as?: "project",
): SheetOptions | { sheetStyle?: Project["sheetStyle"]; sheetOrientation?: Project["sheetOrientation"] } {
  if (layout !== undefined && !["edge-to-edge", "cut-marks"].includes(layout))
    throw new PortraitError(
      "INVALID_SHEET_STYLE",
      "--layout must be edge-to-edge or cut-marks.",
    );
  if (
    orientation !== undefined &&
    !["auto", "portrait", "landscape"].includes(orientation)
  )
    throw new PortraitError(
      "INVALID_SHEET_ORIENTATION",
      "--orientation must be auto, portrait or landscape.",
    );
  const style = layout as SheetOptions["style"],
    o = orientation as SheetOptions["orientation"];
  return as === "project"
    ? {
        ...(style ? { sheetStyle: style } : {}),
        ...(o ? { sheetOrientation: o } : {}),
      }
    : { ...(style ? { style } : {}), ...(o ? { orientation: o } : {}) };
}
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: "boolean" },
      help: { type: "boolean" },
      input: { type: "string" },
      output: { type: "string" },
      preset: { type: "string" },
      project: { type: "string" },
      paper: { type: "string" },
      format: { type: "string" },
      dpi: { type: "string" },
      crop: { type: "string" },
      landmarks: { type: "string" },
      overwrite: { type: "boolean" },
      embed: { type: "boolean" },
      layout: { type: "string" },
      orientation: { type: "string" },
      width: { type: "string" },
      height: { type: "string" },
      "min-kb": { type: "string" },
      "max-kb": { type: "string" },
      "kb-bytes": { type: "string" },
    },
  });
  const command = positionals[0] ?? "help";
  let result: unknown;
  if (values.help || command === "help")
    result = {
      name: "portraitpass",
      commands: [
        "presets",
        "inspect --input photo.jpg [--preset us-online]",
        'crop --input photo.jpg --preset us-passport [--landmarks \'{"centerX":600,"crownY":200,"chinY":1000,"eyesY":500}\']',
        "render --input photo.jpg --preset us-passport --output photo.jpg [--format jpeg|png|pdf|original] [--crop JSON]  (format is inferred from the output extension; a mismatch fails)",
        "render --project photo.portraitpass.json --output photo.jpg  (do not combine --preset with --project unless it matches the project)",
        "sheet --input photo.jpg --preset uk-passport --paper 4x6 --format pdf --output sheet.pdf [--layout edge-to-edge|cut-marks] [--orientation auto|portrait|landscape]  (defaults: edge-to-edge on 4x6, cut-marks on A4/Letter; orientation auto picks the paper direction with more photos)",
        "digital --input photo.jpg --preset us-passport --width 600 --height 600 --max-kb 240 --output photo.jpg [--min-kb 20] [--kb-bytes 1000|1024] [--crop JSON]  (exact pixels, JPEG quality searched to fit the KB range; never enlarges)",
        "project --input photo.jpg --preset us-passport --embed --output photo.portraitpass.json",
        "layout --preset us-passport --paper 4x6 [--layout edge-to-edge|cut-marks] [--orientation auto|portrait|landscape]",
      ],
      options:
        "All commands accept --json. Outputs are never overwritten unless --overwrite is explicit. Source and project files are never overwritten.",
      exitCodes: EXIT_CODES,
    };
  else if (command === "presets") result = { presets: PRESETS, papers: PAPERS };
  else if (command === "inspect") {
    if (!values.input)
      throw new PortraitError("SOURCE_REQUIRED", "--input is required.");
    result = await inspectFile(values.input, values.preset);
  } else if (command === "crop") {
    if (!values.input)
      throw new PortraitError("SOURCE_REQUIRED", "--input is required.");
    const source = await inspectFile(values.input),
      preset = getPreset(values.preset ?? "us-passport");
    assertHeifAllowed(source.mime, preset.id);
    result = {
      crop: values.landmarks !== undefined
        ? cropFromLandmarks(
            source.width,
            source.height,
            preset,
            parseJsonObject(values.landmarks, "--landmarks", LANDMARK_KEYS),
          )
        : defaultCrop(source.width, source.height, preset),
      presetId: preset.id,
      source,
    };
  } else if (command === "layout")
    result = layoutSheet(
      getPreset(values.preset ?? "us-passport"),
      values.paper ?? "4x6",
      values.dpi ? Number(values.dpi) : 300,
      sheetOptions(values.layout, values.orientation),
    );
  else if (command === "digital") {
    if (!values.output)
      throw new PortraitError("ARGUMENT_REQUIRED", "--output is required.");
    if (values.width === undefined || values.height === undefined)
      throw new PortraitError(
        "ARGUMENT_REQUIRED",
        "--width and --height (pixels) are required.",
      );
    result = await renderDigital({
      input: values.input,
      projectPath: values.project,
      presetId: values.preset,
      output: values.output,
      widthPx: Number(values.width),
      heightPx: Number(values.height),
      minKB: values["min-kb"] === undefined ? undefined : Number(values["min-kb"]),
      maxKB: values["max-kb"] === undefined ? undefined : Number(values["max-kb"]),
      kbBytes:
        values["kb-bytes"] === undefined
          ? undefined
          : (Number(values["kb-bytes"]) as 1000 | 1024),
      crop:
        values.crop === undefined
          ? undefined
          : parseJsonObject(values.crop, "--crop", CROP_KEYS),
      overwrite: values.overwrite,
    });
  }
  else if (command === "project") {
    if (!values.input || !values.output)
      throw new PortraitError(
        "ARGUMENT_REQUIRED",
        "--input and --output are required.",
      );
    const project = await prepareProject(
      values.input,
      values.preset,
      values.embed,
    );
    result = {
      output: await saveFile(
        values.output,
        Buffer.from(JSON.stringify(project, null, 2) + "\n"),
        values.overwrite,
        values.input,
      ),
      version: project.version,
      presetId: project.presetId,
      embedded: Boolean(project.source.dataUrl),
    };
  } else if (command === "render" || command === "sheet") {
    if (!values.output)
      throw new PortraitError("ARGUMENT_REQUIRED", "--output is required.");
    result = await renderFile({
      input: values.input,
      projectPath: values.project,
      presetId: values.preset,
      output: values.output,
      paperId: values.paper,
      format: values.format as Project["format"],
      dpi: values.dpi ? Number(values.dpi) : undefined,
      crop:
        values.crop === undefined
          ? undefined
          : parseJsonObject(values.crop, "--crop", CROP_KEYS),
      overwrite: values.overwrite,
      sheet: command === "sheet" ? true : undefined,
      ...sheetOptions(values.layout, values.orientation, "project"),
    });
  } else
    throw new PortraitError(
      "UNKNOWN_COMMAND",
      "Unknown command. Run portraitpass help.",
    );
  console.log(
    JSON.stringify({ ok: true, result }, null, values.json ? undefined : 2),
  );
}
main().catch((error: unknown) => {
  const e = errorPayload(error);
  console.log(JSON.stringify({ ok: false, error: e }));
  process.exitCode = exitCodeFor(e.code);
});
