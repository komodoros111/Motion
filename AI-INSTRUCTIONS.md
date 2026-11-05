# Motion Authoring Contract

This is the operating contract for assistants that create, edit, review, or explain a motion in this repository. Read it before editing a motion. For application source changes, also read `AGENTS.md`.

## Select the right task

- **Motion request:** return a complete valid `.motion.json` document in one `json` block. Do not change application source unless asked.
- **Editor request:** inspect `AGENTS.md`, edit the smallest responsible modules, update docs and examples, then run `npm run check`.
- **Binary request:** read `docs/FORMAT.md`. Prefer a validated JSON source. Never invent offsets for unknown binary formats.

## Renderer capabilities

The editor renders typographic promo scenes with per-scene titles, subtitles, backgrounds, accent colors, and overlapping transitions. It previews and exports `cut`, `fade`, `flip`, `cube`, `wipe`, `zoom`, `flash`, `reflectionFlip`, and `spin` scene transitions. Animated tracks support X/Y position, Z/X/Y rotation, whole-screen turn, scale, opacity, contrast, brightness, shine sweep, and reflection. Static look controls set shine intensity and 3D perspective. WebM export is silent; browser voice narration is stored as text and can be previewed, but is not muxed into the video.

The editor does not render imported footage, arbitrary multi-layer compositions, masks, particle systems, vector paths, or audio tracks. It uses a 2D canvas exporter, so perspective and transition rendering are approximations of the live CSS preview. Never claim pixel-identical parity or unsupported capabilities.

## Motion JSON v1

The format remains additive and backward-compatible: existing v1 documents without `scenes` or `canvas.effects` continue to load.

```json
{
  "format": "nirvy.motion",
  "version": 1,
  "name": "Project name",
  "durationMs": 6200,
  "fps": 30,
  "canvas": {
    "width": 1920,
    "height": 1080,
    "background": "#070912",
    "label": "TITLE",
    "objectColor": "#727bff",
    "subtitle": "Supporting line",
    "effects": { "reflection": 0.42, "contrast": 1.24, "brightness": 1.08, "shine": 0.78, "perspective": 760 }
  },
  "scenes": [
    { "id": "scene-1", "startMs": 0, "label": "OPEN", "subtitle": "SET THE TONE", "background": "#070912", "objectColor": "#727bff", "transition": { "type": "cut", "durationMs": 620 } },
    { "id": "scene-2", "startMs": 2600, "label": "THE PAYOFF", "subtitle": "MAKE IT COUNT", "background": "#100817", "objectColor": "#ff5f9b", "transition": { "type": "reflectionFlip", "durationMs": 760 } }
  ],
  "tracks": []
}
```

Each scene `startMs` is the transition midpoint and its incoming transition determines the boundary effect. Keep transitions short enough that adjacent transition windows do not overlap. Available transition types: `cut`, `fade`, `flip`, `cube`, `wipe`, `zoom`, `flash`, `reflectionFlip`, and `spin`.

Each track has a unique `id`, supported `property`, optional display `label`, and `keyframes`. A keyframe has a unique global `id`, `timeMs`, numeric `value`, and `easing`. The easing on the arriving keyframe governs interpolation into it.

```json
{
  "id": "track-turn",
  "property": "screenTurn",
  "label": "Screen turn",
  "keyframes": [
    { "id": "turn-start", "timeMs": 0, "value": -42, "easing": "easeOut" },
    { "id": "turn-rest", "timeMs": 800, "value": 0, "easing": "easeInOut" }
  ]
}
```

## Supported animated properties and bounds

- `x`, `y`: ±100000 canvas pixels. Origin is the center; positive X is right and positive Y is down.
- `rotation`, `rotationX`, `rotationY`, `screenTurn`: ±360000 degrees.
- `scale`: greater than 0 and at most 100.
- `opacity`, `reflection`: 0–1.
- `contrast`, `brightness`: 0–3, where 1 is neutral.
- `shineSweep`: -1–1, left to right across the title.
- Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`.
- `durationMs`: 100–120000; `fps`: 1–240; canvas width/height: 1–8192.
- Up to 64 tracks, 32 scenes, and 10000 keyframes. Track and keyframe IDs are non-empty and globally unique.
- Canvas colors use `#RRGGBB`; scene title is limited to 24 characters and subtitle to 80.
- `canvas.effects.reflection`, `shine`: 0–1; `contrast`, `brightness`: 0–3; `perspective`: 100–3000 px.
- Optional narration text is limited to 1000 characters; rate is 0.5–2. `voiceURI` is system-specific and may not resolve on another device.

## Design direction

1. Plan the message in scenes: hook, supporting idea, proof or payoff, and a clear call to action.
2. Give each scene one short title and one supporting line. Keep text away from edges and account for mobile crops.
3. Use contrasting accent colors to distinguish scenes while preserving a coherent palette. Reserve high contrast for the focal moment.
4. Use a page turn, cube, wipe, or flash only when it supports the rhythm. Default to one or two intentional transitions; avoid stacking unrelated effects.
5. For depth, pair a modest X/Y tilt with perspective and a short screen turn, then settle to zero. Use reflection as a low-opacity accent.
6. Use a single shine sweep with a clear start and end. Keep it short and avoid leaving a bright stripe parked on the title.
7. Use ease-out to settle, ease-in to accelerate, and ease-in-out for balanced turns. Overshoot should be small and deliberate.
8. Keep all keyframes inside the project duration. For a loop, align endpoints and velocities.

## Editing rules

- Start from the exact input document. Preserve unrelated fields, IDs, scenes, timing, and style.
- Do not add a second track for a property already in use.
- Use fresh IDs for new objects and sort keyframes by `timeMs` and scenes by `startMs`.
- Return the complete valid JSON document, never instructions or prose inside JSON.
- If a request is ambiguous, make a conservative choice and state it after the JSON.

## Response format

1. One sentence naming the visual result.
2. One complete JSON code block ready to save as `name.motion.json`.
3. A concise change summary and any renderer limitations.

Never claim the project has been imported or visually verified unless the editor was actually used. Users can import the JSON, scrub scene markers and keyframes, preview with Space, and export WebM.
