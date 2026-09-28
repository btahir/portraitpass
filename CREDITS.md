# Credits

PortraitPass original code and vector identity: MIT. No rival source code is incorporated.

## Synthetic demo portrait
`public/demo-portrait.png` was generated with OpenAI's built-in image generation tool on 2026-09-28. It depicts a fictional adult; it is demonstration material, not suitable for an identity application. Prompt: one fictional adult woman, medium-brown skin, short tidy dark curly hair, navy crewneck shirt, front facing with neutral expression, plain warm white background, soft even lighting, entire head and shoulders visible, generous framing, no text/logos/retouching effects. Original 1024×1536; the 660px WebP is an optimized derivative of that same generated asset. No personal photograph was used.

## Local on-device models
- MediaPipe Tasks Vision runtime, Apache-2.0: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
- BlazeFace Short Range weights, Apache-2.0, explicit model-card statement: https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf
- Selfie Segmentation weights, Apache-2.0, explicit model-card statement: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf
Models/runtime are served as local static assets, with CPU/WASM inference. There is no image upload or hosted model inference. Background replacement is available only in general ID mode.

## Fonts and libraries
DM Sans and Instrument Serif: SIL Open Font License 1.1; bundled through Fontsource with their license notices. React, Vite, TypeScript, pdf-lib, MCP SDK and Zod: MIT. Lucide icons: ISC. Sharp: Apache-2.0; its unmodified libvips native dependency is LGPL-3.0-or-later (installed prebuilt package) and remains independently replaceable. License inventory is generated from installed dependencies before release; see THIRD_PARTY_NOTICES.md.

## Product and launch visuals
Screenshots and animated WebP demonstrations show this original app using the synthetic portrait above. The original vector social card also has a 1200×630 PNG rendition. The local launch film uses an original procedural instrumental score, without samples or a generative music model. Editable film sources, audio provenance and asset hashes are retained in the ignored `docs/launch/media/` folder. Its launch-only GSAP runtime uses the GSAP Standard License and is not included in the application dependency tree or bundle.
