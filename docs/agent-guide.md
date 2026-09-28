# PortraitPass for agents

PortraitPass runs entirely on the local machine. No API key, external model, upload or server is needed for the core, CLI or MCP. The browser provides human review and an optional local segmentation mask. Preparation does not certify acceptance. Follow each preset’s official source.

From the repository root:

```sh
pnpm install
./scripts/portraitpass presets --json
./scripts/portraitpass inspect --input /absolute/photo.jpg --preset us-online --json
./scripts/portraitpass crop --input /absolute/photo.jpg --preset uk-passport --json
./scripts/portraitpass render --input /absolute/photo.jpg --preset us-passport --format png --output /absolute/photo-sized.png --json
./scripts/portraitpass sheet --input /absolute/photo.jpg --preset uk-passport --paper 4x6 --format pdf --output /absolute/print-sheet.pdf --json
./scripts/portraitpass project --input /absolute/photo.jpg --preset uk-passport --embed --output /absolute/photo.portraitpass.json --json
./scripts/portraitpass render --project /absolute/photo.portraitpass.json --format jpeg --output /absolute/approved-crop.jpg --json
```

Open the saved project in the browser studio to review it. `--embed` makes a CLI project portable; without it, supply `--input` again when rendering. MCP project handoffs always embed the source. Source bytes can contain identifying EXIF metadata; project files and original-mode outputs intentionally preserve original bytes. Save and share them intentionally. Prepared PNG/JPEG exports normalize orientation and strip source EXIF except generated print metadata.

## Presets and coordinates

- `us-passport`: printed 50.8 × 50.8 mm, crown-to-chin 25.4–34.925 mm (1–1⅜ inches).
- `uk-passport`: printed 35 × 45 mm, crown-to-chin 29–34 mm.
- `au-passport`: printed 35 × 45 mm (one permitted size), crown-to-chin 32–36 mm. Official Australian guidance requires dye-sublimation glossy prints, not inkjet.
- `general-id`: default 35 × 45 mm, optional custom dimensions and background mask; no passport suitability claim.
- `us-online`, `uk-online`: unchanged original bytes only; no crop, sheet or alternate format.

All crop and landmark coordinates are in **oriented original pixels**. `crop` is `{x,y,width,height}`. `landmarks` is `{centerX,crownY,eyesY,chinY}`. To propose a crop from manually reviewed landmarks:

```sh
./scripts/portraitpass crop --input /absolute/photo.jpg --preset uk-passport --landmarks '{"centerX":600,"crownY":250,"eyesY":550,"chinY":1050}' --json
./scripts/portraitpass render --input /absolute/photo.jpg --preset us-passport --crop '{"x":0,"y":200,"width":1200,"height":1200}' --output /absolute/crop.jpg --json
./scripts/portraitpass layout --preset uk-passport --paper a4 --json
```

Default output is 300 DPI; `--dpi` accepts 72–600. Papers are `4x6`, `a4`, `letter`, portrait orientation. Safe print margins and gaps are 3 mm. Thus a 4×6 sheet holds two US 2×2 photos or six 35×45 photos. Print PDFs at actual size / 100%, with fit-to-page disabled. JPEG/PNG pixel dimensions are rounded to nearest pixel; PDF photo and paper sizes use physical millimetres exactly. Canvas and Sharp use different resampling filters; fractional source boundaries can differ by less than one source pixel. The stored source/crop dimensions remain identical.

## JSON and file safety

For machine consumers use `./scripts/portraitpass`; `pnpm cli` is a human convenience and package-manager messages may appear on stdout. The direct CLI emits a JSON envelope: `{ "ok": true, "result": ... }` or `{ "ok": false, "error": { "code": "...", "message": "..." } }`; `--json` makes it compact. Exit codes: `0` success, `2` invalid command/data, `3` missing/unreadable/unsupported source, `4` output conflict/write failure. No claim of document acceptance appears in output.

Outputs use exclusive creation by default. `--overwrite` must be explicit; source files and source symlink aliases remain protected. Parent output directories must exist. No destination path is inferred from a project. Paths may be absolute or relative to the working directory; this is a local file tool, not a sandbox. Give it access only to files you intend it to read and write. Source limits: 20 MiB and 40 megapixels; source formats: single-frame JPEG, PNG, WebP. Portable JSON limit: 60 MiB. Unknown project versions, invalid geometry and insufficient crop resolution fail before rendering.

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
  "format": "jpeg",
  "background": {"enabled": false, "color": "#ffffff", "tolerance": 32}
}
```

`dataUrl` and `landmarks` are optional. `outputKind` is optional (`single` or `sheet`) and restores the browser preview/export intent; explicit CLI `render` and `sheet` commands choose their named output kind. Source width/height must match the decoded oriented image. `format` is `jpeg`, `png`, `pdf`, or `original` (only online presets). General ID optionally adds `customSize: {widthMm,heightMm}` in the range 10–100 × 10–150 mm. Background is only enabled in General ID; it requires `maskDataUrl`, a PNG data URL at exactly the source’s oriented dimensions with alpha 0 for background and 255 for foreground (fractional alpha supported). The interactive browser creates this mask; Node consumes it deterministically. `tolerance` is reserved editor metadata (0–100), not a second segmentation algorithm. Maximum mask data URL length is 20 million characters. Save and validate the mask before attempting Node background rendering.

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

| Tool | Purpose | Key arguments |
| --- | --- | --- |
| `portraitpass_presets` | List presets, papers and official sources | none |
| `portraitpass_inspect` | Decode source metadata, optional original guidance | `input`, optional `presetId` |
| `portraitpass_crop` | Propose centered/manual-landmark crop | `input`, `presetId`, optional `landmarks` |
| `portraitpass_layout` | Pure sheet geometry, placements and cut marks | `presetId`, `paperId`, optional `dpi` |
| `portraitpass_render` | One image/PDF or unchanged original | `output`, `input` or `projectPath`, optional `presetId`, `format`, `crop`, `dpi`, `overwrite` |
| `portraitpass_sheet` | Print sheet image/PDF | render arguments plus `paperId` |
| `portraitpass_project` | Save portable browser handoff | `input`, `presetId`, `output`, optional `overwrite` |

Example `tools/call` arguments:

```json
{"name":"portraitpass_sheet","arguments":{"input":"/absolute/photo.jpg","presetId":"uk-passport","paperId":"4x6","format":"pdf","output":"/absolute/sheet.pdf","overwrite":false}}
```

No network is involved. MCP logs use no source bytes; a tool call can write only its explicit output destination. Keep output previews and a person’s photo review in your workflow before official submission.
