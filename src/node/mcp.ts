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
import {
  inspectFile,
  prepareProject,
  renderFile,
  saveFile,
} from "./operations.js";
const server = new McpServer({ name: "portraitpass", version: "0.1.0" });
const responseSchema = {
  ok: z.boolean(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
};
async function respond(fn: () => unknown | Promise<unknown>) {
  try {
    const result = await fn();
    const payload = { ok: true, result: result as Record<string, unknown> };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  } catch (error) {
    const payload = {
      ok: false,
      error: {
        code: error instanceof PortraitError ? error.code : "OPERATION_FAILED",
        message:
          error instanceof PortraitError
            ? error.message
            : "The local file operation failed.",
      },
    };
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
      "Inspect a local JPEG/PNG/WebP without uploading it; assess basic original-file properties.",
    inputSchema: { input: z.string(), presetId: z.string().optional() },
    outputSchema: responseSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  (args) => respond(() => inspectFile(args.input, args.presetId)),
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
      "Propose a deterministic crop in oriented source pixels. Crown/chin/eye positions are manually supplied, not biometric certification.",
    inputSchema: {
      input: z.string(),
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
      const source = await inspectFile(args.input),
        preset = getPreset(args.presetId);
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
const renderSchema = {
  input: z.string().optional(),
  projectPath: z.string().optional(),
  presetId: z.string().optional(),
  output: z.string(),
  format: z.enum(["jpeg", "png", "pdf", "original"]).optional(),
  dpi: z.number().min(72).max(600).optional(),
  crop: cropSchema.optional(),
  overwrite: z.boolean().default(false),
};
server.registerTool(
  "portraitpass_render",
  {
    description:
      "Render one image or exact physical-size PDF from a local source/project, or copy original bytes for online modes. Writes only the specified output; never overwrites source.",
    inputSchema: renderSchema,
    outputSchema: responseSchema,
    annotations: { destructiveHint: true, openWorldHint: false },
  },
  (args) => respond(() => renderFile(args)),
);
server.registerTool(
  "portraitpass_sheet",
  {
    description:
      "Render a print sheet with real dimensions, safe margins and cut marks. Digital-original modes cannot be printed.",
    inputSchema: {
      ...renderSchema,
      paperId: z.enum(["4x6", "a4", "letter"]).default("4x6"),
    },
    outputSchema: responseSchema,
    annotations: { destructiveHint: true, openWorldHint: false },
  },
  (args) => respond(() => renderFile({ ...args, sheet: true })),
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
      "Save a portable version-1 project with embedded source for human review in the browser.",
    inputSchema: {
      input: z.string(),
      presetId: z.string(),
      output: z.string(),
      overwrite: z.boolean().default(false),
    },
    outputSchema: responseSchema,
    annotations: { destructiveHint: true, openWorldHint: false },
  },
  (args) =>
    respond(async () => {
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
