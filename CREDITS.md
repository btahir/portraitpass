# Credits

PortraitPass original code and vector identity: MIT. No rival source code is incorporated.

PortraitPass is an independent open-source project, not affiliated with or endorsed by any government or passport office. Document dimensions come from each authority's published guidance, cited by URL in the presets; citing a source is attribution, not endorsement. No government seals, emblems or styling are used.

## Synthetic demo portraits
All demo images depict fictional adults; none is a real person and no personal photograph, brand or logo was used. They are demonstration material, not suitable for an identity application. Each is generated with Codex image_gen (OpenAI's built-in image generation tool) on 2026-09-28, is ours under the project license (MIT) and depicts no real person. Originals are 1024×1536; the PNGs are palette-optimized copies and the 768px WebPs are optimized derivatives of the same generated assets.

- `public/demo-portrait.png` / `.webp` (replaces the earlier tightly framed demo). Prompt: photorealistic studio-quality passport-style photo of one fictional adult man in his early 30s, light-tan skin, short neat brown hair, gray crewneck sweater, facing the camera straight on, neutral friendly expression, mouth closed, eyes open, no glasses, even soft frontal lighting with no shadows, plain off-white wall, head and shoulders with generous space (head about 40-45% of image height, clear space above and on both sides), portrait 2:3, sharp focus, no text or watermark.
- `public/demo-shadow.png` / `.webp`. Prompt: photorealistic casual at-home snapshot in passport-style of one fictional adult woman in her late 40s, fair skin, shoulder-length gray-streaked auburn hair, dark green top, facing the camera, neutral expression, slightly beige wall with a visible soft shadow on the left side and slightly uneven lighting, generous head-and-shoulders framing, portrait 2:3, no text or watermark. Used to demonstrate the background and lighting checks; deliberately not ideal.
- `public/demo-portrait-2.png` / `.webp`. Prompt: photorealistic studio-quality passport-style photo of one fictional adult woman in her early 60s, dark brown skin, short cropped gray hair, burgundy crewneck top, no glasses, facing the camera, neutral friendly expression, even soft frontal lighting, plain off-white wall, generous head-and-shoulders framing, portrait 2:3, no text or watermark. Used for variety in marketing images.

## Local on-device models
- MediaPipe Tasks Vision runtime, Apache-2.0: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
- BlazeFace Short Range weights, Apache-2.0, explicit model-card statement: https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf
- Selfie Segmentation weights, Apache-2.0, explicit model-card statement: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf
Models, runtime, fonts and application assets are self-hosted and served as static files from the same origin (no CDN or third-party scripts). Models/runtime are served as local static assets, with CPU/WASM inference. There is no image upload or hosted model inference. Background replacement is available for print and general presets, never for original modes; outputs that use it carry the metadata note "Background replaced with PortraitPass".

## Fonts and libraries
DM Sans and Instrument Serif: SIL Open Font License 1.1; bundled through Fontsource with their license notices. React, Vite, TypeScript, pdf-lib, MCP SDK and Zod: MIT. Lucide icons: ISC. Sharp: Apache-2.0; its unmodified libvips native dependency is LGPL-3.0-or-later (installed prebuilt package) and remains independently replaceable. License inventory is generated from installed dependencies before release; see THIRD_PARTY_NOTICES.md.

## Product and launch visuals
Screenshots and animated WebP demonstrations show this original app using the synthetic portrait above. The original vector social card also has a 1200×630 PNG rendition. The local launch film uses an original procedural instrumental score, without samples or a generative music model. Editable film sources, audio provenance and asset hashes are retained in the ignored `docs/launch/media/` folder. Its launch-only GSAP runtime uses the GSAP Standard License and is not included in the application dependency tree or bundle.
