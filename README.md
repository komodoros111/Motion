# Motion Studio AI

Motion Studio AI is a local-first motion design editor with a scene timeline, 3D-inspired transitions, keyframe animation, AI-assisted project editing, binary project support, and silent WebM export. Projects stay in your browser until you choose to export or share them.

## Run locally

Requires Node.js 20+. There are no runtime dependencies.

```powershell
git clone https://github.com/komodoros111/Motion.git Motion
cd Motion
npm run dev
```

Open <http://127.0.0.1:4173>. The server listens only on loopback.

## Features

- Multiple title scenes with per-scene text, background, accent color, and timeline markers.
- Scene transitions: cut, fade, cinematic push, directional wipe, center curtain, radial iris, page flip, cube turn, zoom, flash, reflection flip, and spin.
- Scene entrance presets: fade + rise, soft pop, tilt settle, focus reveal, wipe reveal, and spring drop.
- Editable SVG spark, star, bolt, arrow, and orbit accents plus animated dotted or diagonal lines.
- Timeline tracks for position X/Y, Z/X/Y rotation, screen turn, scale, opacity, contrast, brightness, shine sweep, and reflection.
- Live reflection, contrast, brightness, shine, and perspective controls.
- Drag keyframes with frame snapping; edit, add, and remove tracks and scenes.
- Live preview and silent WebM export up to 1920 px per side and 60 FPS.
- Export the active scene as a self-contained, square SVG icon.
- Load curated or custom Google Fonts CSS2 families without an API key; system fallback works offline.
- Browser-native speech synthesis for narration previews. It uses installed voices, requires no API key or tokens, and is not mixed into WebM.
- Local autosave, project recovery, JSON and NVMB import/export, and drag-and-drop project opening.
- Hex editor for raw binary inspection and copy-only editing.
- AI handoff prompt copies the current project only after a user click; it never calls an external model.
- Responsive controls, keyboard shortcuts, focus indicators, and reduced-motion support.

## Open a project and export

Click **Open project** to load a `.motion.json` or `.nvmb` project, or drag a project file into the editor. Use **Next Level promo** to load the included multi-scene example. Scrub the timeline and scene markers, press Space to preview, then click **Export video** for WebM or **SVG icon** for a scalable icon of the current scene. Choose a typeface in Composition; the Google Fonts service requires an internet connection. Export JSON or NVMB to continue editing elsewhere.

## AI-assisted editing

1. Open the AI tab and describe the intended motion.
2. Click **Copy brief + project** and paste it into an AI that can edit JSON.
3. Ask it to read `AI-INSTRUCTIONS.md` and `docs/AI-WORKFLOW.md`.
4. Save the complete response as UTF-8 `.motion.json`, open it in the editor, and review each scene and transition.
5. Export WebM after the preview is correct.

The app does not require an AI API. Project content is copied only after the explicit handoff click.

## Project formats

- `.motion.json`: editable source of truth for people and AI tools.
- `.nvmb`: version 1 container with a 16-byte little-endian header, UTF-8 JSON payload, and CRC-32 checksum.
- Unknown binary files: shown as raw bytes in Hex Studio; their structures are not guessed.

See [`docs/FORMAT.md`](docs/FORMAT.md) and [`AI-INSTRUCTIONS.md`](AI-INSTRUCTIONS.md) for schema limits, authoring rules, and safe editing.

## Render boundaries

The editor is designed for typographic promo scenes and vector accents. The DOM preview uses CSS perspective and transitions. WebM export uses a 2D canvas compositor that approximates 3D projection and transition faces; it is not pixel-identical to the live preview. Narration is preview-only and does not become an audio track. Imported footage, arbitrary multi-layer layouts, masks, particle systems, arbitrary user SVG path editing, and composited audio are not supported.

## References and implementation

The transition catalog and keyframe controls were informed by public documentation for Remotion, Motion Canvas, GSAP, and public SVG editor repositories. Typography uses the public Google Fonts CSS2 API and its [google/fonts GitHub library](https://github.com/google/fonts). This repository contains an original implementation; it does not copy their source code or documentation. See [`docs/REFERENCE-NOTES.md`](docs/REFERENCE-NOTES.md) for links and license notes.

## Development

```powershell
npm run check
```

The check validates JavaScript syntax only. Keep the schema, validator, editor, preview, video renderer, examples, and AI guidance aligned. Do not commit user media, credentials, `.env` files, or personal `.nvmb` projects.
