# AI motion workflow

This repository separates **creating a motion** from **changing the editor**.

## Creating a motion with any assistant

1. Open the current JSON using **Abrir** or copy the editor's AI briefing. The JSON is the editable source of truth.
2. Give the assistant the requested motion, desired duration/loop behavior, and any style reference described in words.
3. Ask it to follow `AI-INSTRUCTIONS.md`, preserve unrelated IDs/settings, and return the entire JSON document.
4. Save the returned block as UTF-8 `*.motion.json` and import it in the editor.
5. Review by scrubbing keyframes and playing the result. If something is off, give the assistant the latest exported JSON and ask for a narrow correction.
6. Export `.nvmb` only after the JSON preview is correct. NVMB is a compact container, not an AI-readable replacement for the JSON source.

## Writing better requests

Specify what appears, where it begins and ends, when each phase occurs, how the movement should feel, and whether it must loop. For example:

> “In 1.4 s, reveal the logo from 140 px below with opacity 0. Begin at scale 0.9, settle at 1.0 by 0.65 s with ease-out. Hold until the end of the 4 s composition. Keep the canvas and other motion unchanged.”

Use canvas pixels for X/Y. The origin is the center of the stage; positive X is right and positive Y is down. The editor snaps pointer-dragged keyframes to the configured FPS. An AI may return subframe timestamps, but align keyframes to `1000/fps` when frame-accurate timing is requested.

## When working on application code

Read `AGENTS.md` and inspect `src/app.js`, `src/motion-format.js`, and `docs/FORMAT.md` before changing behavior. Keep the schema, validator, sample, import/export, editor and documentation in sync. Run `npm run check` for syntax validation and state clearly if browser interaction was not exercised.

## Current renderer boundary

The preview currently renders one stylized text element and the five transform/opacity tracks. Requests for multi-layer scenes, footage, masks, effects, paths, or audio need a future schema and renderer change. Do not encode those features as if they already work; describe the closest approximation the current editor can preview.
