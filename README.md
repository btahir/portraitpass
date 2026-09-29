<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/hero-dark.webp">
  <img src="docs/screenshots/hero-light.webp" alt="PortraitPass private photo studio: select a document, frame a synthetic demo photo and preview an accurately sized print sheet" width="1000">
</picture>

# PortraitPass

**Passport photos, sized exactly. Every measurement shown, your face never edited, 40¢ to print.**

**[Open PortraitPass →](https://portraitpass.vercel.app)** · [All 49 documents](https://portraitpass.vercel.app/documents/) · [Dataset (JSON)](https://portraitpass.vercel.app/data/documents.json)

A free, open-source (MIT) photo studio that runs in your browser. Pick a document, add a photo, and it frames the photo to the published size, shows the measurements, and exports a print sheet, a single photo or an upload file. No account, upload, paywall or watermark. Your photo never leaves your device.

Pages for [US passport 2×2](https://portraitpass.vercel.app/us-passport-photo/), [UK passport 35×45 mm](https://portraitpass.vercel.app/uk-passport-photo/), [Schengen visa](https://portraitpass.vercel.app/schengen-visa-photo/), [DV lottery 600×600](https://portraitpass.vercel.app/dv-lottery-photo/), [India OCI](https://portraitpass.vercel.app/in-oci-photo/) and 44 more documents, in 7 languages.

PortraitPass is an independent open-source project, not affiliated with or endorsed by any government or passport office. We check sizes and positions; the issuing authority decides acceptance.

## Features

- **49 documents, each with its source.** Passports, visas, ID and residence cards, a lottery and four exam forms across 22 countries and regions. Every entry links to the issuing authority's page and shows the date it was last checked.
- **Auto-framing on your device.** After a one-line notice, face detection runs in your browser and frames the photo to the document's head and eye ranges. Drag, zoom and arrow keys always work.
- **Live measurements and photo checks.** Head height, eye line, centring and resolution against the document's range, plus measure-only checks for background evenness, shadow and colour, lighting, exposure and sharpness. Each shows its value and the allowed range. A "You check" list covers what software cannot judge: expression, glasses, how recent the photo is.
- **Print six for about 40¢.** A 6-up 4×6 in sheet, edge to edge, for a pharmacy photo counter (prices vary). Landscape packing fits 8 photos of 35×45 mm on the same paper. A4 and US Letter sheets have cut marks. Output is JPEG, PNG or a PDF at exact physical size.
- **Exact digital uploads.** A JPEG at the exact pixel size with the file size inside the form's range, for example 600×600 px at 240 KB or less, or 20 to 50 KB. Where a document wants the untouched camera file (US online renewal, UK online), the original is passed through unchanged.
- **Camera capture with hints.** A live overlay shows the head outline and eye line, with on-device hints for face found, distance, tilt and lighting, and a timer. Nothing is recorded or uploaded.
- **Not-DIY documents are labelled.** 14 of the 49 need a photographer, booth, certified provider or the office (Canada and Germany passports, for example). They get an explanation, never a preset.
- **Offline and installable.** After the first visit the site works offline and can be installed as an app. The face model is stored the first time face assist runs.
- **7 languages.** Document, size and print-guide pages are in English, Spanish, Portuguese, Hindi, Bengali, Urdu and Arabic. The studio and home page are in English.

## Privacy

Your photo never leaves your device. Face detection, framing, background checks and every export run in your browser. There is no account, no cookies, no analytics and no third-party scripts; fonts and models are self-hosted.

The site is hosted on Vercel, which, like any host, logs request data such as IP addresses. That is separate from your photo, which is never sent. Tips go through Stripe and are handled there.

Photos stay in memory unless you save a project or download an output. A project file contains the photo, settings and head positions (set by you or found by face detection), and the background mask only while background replacement is on. The photo keeps its original metadata, and original-file exports preserve the same bytes, so share project files deliberately.

Site pages: [privacy](https://portraitpass.vercel.app/privacy/), [terms](https://portraitpass.vercel.app/terms/) (provided as is, no warranty), [accessibility](https://portraitpass.vercel.app/accessibility/), [about](https://portraitpass.vercel.app/about/).

## What it doesn't do

- **Decide acceptance.** We check sizes and positions; the issuing authority decides acceptance. Photo rules change, so read the source page linked beside each document before you apply.
- **Edit your face.** No retouching, smoothing or reshaping. The only edit on offer is an optional background replacement, off by default for documents whose rules forbid altered photos, with a warning at the toggle. Output with a replaced background carries a metadata note.
- **Judge everything.** Expression, glasses, head coverings, likeness and recency are yours to check against the source rules.
- **Replace a photographer where one is required.** Canada's passport photo must come from a commercial photographer. German passport photos are digital-only through the authority or a certified provider.
- **Print for you.** Export the sheet and order it at a photo counter.
- **Cover every document.** 49 documents is a start, not a full list.

## Run locally

```sh
pnpm install && pnpm dev
```

Open http://127.0.0.1:4319. Needs Node.js 24+ and pnpm 11+. `pnpm build` type-checks, builds and prerenders a static site into `dist/` (399 pages: one per document, size and print guides, legal pages, seven languages, sitemaps, social cards and the dataset JSON). Other scripts: `pnpm typecheck`, `pnpm test` (core and Node tests, including real CLI and MCP processes), `pnpm test:e2e` (builds, then Playwright with installed Chrome).

## For AI assistants (CLI and MCP)

The website is the product. The command-line tool and MCP server are small extras that run the same TypeScript core on local files, with no network. There is no npm package: clone the repository and run `pnpm install`. Use the wrappers, not `pnpm`, so stdout stays clean.

```sh
./scripts/portraitpass presets --json
./scripts/portraitpass inspect --input /path/photo.jpg --preset us-passport --json
./scripts/portraitpass sheet --input /path/photo.jpg --preset uk-passport --paper 4x6 --output /path/sheet.pdf --json
./scripts/portraitpass digital --input /path/photo.jpg --preset dv-lottery --width 600 --height 600 --max-kb 240 --kb-bytes 1000 --output /path/dv.jpg --json
./scripts/portraitpass-mcp
```

- **CLI commands:** `presets`, `inspect`, `crop`, `render`, `sheet`, `digital`, `project`, `layout`. Sheet flags: `--layout edge-to-edge|cut-marks` and `--orientation auto|portrait|landscape`. `digital` writes one JPEG at exact `--width` and `--height` inside `--min-kb` to `--max-kb`, never enlarging.
- **MCP tools** (stdio, absolute paths only): `portraitpass_presets`, `portraitpass_inspect`, `portraitpass_crop`, `portraitpass_layout`, `portraitpass_render`, `portraitpass_sheet`, `portraitpass_digital`, `portraitpass_project`. Results carry `checks` and `warnings`; head height and eye line are measurements, not blockers.
- **Presets:** any document id that can be made at home works as `--preset` or `presetId` (35 of the 49); `presets` lists only the six original presets. Not-DIY documents fail with `NOT_DIY`. The measure-only photo analysis is a library function (`analyzePhoto`, `analyzeFile`), not a CLI or MCP command.

Schemas, exit codes and MCP configuration: [docs/agent-guide.md](docs/agent-guide.md). Repository instructions: [AGENTS.md](AGENTS.md). The site serves [llms.txt](https://portraitpass.vercel.app/llms.txt).

## The document dataset

The open, MIT-licensed core of the project. The site, CLI and MCP all read the same TypeScript files, and the built site serves the whole set as [JSON](https://portraitpass.vercel.app/data/documents.json).

- Types and export: `src/core/documents.ts` (`DocumentSpec`, `DOCUMENTS`).
- Entries: `src/core/data/us.ts`, `south-asia.ts`, `europe.ts`, `world.ts`.
- Bridge to the studio: `src/core/catalog.ts` (`documentPreset`, `documentDigitalTarget`, `searchDocuments`, `presetForId`).

| Field | Meaning |
| --- | --- |
| `id`, `name`, `country`, `countryCode`, `kind` | Stable kebab-case id (`us-passport`, `in-oci`, `dv-lottery`), display name, ISO code or `EU`, and passport / visa / id-card / residence / citizenship / lottery / exam-form / other |
| `diy` | `yes` (home photo accepted, 27 documents), `digital-only` (upload only, 8) or `no` (photographer, booth, provider or office, 14); `diyNote` says why or gives the caveat |
| `print` | Size in mm, crown-to-chin range, eye-line range measured up from the bottom edge, copies, paper |
| `digital` | Exact or min/max pixels, KB range and whether a KB is 1000 or 1024 bytes, accepted formats, head and eye ratios, `originalOnly` |
| `background` | Colours in plain words, and `edit`: `forbidden` or `unspecified` (`allowed` is in the schema, unused so far) |
| `rules` | Short plain facts from the source: glasses, expression, recency, head coverings |
| `sources` | URL, title, `checkedAt` (YYYY-MM-DD) and `kind` (`primary` or `secondary`) |
| `searchTerms` | Phrases people search for |

**Sources.** Numbers come from the issuing authority's own page or form, never from photo-service sites, and each source carries the date it was checked (all 2026-09-28 in this release). Some authority sites (for example travel.state.gov) block automated fetches. For those, part of an entry was read from search-result text on the authority's own domain instead of the page itself; those entries need a human re-check against the live page. Treat the dataset as a well-sourced starting point, not a legal record.

**Wrong number?** [Open an issue](https://github.com/btahir/portraitpass/issues) with the source link. Rules change, so every source URL is meant to be re-checked monthly.

## Contributing

To add or correct a document, edit the matching file in `src/core/data/`:

1. Use a primary source on the issuing authority's own domain. Set every number from it, and set `checkedAt` to the day you read it. Change numbers, `rules` and `checkedAt` together.
2. Follow the `kbBytes` rule at the top of `src/core/data/us.ts` (1000 or 1024) and keep wording plain: no "compliant", "approved", "guaranteed" or "verified".
3. Run `pnpm typecheck && pnpm test`. `tests/core/documents.test.ts` checks unique ids, https sources with dates, ordered ranges, KB units and banned claim words. `pnpm build` regenerates the document's page, its social card and the dataset JSON.

Pull requests for the code, translations and accessibility are welcome too. Keep photo handling on the device: no upload, analytics or third-party scripts.

## License and support

Code and dataset are [MIT](LICENSE). Dependency, model, font and demo-image provenance is in [CREDITS.md](CREDITS.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Document sizes cite the issuing authority's published guidance by URL; that is attribution, not endorsement. The demo portraits are synthetic; never submit one with an application.

Tips are optional and unlock nothing: [support PortraitPass](https://portraitpass.vercel.app/support/).
