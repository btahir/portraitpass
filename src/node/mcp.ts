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
      "Render a print sheet with real dimensions, safe margins and cut marks. Digital-original modes cannot be printed. Paper comes from paperId, else the project, else 4x6. Results carry `checks` and `warnings` as for render. All paths must be absolute.",
    inputSchema: {
      ...renderSchema,
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
      return renderFile({ ...args, sheet: true });
    }),
);
server.registerTool(
  "portraitpass_layout",
  {
    description:
      "Calculate sheet placement and outside-photo cut marks in pixels without reading images.",
    inputSchema: {
      presetId: z.string(),
      paperId: z.enum(["4x6", "a4", "letter"]),
      dpi: z.number().min(72).max(600).default(300),
    },
    outputSchema: responseSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  (args) =>
    respond(() => ({
      ...layoutSheet(getPreset(args.presetId), args.paperId, args.dpi),
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
