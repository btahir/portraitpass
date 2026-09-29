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
} from "../core/index.js";
import {
  EXIT_CODES,
  errorPayload,
  exitCodeFor,
  assertHeifAllowed,
  inspectFile,
  parseJsonObject,
  prepareProject,
  renderFile,
  saveFile,
} from "./operations.js";
export { EXIT_CODES };
const LANDMARK_KEYS = ["centerX", "crownY", "chinY", "eyesY"] as const;
const CROP_KEYS = ["x", "y", "width", "height"] as const;
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
        "sheet --input photo.jpg --preset uk-passport --paper 4x6 --format pdf --output sheet.pdf",
        "project --input photo.jpg --preset us-passport --embed --output photo.portraitpass.json",
        "layout --preset us-passport --paper 4x6",
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
    );
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
