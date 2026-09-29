# PortraitPass for agents

PortraitPass runs entirely on the local machine. No API key, external model, upload or server is needed for the core, CLI or MCP. The website is the product; the CLI and MCP server are thin extras for AI assistants working on local files. The browser provides human review and an optional local segmentation mask. We check sizes and positions; the issuing authority decides acceptance. Follow the source rules linked from each preset. There is no npm package.

PortraitPass is an independent open-source project, not affiliated with or endorsed by any government or passport office.

From the repository root:

```sh
pnpm install
./scripts/portraitpass presets --json
./scripts/portraitpass inspect --input /absolute/photo.jpg --preset us-online --json
./scripts/portraitpass crop --input /absolute/photo.jpg --preset uk-passport --json
./scripts/portraitpass render --input /absolute/photo.jpg --preset us-passport --format png --output /absolute/photo-sized.png --json
./scripts/portraitpass sheet --input /absolute/photo.jpg --preset uk-passport --paper 4x6 --format pdf --output /absolute/print-sheet.pdf --json
./scripts/portraitpass sheet --input /absolute/photo.jpg --preset uk-passport --paper letter --layout cut-marks --orientation landscape --format pdf --output /absolute/letter-sheet.pdf --json
./scripts/portraitpass digital --input /absolute/photo.jpg --preset us-passport --width 600 --height 600 --max-kb 240 --kb-bytes 1000 --output /absolute/dv-lottery.jpg --json
./scripts/portraitpass project --input /absolute/photo.jpg --preset uk-passport --embed --output /absolute/photo.portraitpass.json --json
./scripts/portraitpass render --project /absolute/photo.portraitpass.json --output /absolute/reviewed-crop.jpg --json
```

Open the saved project in the browser studio to review it. `--embed` makes a CLI project portable; without it, supply `--input` again when rendering. MCP project handoffs always embed the source. Source bytes can contain identifying EXIF metadata; project files and original-mode outputs intentionally preserve original bytes. Save and share them intentionally. Prepared PNG/JPEG exports normalize orientation and strip source EXIF except generated print metadata.

## Presets and coordinates

Each preset in `presets --json` carries its dimensions, head and eye ranges where the source gives them (`headMinMm`/`headMaxMm`, `eyeMinMm`/`eyeMaxMm`, eye line measured up from the bottom edge), `backgroundEdit` (`forbidden`, `unspecified` or `allowed`), `notes`, `sourceUrl` and `checkedAt`. Read `notes` and show them to the person.

- `us-passport`: printed 50.8 × 50.8 mm, crown-to-chin 25.4–34.925 mm (1–1⅜ inches), eyes 28.575–34.925 mm from the bottom. Someone else takes the photo, or use a tripod; selfies are not accepted. Background edits: `forbidden`.
- `uk-passport`: printed 35 × 45 mm, crown-to-chin 29–34 mm. HM Passport Office asks for professionally printed photos that are not cut down from a larger picture; a photo lab or booth is the safer route, and for online applications use `uk-online`. Background edits: `forbidden`.
- `au-passport`: printed 35 × 45 mm (one permitted size), crown-to-chin 32–36 mm. Print at a photo lab on dye-sublimation glossy paper of at least 200 gsm; inkjet prints are not accepted. Background edits: `forbidden`.
- `general-id`: default 35 × 45 mm, optional custom dimensions and background mask. Background edits: `unspecified`. No claim about any authority's rules; check the receiving organisation.
- `us-online`, `uk-online`: unchanged original bytes only; no crop, edit, sheet or alternate format. `us-online` accepts JPEG, PNG, HEIC and HEIF, 54 KB to 10 MB. `uk-online` is 50 KB to 10 MB, at least 600 × 750 px.

Not DIY, so not presets: Canadian passport (a commercial photographer is required) and German passport or ID card (digital photos through the authority or a certified provider since 1 May 2025). They are listed in `DOCUMENT_NOTICES`, exported from the core library (`src/core/presets.ts`) with a reason and source URL. The CLI and MCP tools do not expose them, so `presets` will not list these documents. If a person asks for one, tell them it is not DIY; do not substitute another preset.

All crop and landmark coordinates are in **oriented original pixels**. `crop` is `{x,y,width,height}`. `landmarks` is `{centerX,crownY,eyesY,chinY}`. To propose a crop from manually reviewed landmarks:

```sh
./scripts/portraitpass crop --input /absolute/photo.jpg --preset uk-passport --landmarks '{"centerX":600,"crownY":250,"eyesY":550,"chinY":1050}' --json
./scripts/portraitpass render --input /absolute/photo.jpg --preset us-passport --crop '{"x":0,"y":200,"width":1200,"height":1200}' --output /absolute/crop.jpg --json
./scripts/portraitpass layout --preset uk-passport --paper a4 --json
```

Default output is 300 DPI; `--dpi` accepts 72–600. For print and general presets the output format is inferred from the output extension (`.jpg`/`.jpeg`, `.png`, `.pdf`). An explicit `--format` that contradicts a recognised extension fails with `FORMAT_EXTENSION_MISMATCH`, as do `.webp`, `.gif`, `.tif`/`.tiff`, `.bmp`, `.avif`, `.heic`, `.heif` and `.svg` outputs. An unknown or missing extension falls back to the project's format. Original modes copy the source bytes, so the output extension must match the source type (`.jpg`/`.jpeg` for JPEG, `.png`, `.webp`, `.heic`/`.heif`); a JPEG/PNG/PDF-style extension that does not match fails the same way. Papers are `4x6`, `a4`, `letter`, portrait orientation. Safe print margins and gaps are 3 mm. Thus a 4×6 sheet holds two US 2×2 photos or six 35×45 photos. Print PDFs at actual size / 100%, with fit-to-page disabled. JPEG/PNG pixel dimensions are rounded to nearest pixel; PDF photo and paper sizes use physical millimetres exactly. Canvas and Sharp use different resampling filters; fractional source boundaries can differ by less than one source pixel. The stored source/crop dimensions remain identical.

## Sheets: layout, orientation and exact digital files

**Sheet layout.** `layout`, `sheet` and the MCP `portraitpass_layout` and `portraitpass_sheet` tools take two optional settings:

- `--layout edge-to-edge|cut-marks` (MCP `sheetStyle`). `edge-to-edge` has no margins and no gaps: photos tile the paper from the corner (centred if there is leftover) and thin light-grey guides run only along shared edges, never inside a photo. Print it at a photo lab with "no borders / don't crop". `cut-marks` keeps 3 mm margins and gaps and draws corner marks outside every photo (home printer). Default: `edge-to-edge` on `4x6`, `cut-marks` on `a4` and `letter`.
- `--orientation auto|portrait|landscape` (MCP `sheetOrientation`). `auto` lays out both paper directions and keeps the one with more photos (ties go to portrait). The layout and the PDF page are oriented accordingly: `width`, `height`, `widthMm` and `heightMm` describe the page as printed, and `orientation` and `style` report what was chosen.

Photos per sheet with the defaults (orientation auto):

| Preset (photo) | 4x6 (edge-to-edge) | A4 (cut-marks) | Letter (cut-marks) |
| --- | --- | --- | --- |
| `us-passport` (50.8 × 50.8) | 6 (2 × 3) | 15 | 15 |
| `uk-passport`, `au-passport`, `general-id` (35 × 45) | 8 (landscape 4 × 2) | 30 | 28 (landscape) |

With `edge-to-edge` on A4 and Letter: 20 for `us-passport`, 36 for the 35 × 45 presets. A project can store `sheetStyle` and `sheetOrientation`; an explicit argument overrides the project, and omitted arguments keep the project's values.

**Exact digital export.** `digital` writes one JPEG at exact pixels inside a file-size range, for forms that state both (for example 600 × 600 px, at most 240 KB for a lottery photo, or 20 to 50 KB for an exam upload):

```sh
./scripts/portraitpass digital --input /absolute/photo.jpg --preset us-passport --width 600 --height 600 --max-kb 240 --kb-bytes 1000 --output /absolute/dv.jpg --json
./scripts/portraitpass digital --input /absolute/photo.jpg --preset general-id --width 200 --height 230 --min-kb 20 --max-kb 50 --output /absolute/exam.jpg --json
```

`--width` and `--height` are required; `--min-kb`, `--max-kb`, `--kb-bytes` (`1000` or `1024`, default `1024`; use `1000` when the form means decimal KB), `--crop`, `--project` and `--overwrite` are optional. The crop must have the same shape as the target. With `--input` and no `--crop`, a centred crop of the target shape is used; with a project, a different shape fails with `ASPECT_MISMATCH` and a suggested crop. The photo is only ever scaled down: a crop with fewer pixels than the target fails with `LOW_RESOLUTION`. JPEG quality is searched between 0.3 and 0.95 in at most 8 encodes to land inside the range, keeping the highest quality that fits. If even the highest quality is under `--min-kb`, the file is padded with a JPEG comment segment up to the minimum (`padded: true`, `paddedBytes`); the pixels and quality are unchanged, which satisfies forms with a minimum size. If even the lowest quality is over `--max-kb`, the command fails with `FILE_SIZE_UNREACHABLE`; choose fewer pixels. Digital-original presets (`us-online`, `uk-online`) are never re-encoded (`ORIGINAL_ONLY`).

The result carries `width`, `height`, `bytes`, `kb`, `kbBytes`, `minBytes`, `maxBytes`, `quality`, `padded`, `paddedBytes`, `encodes`, `backgroundReplaced`, `checks` (head, eyes and centre measurements, only when the pixel shape matches the preset shape), `fileChecks` (`pixels` and `filesize`) and `warnings`. The output must be a `.jpg` or `.jpeg` path.

## JSON and file safety

For machine consumers use `./scripts/portraitpass`; `pnpm cli` is a human convenience and package-manager messages may appear on stdout. The direct CLI prints a JSON envelope: `{ "ok": true, "result": ... }` or `{ "ok": false, "error": { "code": "...", "message": "..." } }`; `--json` makes it compact. Errors never contain file paths.

Exit codes:

| Code | Meaning | Error codes |
| --- | --- | --- |
| `0` | success | |
| `1` | internal failure | `INTERNAL_ERROR` |
| `2` | invalid command or data (the default for anything not listed below) | `FORMAT_EXTENSION_MISMATCH`, `PRESET_PROJECT_CONFLICT`, `INVALID_ARGUMENT`, `INVALID_JSON`, `INVALID_OUTPUT_KIND`, `PATH_NOT_ABSOLUTE` (MCP only), unknown preset or paper, invalid crop, `LOW_RESOLUTION`, `ASPECT_MISMATCH`, `INVALID_SHEET_STYLE`, `INVALID_SHEET_ORIENTATION`, `INVALID_DIGITAL_TARGET`, `FILE_SIZE_UNREACHABLE`, `ORIGINAL_ONLY`, invalid project, and so on |
| `3` | source or input problem | `INPUT_NOT_FOUND`, `SOURCE_REQUIRED`, `INVALID_IMAGE`, `UNSUPPORTED_IMAGE`, `INVALID_INPUT`, `FILE_TOO_LARGE`, `PROJECT_NOT_FOUND`, `ORIGINAL_NOT_ACCEPTED` |
| `4` | output problem | `OUTPUT_EXISTS`, `OUTPUT_WRITE`, `OUTPUT_DIRECTORY`, `SOURCE_OVERWRITE` (also raised when the output is the `--project` file) |

Successful `render` and `sheet` results carry `checks`, a `warnings` array (empty when there is nothing to say) and, for prepared images and PDFs, `backgroundReplaced`. `checks` is the same measurement list the browser shows: `{id, status, valueMm?, minMm?, maxMm?, ppi?, message}` for `head`, `eyes`, `centre` and `resolution`, where `status` is `pass`, `fail` or `unknown` (no landmarks, or the document gives no range). Each failing head, eye or centre check also adds its message to `warnings`, and so does background replacement for a document whose rules forbid altering the photo; relay warnings to the person. No claim of document acceptance appears in output.

Original modes (`us-online`, `uk-online`) fail with `ORIGINAL_NOT_ACCEPTED` (exit 3) when the file is outside the preset's limits (size, resolution or file type), matching the browser. The error carries an `issues` array of `{code, message}`; `inspect --preset` returns the same issues without failing. For `us-online`, HEIC and HEIF files pass through byte for byte: they are recognised from the file header and sized from it, not decoded, and they are refused for every other preset (`UNSUPPORTED_IMAGE`, exit 3, suggesting JPEG). That includes `project` and `crop`, so a print or general project is never written from a HEIC file.

`render --project` with `--preset` is an error (`PRESET_PROJECT_CONFLICT`) when the preset differs from the project's own. Simplest is to omit `--preset` when using `--project`. `--paper`, `--dpi` and `--crop` given on the command line override the project's values; omitted ones keep the project's.

Head height and eye line are measurements, not blockers, exactly as in the browser: when the project carries `landmarks` and either falls outside the preset's range, the render still succeeds, the matching `checks` entry is `fail` and `warnings` says so. Only hard geometry stops a render: a crop outside the photo (`INVALID_CROP`), wrong proportions (`ASPECT_MISMATCH`) or too few pixels (`LOW_RESOLUTION`). A project made by `--input` has no landmarks, so those checks are `unknown` until a project saved from the browser (or with landmarks added) is used. `--landmarks` and `--crop` must be JSON objects with numeric fields; `null`, arrays and other JSON fail with `INVALID_JSON` (exit 2).

Outputs use exclusive creation by default. `--overwrite` must be explicit; source files, source symlink aliases and the `--project` file itself remain protected, even with `--overwrite` (`SOURCE_OVERWRITE`). Parent output directories must exist. No destination path is inferred from a project. Paths may be absolute or relative to the working directory; this is a local file tool, not a sandbox. Give it access only to files you intend it to read and write. Source limits: 20 MiB and 40 megapixels; source formats: single-frame JPEG, PNG, WebP (HEIC and HEIF are accepted only for the `us-online` original passthrough, which copies the bytes without decoding). Portable JSON limit: 60 MiB. Unknown project versions, invalid geometry and insufficient crop resolution fail before rendering. Reading a project drops unknown keys and rebuilds it from known fields; `customSize` with extra keys, or on a preset other than General ID, is rejected (`INVALID_CUSTOM_SIZE`).

## Version 1 project schema

```json
{
  "version": 1,
  "presetId": "us-passport",
  "source": {"name": "photo.jpg", "mime": "image/jpeg", "width": 1200, "height": 1600, "dataUrl": "data:image/jpeg;base64,..."},
  "crop": {"x": 0, "y": 200, "width": 1200, "height": 1200},
  "landmarks": {"centerX": 600, "crownY": 350, "eyesY": 650, "chinY": 1100},
  "dpi": 300,
  "paperId": "4x6",
  "sheetStyle": "edge-to-edge",
  "sheetOrientation": "auto",
  "format": "jpeg",
  "background": {"enabled": false, "color": "#ffffff", "tolerance": 32}
}
```

`dataUrl`, `landmarks`, `sheetStyle` (`edge-to-edge` or `cut-marks`) and `sheetOrientation` (`auto`, `portrait` or `landscape`) are optional. `outputKind` is optional (`single` or `sheet`) and restores the browser preview/export intent; explicit CLI `render` and `sheet` commands choose their named output kind. Source width/height must match the decoded oriented image. `format` is `jpeg`, `png`, `pdf`, or `original` (only online presets). `source.mime` may also be `image/heic` or `image/heif`, but only in projects for original modes. General ID optionally adds `customSize: {widthMm,heightMm}` in the range 10–100 × 10–150 mm. Background replacement is available for print and general presets, never for original modes. For US, UK and Australia passports it is off by default because those authorities' rules forbid altering the photo, and outputs that use it carry the metadata note "Background replaced with PortraitPass". A mask is stored only while background replacement is on; when it is off the mask is dropped on validation. `landmarks` (head positions) are saved only when set. When enabled, the background requires `maskDataUrl`, a PNG data URL at exactly the source’s oriented dimensions with alpha 0 for background and 255 for foreground (fractional alpha supported). The interactive browser creates this mask; Node consumes it deterministically. `tolerance` is reserved editor metadata (0–100), not a second segmentation algorithm. Maximum mask data URL length is 20 million characters. Without a saved mask, Node background rendering fails with `MASK_REQUIRED`. Original modes reject an enabled background (`BACKGROUND_FORBIDDEN`).

## MCP stdio

After `pnpm install`, use the executable wrapper below for a clean stdio transport. Package-manager lifecycle messages can pollute stdout, so do not put `pnpm mcp` directly in an MCP client configuration.

```json
{
  "mcpServers": {
    "portraitpass": {
      "command": "/absolute/path/to/portraitpass/scripts/portraitpass-mcp",
      "args": []
    }
  }
}
```

Tools expose JSON-schema input/output and structured `{ok,result,error}` envelopes:

All path arguments (`input`, `projectPath`, `output`) must be absolute; relative paths fail with `PATH_NOT_ABSOLUTE`. Other rules match the CLI: format inferred from the output extension (`FORMAT_EXTENSION_MISMATCH`), original modes fail with `ORIGINAL_NOT_ACCEPTED` and its `issues`, a `presetId` that differs from `projectPath`'s preset is `PRESET_PROJECT_CONFLICT`, and the source and project files are never overwritten. `overwrite` and `paperId` have no schema default: omit them and the project's value (or `false`, or `4x6` for new projects) applies. Results carry `checks`, `warnings` and `backgroundReplaced` as described above. Error results set `isError` and use the same codes as the CLI exit table; `DOCUMENT_NOTICES` is not exposed.

| Tool | Purpose | Key arguments |
| --- | --- | --- |
| `portraitpass_presets` | List presets, papers, sources and notes | none |
| `portraitpass_inspect` | Decode source metadata, optional original guidance | `input`, optional `presetId` |
| `portraitpass_crop` | Propose centered/manual-landmark crop | `input`, `presetId`, optional `landmarks` |
| `portraitpass_layout` | Pure sheet geometry, placements and cut marks or edge guides | `presetId`, `paperId`, optional `dpi`, `sheetStyle`, `sheetOrientation` |
| `portraitpass_render` | One image/PDF or unchanged original | `output`, `input` or `projectPath`, optional `presetId`, `format`, `crop`, `dpi`, `overwrite` |
| `portraitpass_sheet` | Print sheet image/PDF | render arguments plus `paperId`, `sheetStyle`, `sheetOrientation` |
| `portraitpass_digital` | One JPEG at exact pixels within a KB range | `output`, `widthPx`, `heightPx`, `input` or `projectPath`, optional `presetId`, `minKB`, `maxKB`, `kbBytes` (1000 or 1024), `crop`, `overwrite` |
| `portraitpass_project` | Save portable browser handoff | `input`, `presetId`, `output`, optional `overwrite` |

Example `tools/call` arguments:

```json
{"name":"portraitpass_sheet","arguments":{"input":"/absolute/photo.jpg","presetId":"uk-passport","paperId":"4x6","format":"pdf","output":"/absolute/sheet.pdf","overwrite":false}}
```

No network is involved. MCP logs use no source bytes; a tool call can write only its explicit output destination. PDF metadata (subject, creator and keywords) carries the note "PortraitPass, an independent open-source tool, not affiliated with any government." Prepared JPEG and PNG files get an XMP note, "Background replaced with PortraitPass", only when the background was replaced; PDFs list it in their keywords in that case. Keep output previews and a person’s photo review in your workflow before the photo is submitted anywhere.
