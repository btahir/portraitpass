# PortraitPass agent instructions

Use the shared deterministic library in `src/core/index.ts`; browser Canvas and Node Sharp are rendering adapters. Read [docs/agent-guide.md](docs/agent-guide.md) for CLI, MCP, project schema, original-photo policy and worked examples.

The website is the product. The CLI and MCP server are thin extras for AI assistants. There is no npm package.

- All photo operations remain local. No backend, API keys, analytics, upload or generated identity features. Your photo never leaves the device.
- Positioning: "Passport photos, sized exactly. Every measurement shown, your face never edited, 40¢ to print." We check sizes and positions; the issuing authority decides acceptance. Head height and eye line are measurements, never download blockers (browser and Node alike); results carry `checks` and `warnings`.
- Wording: do not use "compliant", "approved", "guaranteed" or "verified" as claims, and do not use "official" as a claim of status. Citing a source ("source: travel.state.gov") is fine. Say "tips", not "donations".
- Independence statement, used on every site page and in PDF metadata: "PortraitPass is an independent open-source project, not affiliated with or endorsed by any government or passport office." No government imagery, seals or styling.
- Digital original modes copy bytes unchanged; no crop, no edits, no print sheet. Print and general presets may replace the background (on-device mask). Where a document's rules forbid alteration (US, UK, Australia passports) it is off by default with a warning, and outputs carry the note "Background replaced with PortraitPass". Original modes never edit.
- Some documents are not DIY (Canadian passport, German passport and ID card). They live in `DOCUMENT_NOTICES` in the core library (not surfaced by the CLI or MCP), never as presets.
- Every preset needs a primary source URL and check date, and records `backgroundEdit` and any `notes` (US: no selfies; UK print: professional print, not cut down; Australia: photo-lab dye-sublimation). Do not invent country formats.
- The shared disclaimer and background-note strings live in `src/core/text.ts` (`INDEPENDENCE_NOTE`, `BACKGROUND_NOTE`); import them, do not retype them.
- The background mask is saved in a project only while background replacement is on; validation drops it otherwise. Landmarks (head positions) are saved only if you set them.
- Version 1 projects are plain JSON; validate untrusted projects before use. Explicit output paths only, no overwrite by default, never overwrite the source or the `--project` file (`SOURCE_OVERWRITE`). MCP tools require absolute paths (`PATH_NOT_ABSOLUTE`). Exit codes: 2 invalid, 3 input (including `ORIGINAL_NOT_ACCEPTED`), 4 output, 1 internal. Source paths are local inputs, not web URLs. HEIC/HEIF sources are valid only for the US online original (passthrough); print and general presets reject them with `UNSUPPORTED_IMAGE`, including when saving a project.
- Site pages: `/privacy/`, `/terms/`, `/accessibility/`, `/support/`. The host (Vercel) logs request data; the site sets no cookies and loads no third-party scripts. Fonts and models are self-hosted.
- Use `pnpm dev`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`. Heavy browser/build jobs go through `../research/heavy.sh` in this workspace; Chrome headless only, at most two workers. Never install another browser.
- Keep public documentation, source, tests and licenses consistent. No GitHub automation, deployment config, publication or external services.
- Local checks must cover geometry, parsed physical output, actual CLI and MCP calls, browser handoff, privacy and keyboard accessibility. Tests do not replace human photo review.
