#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  PRESETS,
  PAPERS,
  getPreset,
  defaultCrop,
  cropFromLandmarks,
  layoutSheet,
  PortraitError,
} from "../core/index.js";
import path from "node:path";
import {
  assertHeifAllowed,
  errorPayload,
  inspectFile,
  prepareProject,
  renderDigital,
  renderFile,
  saveFile,
} from "./operations.js";
const server = new McpServer({ name: "portraitpass", version: "0.1.0" });
const responseSchema = {
  ok: z.boolean(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      issues: z
        .array(z.object({ code: z.string(), message: z.string() }))
        .optional(),
    })
    .optional(),
};
const ABSOLUTE =
  " Must be an absolute path; relative paths are rejected (PATH_NOT_ABSOLUTE).";
const absolutePath = (what: string) => z.string().describe(what + ABSOLUTE);
/** MCP servers have no meaningful working directory, so refuse relative paths outright. */
function requireAbsolute(paths: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(paths))
    if (value !== undefined && !path.isAbsolute(value))
      throw new PortraitError(
        "PATH_NOT_ABSOLUTE",
        `${name} must be an absolute path.`,
      );
}
async function respond(fn: () => unknown | Promise<unknown>) {
  try {
    const result = await fn();
    const payload = { ok: true, result: result as Record<string, unknown> };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  } catch (error) {
    const payload = { ok: false, error: errorPayload(error) };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
      isError: true,
    };
  }
}
server.registerTool(
  "portraitpass_presets",
  {
    description:
      "List source-backed document presets and print paper formats. No compliance guarantee.",
    inputSchema: {},
    outputSchema: responseSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  () => respond(() => ({ presets: PRESETS, papers: PAPERS })),
);
server.registerTool(
  "portraitpass_inspect",
  {
    description:
      "Inspect a local JPEG/PNG/WebP (or HEIC/HEIF) without uploading it; assess basic original-file properties. All paths must be absolute.",
    inputSchema: {
      input: absolutePath("Path of the photo to inspect."),
      presetId: z.string().optional(),
    },
    outputSchema: responseSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  (args) =>
    respond(() => {
      requireAbsolute({ input: args.input });
      return inspectFile(args.input, args.presetId);
    }),
);
const cropSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
server.registerTool(
  "portraitpass_crop",
  {
    description:
      "Propose a deterministic crop in oriented source pixels. Crown/chin/eye positions are manually supplied, not biometric certification. All paths must be absolute.",
    inputSchema: {
      input: absolutePath("Path of the photo to crop."),
      presetId: z.string(),
      landmarks: z
        .object({
          centerX: z.number(),
          crownY: z.number(),
          chinY: z.number(),
          eyesY: z.number(),
        })
        .optional(),
    },
    outputSchema: responseSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  (args) =>
    respond(async () => {
      requireAbsolute({ input: args.input });
      const source = await inspectFile(args.input),
        preset = getPreset(args.presetId);
      assertHeifAllowed(source.mime, preset.id);
      return {
        crop: args.landmarks
          ? cropFromLandmarks(
              source.width,
              source.height,
              preset,
              args.landmarks,
            )
          : defaultCrop(source.width, source.height, preset),
        source,
        presetId: preset.id,
      };
    }),
);
// No zod defaults here: an omitted argument must fall back to the project value, not a schema default.
const renderSchema = {
  input: absolutePath("Photo to render.").optional(),
  projectPath: absolutePath("Saved .portraitpass.json project.").optional(),
  presetId: z
    .string()
    .optional()
    .describe(
      "Document preset. With projectPath it must match the project's preset (PRESET_PROJECT_CONFLICT otherwise).",
    ),
  output: absolutePath("Where to write the result."),
  format: z
    .enum(["jpeg", "png", "pdf", "original"])
    .optional()
    .describe(
      "Inferred from the output extension (.jpg/.jpeg/.png/.pdf) when omitted; a disagreeing extension fails with FORMAT_EXTENSION_MISMATCH.",
    ),
  dpi: z.number().min(72).max(600).optional(),
  crop: cropSchema.optional(),
  overwrite: z
    .boolean()
    .optional()
    .describe(
      "Replace an existing output file. Source and project files are never replaced.",
    ),
};
const sheetSchema = {
  sheetStyle: z
    .enum(["edge-to-edge", "cut-marks"])
    .optional()
    .describe(
      "Sheet style. Omit to use the project's, else edge-to-edge on 4x6 and cut-marks on A4/Letter.",
    ),
  sheetOrientation: z
    .enum(["auto", "portrait", "landscape"])
    .optional()
    .describe(
      "Paper orientation. Omit to use the project's, else auto (the direction with more photos; ties go to portrait).",
    ),
};
function renderArgs(args: {
  input?: string;
  projectPath?: string;
  output: string;
}) {
  requireAbsolute({
    input: args.input,
    projectPath: args.projectPath,
    output: args.output,
  });
}
server.registerTool(
  "portraitpass_render",
  {
    description:
      "Render one image or exact physical-size PDF from a local source/project, or copy original bytes for online modes (digital-original inputs that do not fit fail with ORIGINAL_NOT_ACCEPTED). Results carry `checks` (head, eyes, centre, resolution measurements) and `warnings`; head height and eye line are measurements, not blockers. Writes only the specified output; never overwrites the source or project file. All paths must be absolute.",
    inputSchema: renderSchema,
    outputSchema: responseSchema,
    annotations: { destructiveHint: true, openWorldHint: false },
  },
  (args) =>
    respond(() => {
      renderArgs(args);
      return renderFile(args);
    }),
);
server.registerTool(
  "portraitpass_sheet",
  {
    description:
      "Render a print sheet with real dimensions. Style: edge-to-edge (no margins, thin guides on shared edges; the default on 4x6 photo-lab paper) or cut-marks (3 mm margins and corner marks; the default on A4 and Letter). Orientation auto picks the paper direction that holds more photos. Digital-original modes cannot be printed. Paper, style and orientation come from the arguments, else the project, else the defaults. Results carry `layout` (orientation, style, columns, rows), `checks` and `warnings` as for render. All paths must be absolute.",
    inputSchema: {
      ...renderSchema,
      ...sheetSchema,
      paperId: z
        .enum(["4x6", "a4", "letter"])
        .optional()
        .describe(
          "Paper format. Omit to use the project's paper (4x6 for new projects).",
        ),
    },
    outputSchema: responseSchema,
    annotations: { destructiveHint: true, openWorldHint: false },
  },
  (args) =>
    respond(() => {
      renderArgs(args);
      return renderFile({
        ...args,
        sheet: true,
        sheetStyle: args.sheetStyle,
        sheetOrientation: args.sheetOrientation,
      });
    }),
);
server.registerTool(
  "portraitpass_digital",
  {
    description:
      "Export one JPEG at exact pixel size inside a file-size range: crops with the preset or project crop, downscales (never enlarges; LOW_RESOLUTION otherwise) and searches JPEG quality to land within minKB..maxKB. If even top quality is under minKB the file is padded with a JPEG comment segment (pixels unchanged, `padded: true`); if even the lowest quality is over maxKB it fails with FILE_SIZE_UNREACHABLE (choose fewer pixels). kbBytes says how many bytes one KB is (1024 default, or 1000). Results carry bytes, kb, quality, padded, `fileChecks`, `checks` and `warnings`. Digital-original presets are never re-encoded (ORIGINAL_ONLY). All paths must be absolute.",
    inputSchema: {
      input: absolutePath("Photo to export.").optional(),
      projectPath: absolutePath("Saved .portraitpass.json project.").optional(),
      presetId: z
        .string()
        .optional()
        .describe(
          "Document preset (e.g. us-passport for a 600 x 600 lottery photo, general-id for other shapes). With projectPath it must match the project's preset.",
        ),
      output: absolutePath("Where to write the JPEG (.jpg or .jpeg)."),
      widthPx: z.number().int().min(1).max(10000),
      heightPx: z.number().int().min(1).max(10000),
      minKB: z.number().positive().optional(),
      maxKB: z.number().positive().optional(),
      kbBytes: z
        .union([z.literal(1000), z.literal(1024)])
        .optional()
        .describe("Bytes per KB for minKB and maxKB. Default 1024; use 1000 when the form means decimal KB."),
      crop: cropSchema.optional(),
      overwrite: z.boolean().optional(),
    },
    outputSchema: responseSchema,
    annotations: { destructiveHint: true, openWorldHint: false },
  },
  (args) =>
    respond(() => {
      renderArgs(args);
      return renderDigital(args);
    }),
);
server.registerTool(
  "portraitpass_layout",
  {
    description:
      "Calculate sheet placement and cut marks or edge guides in pixels without reading images. Optional sheetStyle (edge-to-edge or cut-marks) and sheetOrientation (auto, portrait, landscape); defaults are edge-to-edge on 4x6, cut-marks on A4/Letter, orientation auto. The result reports the resolved orientation and style.",
    inputSchema: {
      presetId: z.string(),
      paperId: z.enum(["4x6", "a4", "letter"]),
      dpi: z.number().min(72).max(600).default(300),
      ...sheetSchema,
    },
    outputSchema: responseSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  (args) =>
    respond(() => ({
      ...layoutSheet(getPreset(args.presetId), args.paperId, args.dpi, {
        style: args.sheetStyle,
        orientation: args.sheetOrientation,
      }),
    })),
);
server.registerTool(
  "portraitpass_project",
  {
    description:
      "Save a portable version-1 project with embedded source for human review in the browser. HEIC/HEIF sources are only valid for the US online renewal original (otherwise UNSUPPORTED_IMAGE; use JPEG). All paths must be absolute.",
    inputSchema: {
      input: absolutePath("Photo to embed."),
      presetId: z.string(),
      output: absolutePath("Where to write the project file."),
      overwrite: z.boolean().optional(),
    },
    outputSchema: responseSchema,
    annotations: { destructiveHint: true, openWorldHint: false },
  },
  (args) =>
    respond(async () => {
      requireAbsolute({ input: args.input, output: args.output });
      const project = await prepareProject(args.input, args.presetId, true);
      const output = await saveFile(
        args.output,
        Buffer.from(JSON.stringify(project, null, 2) + "\n"),
        args.overwrite,
        args.input,
      );
      return { output, version: project.version, presetId: project.presetId };
    }),
);
await server.connect(new StdioServerTransport());
