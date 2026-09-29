<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/hero-dark.webp">
  <img src="docs/screenshots/hero-light.webp" alt="PortraitPass private photo studio: select a document, frame a synthetic demo photo and preview an accurately sized print sheet" width="1000">
</picture>

# PortraitPass

**Passport photos, sized exactly. Every measurement shown, your face never edited, 40¢ to print.**

PortraitPass is a free, open-source (MIT) photo studio that runs in your browser. Choose a document, line up the guides, and export a single photo or a print sheet you can take to a photo counter. No account, upload, paywall or watermark. Your photo never leaves your device.

PortraitPass is an independent open-source project, not affiliated with or endorsed by any government or passport office.

The website is the product. The command-line tool and MCP server are small extras so an AI assistant can do the same sizing work on local files. There is no npm package.

## Try it locally

```sh
pnpm install && pnpm dev
```

Open [the studio](http://localhost:4319). Requires Node.js 24+ and pnpm 11+. `pnpm build` produces a static site in `dist/` for hosting of your choice. The intended public address is https://portraitpass.vercel.app (not deployed yet).

## What this tool does and doesn't do

**It does:**

- Size and crop a photo to a document's published dimensions (for example US 2×2 inches, UK and Australia 35×45 mm) and show the measurements: head height, eye line, centring, resolution. Head height and eye line are measurements, not blockers: an out-of-range value is shown and reported, and you can still export.
- Lay out print sheets (4×6 in, A4, US Letter) at real physical size, with margins and cut marks, as JPEG, PNG or PDF.
- Return the original file unchanged for online applications that want the untouched photo (US renewal, UK online).
- Save your photo and settings as a portable project file.
- Work offline once the page has loaded.

**It doesn't:**

- Decide whether a photo will be accepted. We check sizes and positions; the issuing authority decides acceptance. Expression, glasses, lighting, likeness and how recent the photo is are yours to check against the source rules linked beside each document.
- Retouch faces or change how you look. Your face is never edited. Optional background replacement exists for print and general presets; see below.
- Make photos for documents that cannot be made at home. Canadian passport photos must be taken by a commercial photographer, and German passport and ID card photos have been digital-only through the authority or a certified provider since 1 May 2025. These are listed with an explanation, never as a preset.
- Print for you. Export a 4×6 sheet and order it at a photo counter (roughly 40¢ at many drugstores; prices vary).

### Document notes

| Document | Mode | What to know |
| --- | --- | --- |
| US passport | print | Someone else takes the photo, or use a tripod. Selfies are not accepted. The State Department does not accept photos changed with software, filters or AI. |
| UK passport, print | print | HM Passport Office asks for professionally printed photos that are not cut down from a larger picture. A photo lab or booth is the safer route. Applying online? Use the UK online original mode. |
| Australia passport | print | Print at a photo lab: dye-sublimation, glossy paper of at least 200 gsm. Home inkjet prints are not accepted. |
| General ID | general | Custom dimensions for uses where you know the receiving organisation's rules. |
| US renewal, UK passport online | original | Your file is returned unchanged; no crop, no edits. US accepts JPEG, PNG, HEIC and HEIF. |

Each preset records its source URL (for example travel.state.gov) and the date the rules were last checked. Rules change; check the source before you apply.

### Background replacement

Available for print and general presets, using an on-device segmentation model. For documents whose rules forbid altering the photo (US, UK and Australia passports) it is off by default and shows a warning at the toggle; retaking the photo against a plain wall is the safer choice. Outputs with a replaced background carry a metadata note, "Background replaced with PortraitPass". Original modes never edit.

## Features

- **Direct control:** drag and zoom, keyboard adjustment, crown/chin/eye guides, original comparison, reset and undo.
- **Exact print output:** 300 DPI JPEG/PNG (up to 600 DPI), exact-sized PDF, 4×6 / A4 / US Letter sheets, margins and cut marks. No silent upscaling. Print PDFs at actual size / 100% with fit-to-page off.
- **Portable projects:** versioned JSON with your photo and settings; reopen in the browser or hand to an agent.
- **One geometry model:** the studio, CLI and MCP tools share the same deterministic library.
- **Details:** light and dark themes, mobile layout, self-hosted fonts and models.

![PortraitPass studio with a synthetic demonstration portrait](docs/screenshots/studio-light.webp)

The pictured portrait is synthetic demonstration material. Never submit a generated demo photo with an identity application.

## Privacy

Your photo never leaves your device. Face detection and background segmentation run in your browser; we never receive your photo or face data. There is no account, no cookies, no analytics and no third-party scripts. Fonts and models are self-hosted.

The site is hosted on Vercel, which, like any host, logs request data such as IP addresses. That is separate from your photo, which is never sent. Tips go through Stripe and are handled there.

Photos stay in memory unless you save a project or download an output. Project files contain the photo, settings, head positions if set, and the background mask only while background replacement is on. The photo keeps any original metadata, and original-mode exports preserve the same bytes, so share project files deliberately. Prepared print exports normalise orientation and add print metadata.

Site pages: `/privacy/`, `/terms/` (provided as is, no warranty), `/accessibility/`.

## For agents

```sh
./scripts/portraitpass presets --json
./scripts/portraitpass inspect --input /path/photo.jpg --json
./scripts/portraitpass sheet --input /path/photo.jpg --preset uk-passport --paper 4x6 --output /path/sheet.pdf --json
./scripts/portraitpass project --input /path/photo.jpg --preset uk-passport --embed --output /path/handoff.portraitpass.json --json
./scripts/portraitpass-mcp
```

Use the direct wrappers, not `pnpm`, so stdout stays clean for JSON and stdio. Every CLI operation returns a structured JSON envelope. The local stdio MCP server exposes inspect, presets, crop, layout, render, sheet and project tools with input and output schemas.

Behaviour worth knowing:

- Output format is inferred from the output file extension (`.jpg`, `.png`, `.pdf`); a `--format` that contradicts it, or an unsupported extension such as `.webp`, is an error.
- Output paths are explicit, overwrite is opt-in, and source files and `--project` files cannot be overwritten.
- Original modes exit non-zero (`ORIGINAL_NOT_ACCEPTED`, with the list of issues) when the file is outside the size, resolution or type limits, as the browser does.
- HEIC and HEIF are only valid for the US online renewal original, which passes them through unchanged. Print and general presets reject them (`UNSUPPORTED_IMAGE`, also when saving a project); convert to JPEG first.
- A `--preset` that differs from the `--project` file's preset is an error; the project decides.
- MCP tools require absolute paths.
- `render` and `sheet` results include `checks` (head, eyes, centre and resolution measurements, each `pass`, `fail` or `unknown`), `warnings` and `backgroundReplaced`. Head height and eye line are measurements, not blockers: a `fail` adds a warning but the file is still written. Only crop outside the photo, wrong proportions and too few pixels stop a render. Landmarks are saved in a project only when set; without them those checks are `unknown`.
- PDF metadata includes an independence note. JPEG and PNG outputs get an XMP note only when the background was replaced.
- `DOCUMENT_NOTICES` (Canada, Germany) is in the core library only; the CLI and MCP `presets` output lists DIY presets.

See [the agent guide](docs/agent-guide.md) for the project format, limits, exit codes and MCP configuration. Project instructions are in [AGENTS.md](AGENTS.md); the static site serves `llms.txt`.

## Develop and verify

```sh
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Core tests parse exported images and PDFs, check preset and paper combinations and run real CLI and MCP processes. Browser tests cover input, positioning, project handoff, original-byte preservation, exports, accessibility and privacy. Use installed Chrome for browser checks; no additional browser download is needed.

`src/core/` is the pure TypeScript geometry, spec and project library. `src/node/` contains the Sharp/PDF renderers, CLI and MCP. The browser uses the shared geometry with Canvas. Resampling can differ slightly between engines; physical dimensions and stored project coordinates share one model.

## License and support

Code is [MIT](LICENSE). Dependency, model, font and demo-asset provenance is in [CREDITS.md](CREDITS.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Document dimensions cite the issuing authority's published guidance by URL; that is attribution, not endorsement.

Tips are optional and unlock nothing: [support PortraitPass](https://portraitpass.vercel.app/support/).
