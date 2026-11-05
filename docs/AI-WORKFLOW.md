# AI Motion Workflow

This repository separates creating a motion from changing the editor.

## Create or revise a motion with an AI

1. Open the current JSON in the editor or copy its AI brief.
2. Describe the intended scenes, message, duration, transition style, and movement.
3. Ask the AI to follow `AI-INSTRUCTIONS.md`, preserve unrelated IDs/settings, and return the complete JSON document.
4. Save it as UTF-8 `*.motion.json` and open it in the editor.
5. Scrub every scene marker and keyframe. Check transition timing, contrast, reflection, 3D turns, and the shine sweep.
6. Export WebM after the preview is correct. Export NVMB if you also want the compact project container.

## Requesting a useful motion

Specify the hook, supporting idea, payoff, and call to action. Give the opening and closing pose, scene timing, motion direction, easing, and whether it should loop. Example:

> “Create a 6-second Discord promo in three scenes. Start with a restrained 3D title reveal, use a reflection flip into the community message, and finish with a brief magenta zoom transition into a clear join call. Sweep one cool white shine across the main title. Keep contrast high, transitions under 800 ms, and hold the final card for at least one second.”

Use canvas pixels for X/Y. The origin is the canvas center; positive X points right and positive Y points down. The editor snaps pointer-dragged keyframes to the configured FPS.

## When editing application code

Read `AGENTS.md` and inspect the owning modules, schema, and example files. Keep validator, editor controls, DOM preview, canvas exporter, AI prompt, docs, and examples aligned. `npm run check` is syntax validation only; it is not browser or visual QA.

## Renderer boundaries

The preview renders typographic scenes and supported transitions. The WebM renderer uses canvas projection that approximates CSS 3D faces; compare the preview and exported video manually for transition-specific differences. Browser narration is not muxed into WebM. Imported footage, arbitrary layer stacks, masks, particles, vector paths, and audio tracks are outside the current format.
