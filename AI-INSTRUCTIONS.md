# Motion editor handoff for AI

This document is the operating contract for any assistant asked to create, edit, review, or explain a motion in this repository. Read it before editing a motion. For source-code changes, read `AGENTS.md` as well.

## Choose the right mode

- **Motion request:** return a complete valid `.motion.json` document in one `json` code block. Do not modify application source files unless the user asked for editor/code changes.
- **Editor request:** inspect `AGENTS.md`, identify the smallest responsible module, implement the change, update docs/examples, and run `npm run check`.
- **Binary request:** read `docs/FORMAT.md`. Work from a validated `.motion.json` when possible. Never invent offsets for an unknown format.

## What the preview can render

The current preview represents one centered, stylized text element. It can animate position X/Y, rotation, scale, and opacity. Text and element/background colors are editable canvas settings. It does not yet render multiple layers, video, audio, masks, particles, arbitrary SVG paths, blur, shadows as animated properties, or compositing effects. Keep the result inside these capabilities; if the request asks for more, say what the editor can represent and give the user an achievable approximation. Never claim unsupported effects are visible in the preview.

## Motion JSON v1 contract

Top-level structure:

```json
{
  "format": "nirvy.motion",
  "version": 1,
  "name": "Project name",
  "durationMs": 4000,
  "fps": 30,
  "canvas": {
    "width": 1280,
    "height": 720,
    "background": "#090b13",
    "label": "M",
    "objectColor": "#b9a3ff",
    "subtitle": "Optional call to action"
  },
  "tracks": []
}
```

Each track contains a unique nonempty `id`, a supported `property`, an optional display `label`, and a `keyframes` array. Each keyframe contains a unique nonempty `id`, `timeMs`, numeric `value`, and `easing`:

```json
{
  "id": "track-x",
  "property": "x",
  "label": "Posição X",
  "keyframes": [
    { "id": "x-start", "timeMs": 0, "value": -240, "easing": "easeOut" },
    { "id": "x-rest", "timeMs": 700, "value": 0, "easing": "easeOut" }
  ]
}
```

Supported `property`: `x`, `y`, `rotation`, `scale`, `opacity`. Supported `easing`: `linear`, `easeIn`, `easeOut`, `easeInOut`. The easing saved on the right/arriving keyframe controls interpolation into that keyframe.

### Numeric and structural bounds

- `durationMs`: 100–120000. `fps`: 1–240.
- `canvas.width` and `canvas.height`: 1–8192 pixels.
- Canvas colors: six-digit `#RRGGBB`. `label`: up to 24 characters; `subtitle`: up to 80 characters.
- At most 64 tracks and 10000 keyframes.
- Keyframe `timeMs`: inclusive 0–`durationMs`.
- `opacity`: 0–1. `scale`: greater than 0 and at most 100.
- `x` and `y`: -100000 to 100000 canvas pixels. Zero is center; positive X points right; positive Y points down.
- `rotation`: -360000° to 360000°. Positive values rotate clockwise in the browser preview.
- Use stable unique IDs. Preserve unrelated tracks, keyframes, fields, and user settings.

The preview scales X/Y canvas units to the visible canvas size. Keep positions comfortably inside the canvas unless the user wants an element to enter from or exit beyond an edge. The preview's object is a styled square bearing `canvas.label`; it is not a general text renderer.

## Design guidance

1. Translate the request into a short motion plan: entrance, hold, emphasis, exit, and loop behavior if needed.
2. Fit every keyframe inside the existing duration. Change duration only when asked or when required to fit the requested timing; explain the choice.
3. Keep the start and end poses intentional. For a seamless loop, match the first/last values and easing direction; inspect that no velocity jump is introduced.
4. Use ease-in for acceleration, ease-out for settling, ease-in-out for balanced movement, and linear only for constant-speed motion.
5. Use restrained overshoot only when appropriate. Because the easing set has no spring curve, approximate a small bounce with a few scale/position keyframes and label it as an approximation.
6. Avoid redundant keyframes. A simple move usually needs a start and end; a loop or overshoot may need additional poses.
7. Preserve style and timing of unrelated properties. Do not silently rewrite the project name, FPS, canvas dimensions, or colors.

## Editing the project

- When given a project, parse it first and edit from that exact document. Do not recreate the whole project from a generic template.
- Keep `format`, `version`, `durationMs`, `fps`, canvas settings, and unknown fields unless the request requires a change.
- Preserve all IDs that remain in use. Use fresh IDs for new tracks/keyframes; never derive one by reusing an existing ID.
- Sort each track's keyframes by `timeMs`.
- Do not add a second track for a property already present: the current preview resolves one track per property.
- Never put instructions or prose inside JSON. Return the full document, not a patch or ellipsis.
- If the request is underspecified, make a conservative choice and list the assumption after the JSON.

## Response format

1. One sentence naming the intended visual result.
2. One complete JSON code block, ready to save as `name.motion.json`.
3. A concise change summary and any assumption/preview limitation.

Do not claim the project has been imported or visually verified unless you actually used the editor. The user can verify it by opening the JSON in Motion Studio, scrubbing the timeline, pressing Space, and exporting `.nvmb` if desired.

## Example request

“Create a clean logo reveal over 1.2 seconds: start 180 canvas pixels left, opacity 0 and scale 0.82; settle at center with opacity 1, scale 1 and ease-out. Preserve the rest of the 4-second project and its IDs. Return the complete JSON.”
