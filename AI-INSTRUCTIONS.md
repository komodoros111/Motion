# Motion Authoring Contract

This is the operating contract for assistants that create, edit, review, or explain a motion in this repository. Read it before editing a motion. For application source changes, also read `AGENTS.md`.

## Select the right task

- **Motion request:** return a complete valid `.motion.json` document in one `json` block. Do not change application source unless asked.
- **Editor request:** inspect `AGENTS.md`, edit the smallest responsible modules, update docs and examples, then run `npm run check`.
- **Binary request:** read `docs/FORMAT.md`. Prefer a validated JSON source. Never invent offsets for unknown binary formats.

## Promo pacing

- When the request is for a promotional video and no duration is specified, target 45 seconds. For the user's Next Level promos, treat 30 seconds as a hard minimum unless the user explicitly asks for a shorter cut.
- Plan a beginning, several distinct story beats, and a deliberate closing hold. Give each scene enough screen time to read; don't stretch a 6-second sting with empty holds to reach the duration.
- Animate several independent layers through the timeline: text entrances/exits, scale changes, directional movement, rotation, accent shapes, light sweeps, and scene transitions. Keep all timing within the project duration and make live preview and canvas export agree.
- Use original copy, colors, shapes, and timing when referencing another creator's video. Document which visual observations are direct and which are approximations; never copy source footage, logos, or source code without permission and a compatible license.

## Renderer capabilities

The editor renders typographic promo scenes with per-scene titles, subtitles, backgrounds, accent colors, preset SVG accents, dotted strokes, and overlapping transitions. Scenes may set `presentation: "kinetic"` to render a large unboxed title with varied display styling and a per-scene backdrop (`arena`, `burst`, `scan`, or `spotlight`). It supports up to 24 independently animated vector layers: glow orbs, rings, stars, diamonds, bolts, arrows, triangles, squares, circles, hexagons, and gradient text. Each layer has its own animated position, scale, rotation, opacity, color pair, glow, and (for text) font, weight, size, letter spacing, and optional `wrap: true` multiline layout. Object keyframes support the same easing list as tracks. The stage supports direct pointer dragging to create position keys; use the inspector's pop, slide-shrink, zoom-out, float, and pulse recipes as starting points. Layers render in the live preview and WebM export.

The editor previews and exports `cut`, `fade`, `push`, `wipe`, `curtain`, `iris`, `flip`, `cube`, `zoom`, `flash`, `reflectionFlip`, and `spin` scene transitions. Legacy entrance presets are `fadeUp`, `pop`, `rotateIn`, `blurIn`, `reveal`, and `bounce`; per-scene entrances also support `fade-up`, `pop-in`, `slide-left`, `drop-bounce`, `elastic-zoom`, `flip-in-3d`, and `spring-rise`. Scene titles can reveal by character or word using rise, scale, blur, drop, slide, or tilt motion; animated backdrops include aurora, particles, rings, and perspective grid. Animated tracks support X/Y position, Z/X/Y rotation, whole-screen turn, scale, opacity, contrast, brightness, shine sweep, and reflection. Static look controls set shine intensity and 3D perspective. WebM export is silent; browser voice narration is stored as text and can be previewed, but is not muxed into the video.

The editor does not render imported footage, masks, particle systems, custom SVG path authoring, or audio tracks. Its vector layers are the supported multi-layer composition system, with fixed preset geometry. It uses a 2D canvas exporter, so perspective and transition rendering are approximations of the live CSS preview. Never claim pixel-identical parity or unsupported capabilities.

## Motion JSON v1

The format remains additive and backward-compatible: existing v1 documents without `scenes`, `canvas.effects`, `canvas.decorations`, or scene entrances continue to load.

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
    "effects": { "reflection": 0.42, "contrast": 1.24, "brightness": 1.08, "shine": 0.78, "perspective": 760 },
    "decorations": [
      { "id": "accent-1", "type": "line", "direction": "horizontal", "x": 0, "y": -160, "size": 840, "color": "#78dfff", "rotation": -8 },
      { "id": "accent-2", "type": "icon", "icon": "spark", "x": 500, "y": -150, "size": 80, "color": "#ffffff", "rotation": 0 }
    ]
  },
  "scenes": [
    { "id": "scene-1", "startMs": 0, "label": "OPEN", "subtitle": "SET THE TONE", "background": "#070912", "objectColor": "#727bff", "transition": { "type": "cut", "durationMs": 620 } },
    { "id": "scene-2", "startMs": 2600, "label": "THE PAYOFF", "subtitle": "MAKE IT COUNT", "background": "#100817", "objectColor": "#ff5f9b", "transition": { "type": "iris", "durationMs": 760 }, "entrance": { "type": "pop", "durationMs": 560 } }
  ],
  "tracks": []
}
```

Each scene `startMs` is the transition midpoint and its incoming transition determines the boundary effect. Keep transitions short enough that adjacent transition windows do not overlap. Available transition types: `cut`, `fade`, `push`, `wipe`, `curtain`, `iris`, `flip`, `cube`, `zoom`, `flash`, `reflectionFlip`, and `spin`. Optional scene entrances are `none`, `fadeUp`, `pop`, `rotateIn`, `blurIn`, `reveal`, or `bounce`, with a duration from 180 to 1800 ms. Optional canvas decorations support up to 40 SVG accents: dotted `line` items or `icon` items (`spark`, `star`, `bolt`, `arrow`, `ring`); their positions are offsets from the canvas center.

Each track has a unique `id`, supported `property`, optional display `label`, and `keyframes`. A keyframe has a unique global `id`, `timeMs`, numeric `value`, and `easing`. The easing on the arriving keyframe governs interpolation into it.

Optional top-level `objects` supports up to 24 vector layers. Shapes are `orb`, `ring`, `star`, `diamond`, `bolt`, `arrow`, `triangle`, `square`, `circle`, and `hexagon`; `word` creates gradient/glow typography. Each object has `id`, `name`, `type`, `color`, `size`, and at least one keyframe; optional style fields are `colorEnd`, `gradient`, `glow`, `text`, `fontFamily`, `fontSize`, `fontWeight`, and `letterSpacing`. Each object keyframe has a globally unique `id`, strictly increasing `timeMs`, `x`, `y`, `scale`, `rotation`, `opacity`, and `easing`. Position is measured in pixels from canvas center, scale is a multiplier, rotation is degrees, and opacity is `0..1`. To create shrink-and-move motion, animate `scale` toward `0` while changing `x` or `y`; easing is controlled by the arriving keyframe.

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
- Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInExpo`, `easeOutExpo`, `easeInBack`, `easeOutBack`, `easeInOutBack`, `easeOutElastic`, `easeOutBounce`, `spring`, and `hold`. The easing on the arriving keyframe governs the segment that ends there. `hold` keeps the prior value until that keyframe.
- `durationMs`: 100–120000; `fps`: 1–240; canvas width/height: 1–8192.
- Up to 64 tracks, 32 scenes, and 10000 keyframes. Track and keyframe IDs are non-empty and globally unique.
- Canvas colors use `#RRGGBB`; scene title is limited to 24 characters and subtitle to 80.
- `canvas.effects.reflection`, `shine`: 0–1; `contrast`, `brightness`: 0–3; `perspective`: 100–3000 px.
- Optional narration text is limited to 1000 characters; rate is 0.5–2. `voiceURI` is system-specific and may not resolve on another device.

## Design direction

1. Plan the message in scenes: hook, supporting idea, proof or payoff, and a clear call to action.
2. Give each scene one short title and one supporting line. Keep text away from edges and account for mobile crops.
3. Use contrasting accent colors to distinguish scenes while preserving a coherent palette. Reserve high contrast for the focal moment.
4. Choose push, iris, curtain, page turn, cube, wipe, or flash only when it supports the rhythm. Default to one or two intentional transitions; avoid stacking unrelated effects.
5. Pair one entrance with the scene's transition at most. Keep accent lines thin, use only a few dots or icons, and leave clear space around the title.
6. For depth, pair a modest X/Y tilt with perspective and a short screen turn, then settle to zero. Use reflection as a low-opacity accent.
7. Use a single shine sweep with a clear start and end. Keep it short and avoid leaving a bright stripe parked on the title.
8. Use ease-out to settle, ease-in to accelerate, and ease-in-out for balanced turns. Overshoot should be small and deliberate.
9. Keep all keyframes inside the project duration. For a loop, align endpoints and velocities.
10. The editor includes reusable Enter, Exit, and Accent/loop presets. Treat these as starting recipes; adapt timing and values to the composition rather than stacking presets blindly.

## Editing rules

- Start from the exact input document. Preserve unrelated fields, IDs, scenes, timing, and style.
- Do not add a second track for a property already in use.
- Animate independent elements with `objects`; use tracks when the main title card should move. Keep object keyframes sorted and strictly increasing.
- For text glow, set `type: "word"`, contrasting `color`/`colorEnd`, `gradient: true`, and restrained `glow`; sequence a readable entrance and a deliberate exit. For shrink exits, reduce `scale` while translating the layer and fading `opacity`.
- Use fresh IDs for new objects and sort keyframes by `timeMs` and scenes by `startMs`.
- Return the complete valid JSON document, never instructions or prose inside JSON.
- If a request is ambiguous, make a conservative choice and state it after the JSON.

## Response format

1. One sentence naming the visual result.
2. One complete JSON code block ready to save as `name.motion.json`.
3. A concise change summary and any renderer limitations.

Never claim the project has been imported or visually verified unless the editor was actually used. Users can import the JSON, scrub scene markers and keyframes, preview with Space, and export WebM.

## Visual timing review

The live stage includes frame-accurate stepping, slow playback speeds, and an accessible readout of the current frame, scene or transition, and key property values. The timeline marks scene spans and transition windows. Use these cues to inspect pacing and place edits, while noting that the canvas video export approximates CSS perspective and transitions.
