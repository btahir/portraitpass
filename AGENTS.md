# PortraitPass agent instructions

Use the shared deterministic library in `src/core/index.ts`; browser Canvas and Node Sharp are rendering adapters. Read [docs/agent-guide.md](docs/agent-guide.md) for CLI, MCP, project schema, original-photo policy and worked examples.

- All photo operations remain local. No backend, API keys, analytics, upload, generated identity features or acceptance guarantee.
- Preserve appearance in passport modes. Digital original modes copy bytes unchanged; no crop or print sheet. Background replacement is General ID only and uses a persisted alpha mask.
- Preset numbers need primary official sources, source URL and check date. Do not invent country formats or claim compliance from geometric checks.
- Version 1 projects are plain JSON; validate untrusted projects before use. Explicit output paths only, no overwrite by default, never overwrite source. Source paths are local inputs, not web URLs.
- Use `pnpm dev`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`. Heavy browser/build jobs go through `../research/heavy.sh` in this workspace; Chrome headless only, at most two workers. Never install another browser.
- Keep public documentation, source, tests and licenses consistent. No GitHub automation, deployment config, publication or external services.
- Local checks must cover geometry, parsed physical output, actual CLI and MCP calls, browser handoff, privacy and keyboard accessibility. Tests do not replace human photo review.
