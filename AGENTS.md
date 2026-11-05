# Working instructions for AI coding agents

Read this file before changing application code. For motion-document edits, also read `AI-INSTRUCTIONS.md`; for NVMB or codec changes, read `docs/FORMAT.md` first.

## Product contract

Motion Studio AI is an original, local-first motion editor. The live preview supports stylized title scenes, scene transitions, transforms, 3D turns, reflection, contrast, brightness, and shine sweeps. The silent WebM exporter implements a matching 2D canvas approximation. It does not support imported footage, arbitrary layer stacks, masks, particles, paths, or audio tracks.

The AI handoff copies user-authored text and project JSON only after an explicit click. Never send project data to a service, add hidden telemetry, or add credentials without explicit user authorization.

## Architecture

- `index.html`: English semantic application shell and controls.
- `src/app.js`: project state, DOM preview, scene manager, timeline, file import/export, AI handoff, and hex editor.
- `src/motion-format.js`: v1 schema validation and NVMB codec.
- `src/video-export.js`: canvas scene compositor and WebM recording.
- `src/styles.css`: responsive UI and live CSS scene transitions.
- `server.mjs`: static local server bound to `127.0.0.1`; preserve path traversal protections and loopback binding.
- No runtime dependencies. Avoid adding a framework for targeted editor changes.

## Motion document v1

The document uses `format: "nirvy.motion"`, `version: 1`, `name`, `durationMs`, `fps`, `canvas`, and `tracks`, with optional `scenes` and `narration`. `canvas.effects` is also optional. Keep old v1 documents valid; optional additions must be backward-compatible and preserved by import/export.

Track properties: `x`, `y`, `rotation`, `rotationX`, `rotationY`, `screenTurn`, `scale`, `opacity`, `contrast`, `brightness`, `shineSweep`, `reflection`. Easing values: `linear`, `easeIn`, `easeOut`, `easeInOut`. There is one track per property. Keep app interpolation, sample, editor controls, validator, AI prompt, exporter, examples, and docs in sync.

Scenes are sorted by `startMs`. A scene transition is centered on its `startMs`; adjacent transition windows must not overlap. Transition types: `cut`, `fade`, `flip`, `cube`, `wipe`, `zoom`, `flash`, `reflectionFlip`, `spin`. Preserve the meaning of v1 fields and add explicit migrations only if compatibility is broken.

## Binary and file safety

- `.nvmb` v1 uses the 16-byte little-endian header documented in `docs/FORMAT.md`.
- A valid CRC is not proof of authenticity. Validate header, payload length, UTF-8, JSON, and schema.
- Unknown binary formats remain opaque. Never infer offsets or patch them without a specification.
- Keep hex edits in memory and export a new copy. Cap untrusted inputs at `MAX_BINARY_BYTES`.
- Never execute imported content or render user text as HTML. Use `textContent` or safe escaping.

## Interaction and accessibility

- Preserve keyboard shortcuts, visible focus, labels, reduced-motion preferences, and narrow-screen layouts.
- Snap dragged keyframes to frame boundaries and clamp them to project duration.
- Do not discard edits when an import fails. Show a concise actionable error.
- Use the existing live-region toast for status changes.

## Change workflow

1. Inspect the owning module, schema, and examples.
2. Update code, README, AI contract, and examples when user-facing behavior changes.
3. Run `npm run check` for syntax validation. Do not describe it as full visual QA.
4. State which parts of preview and export are exact and which are approximations.
