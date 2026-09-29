# PortraitPass agent instructions

Use the shared deterministic library in `src/core/index.ts`; browser Canvas and Node Sharp are rendering adapters. Read [docs/agent-guide.md](docs/agent-guide.md) for CLI, MCP, project schema, document dataset, original-photo policy and worked examples.

The website is the product. The CLI and MCP server are thin extras for AI assistants. There is no npm package.

## Product rules

- All photo operations remain local. No backend, API keys, analytics, upload or generated identity features. Your photo never leaves the device.
- Positioning: "Passport photos, sized exactly. Every measurement shown, your face never edited, 40¢ to print." We check sizes and positions; the issuing authority decides acceptance. Head height and eye line are measurements, never download blockers (browser and Node alike); results carry `checks` and `warnings`.
- Wording: do not use "compliant", "approved", "guaranteed" or "verified" as claims, and do not use "official" as a claim of status. Citing a source ("source: travel.state.gov") is fine. Say "tips", not "donations". Write plainly; no marketing filler, no emoji.
- Independence statement, used on every site page and in PDF metadata: "PortraitPass is an independent open-source project, not affiliated with or endorsed by any government or passport office." No government imagery, seals or styling.
- The face is never edited. Optional background replacement (on-device mask) exists for print and general presets. Where a document's rules forbid alteration (`background.edit: "forbidden"`) it is off by default with a warning, and outputs carry the note "Background replaced with PortraitPass". Digital original modes copy bytes unchanged (no crop, no edits, no print sheet) and never edit.
- Saved projects include head positions when they are known (set by hand or found by face detection); the background mask is saved only while background replacement is on.

## The document dataset

- `DOCUMENTS` in `src/core/documents.ts` (entries in `src/core/data/us.ts`, `south-asia.ts`, `europe.ts`, `world.ts`) is the open spec dataset: 49 documents, each with print and/or digital specs, background colours and edit rule, plain rules, `diy` status (`yes`, `digital-only`, `no`), `diyNote`, `sources` (URL, title, `checkedAt`, `kind`) and `searchTerms`. The site, CLI, MCP, prerendered pages and llms.txt all read it. Do not invent country formats; every number needs a source on the authority's own domain and a check date.
- `src/core/catalog.ts` turns entries into presets (`documentPreset`), exact upload targets (`documentDigitalTarget`), search (`searchDocuments`) and `presetForId`. `getPreset` resolves the six legacy preset ids first, then any dataset document id, so dataset ids work as `--preset`, `presetId` and in project files (`validateProject` uses `getPreset`).
- Documents with `diy: "no"` (14 today, including the Canadian and German passports) have no preset and are never substituted.
- KB units: each digital spec sets `kbBytes` (1000 or 1024) by the rule at the top of `src/core/data/us.ts`. Keep it when editing.
- Some authority sites block automated fetches, so parts of some entries rest on search-result text from the authority's domain. Evidence logs live in `notes/dataset/` (gitignored). Flag an entry rather than guess.
- Re-check process: monthly, open every source URL, compare with the entry, change numbers and `checkedAt` together, and keep `tests/core/documents.test.ts` passing. A changed rule that affects a generated page changes the page on the next build.
- Shared strings live in `src/core/text.ts` (`INDEPENDENCE_NOTE`, `BACKGROUND_NOTE`) and `src/config.ts` (`DISCLAIMER`, `DOWNLOAD_NOTE`, `FACE_NOTICE`); import them, do not retype them.

## Checks and analysis

- `measurementChecks` (core, `src/core/geometry.ts`) gives head, eyes, centre and resolution as `pass`, `fail` or `unknown`. `render`, `sheet` and `digital` return them in `checks`, with `warnings`.
- `analyzePhoto` (`src/core/analysis.ts`; `analyzeFile` in `src/node/analysis.ts`) is measure-only: background evenness, shadow and colour, face lighting, exposure and sharpness, each `pass`, `warn` or `unknown` with a value and a tip. It never edits a photo, and it is not exposed by the CLI or MCP tools yet.
- Never turn a check into an approval. "Measurements fit" is the strongest wording.

## Interfaces

- CLI: `./scripts/portraitpass` with `presets`, `inspect`, `crop`, `render`, `sheet`, `digital`, `project`, `layout`. MCP: `./scripts/portraitpass-mcp` with 8 tools (`portraitpass_presets`, `_inspect`, `_crop`, `_layout`, `_render`, `_sheet`, `_digital`, `_project`). `presets` lists the six original presets only.
- Sheets: `--layout edge-to-edge|cut-marks` (MCP `sheetStyle`) and `--orientation auto|portrait|landscape` (MCP `sheetOrientation`), also stored on a project as `sheetStyle` and `sheetOrientation`. Defaults: edge-to-edge on 4x6, cut-marks on A4 and Letter, orientation auto.
- `digital` writes one JPEG at exact pixels inside a KB range (never enlarges, quality search, `FILE_SIZE_UNREACHABLE`, `LOW_RESOLUTION`, `ORIGINAL_ONLY`). Its size and KB flags are not read from the dataset; pass the numbers from the document's `digital` spec.
- Version 1 projects are plain JSON; validate untrusted projects before use. Explicit output paths only, no overwrite by default, never overwrite the source or the `--project` file (`SOURCE_OVERWRITE`). MCP tools require absolute paths (`PATH_NOT_ABSOLUTE`). Exit codes: 2 invalid, 3 input (including `ORIGINAL_NOT_ACCEPTED`), 4 output, 1 internal. Source paths are local inputs, not web URLs. HEIC/HEIF sources are valid only for original passthrough of a document that accepts them (the US online renewal); other presets reject them with `UNSUPPORTED_IMAGE`, including when saving a project.

## Site and offline

- Live at https://portraitpass.vercel.app (GitHub: btahir/portraitpass). Site pages: `/`, `/studio/`, `/documents/`, one page per document, size and print pages, `/about/`, `/privacy/`, `/terms/`, `/accessibility/`, `/support/`, in English and, for documents, size pages, print guides and `/documents/`, six translated prefixes (`/es/`, `/pt/`, `/hi/`, `/bn/`, `/ur/`, `/ar/`); the home page, studio and legal pages are English. `scripts/prerender.ts` prerenders all 399 pages (397 indexable) plus the sitemap index and one sitemap per language, `robots.txt`, 56 social cards in `dist/og/` and the dataset at `dist/data/documents.json`.
- SEO tooling: `scripts/seo-audit.ts <built folder> [--live URL]` audits a build; `scripts/indexnow.ts` (run by hand after a deploy, `--dry` first) tells Bing and other IndexNow engines which URLs changed. `scripts/make-icons.ts` and `scripts/make-og.ts` regenerate the icons and the default social card.
- A service worker (`public/sw.js`) and manifest make the site installable and usable offline after the first visit (registered by `src/pwa.ts`). It stores only the site's own files; photos never reach it.
- The host (Vercel) logs request data; the site sets no cookies and loads no third-party scripts. Fonts and models are self-hosted.

## Working here

- Use `pnpm dev`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`. Heavy browser/build jobs go through `../research/heavy.sh` in this workspace; Chrome headless only, at most two workers. Never install another browser.
- Keep public documentation, source, tests and licenses consistent. `ACCEPTANCE.md`, `BRIEF.md`, `PLAN.md`, `notes/` and `docs/launch/`, `docs/design/` are internal and gitignored. No GitHub automation, publication or external services.
- Local checks must cover geometry, parsed physical output, actual CLI and MCP calls, browser handoff, privacy and keyboard accessibility. Tests do not replace human photo review.
- Deploy and publish only when the owner approves. Support and tips live on the site's own `/support/` page.
