# NVMB Binary Format

`.nvmb` (Nirvy Motion Binary) is this editor's native binary container. Version 1 stores a UTF-8 JSON project. Numeric header values use little-endian byte order.

## 16-byte header

| Offset | Size | Field | Value / interpretation |
|---:|---:|---|---|
| 0 | 4 | Magic | ASCII `NVMB` (`4E 56 4D 42`) |
| 4 | 2 | Version | u16 LE, value `1` |
| 6 | 2 | Header size | u16 LE, value `16` |
| 8 | 4 | Payload length | u32 LE, bytes |
| 12 | 4 | CRC-32 | u32 LE checksum of payload |

The payload starts at byte 16 and has exactly the declared length. Reject truncated files, trailing bytes, unsupported magic/version, and files over 16 MiB.

## CRC-32

CRC-32/ISO-HDLC uses reflected polynomial `0xEDB88320`, initial value `0xFFFFFFFF`, and final XOR `0xFFFFFFFF`. The checksum covers only payload bytes. Reference vector: ASCII `123456789` produces `0xCBF43926`.

## JSON payload

Decode as UTF-8 and parse JSON. A project requires `format: "nirvy.motion"`, `version: 1`, `name`, `durationMs`, `fps`, `canvas`, and a `tracks` array. Optional v1 fields include `scenes`, `objects`, `canvas.effects`, `canvas.decorations`, `canvas.fontFamily`, scene entrances, and `narration`. Existing v1 files without optional fields remain valid. Consult `src/motion-format.js` for the executable schema and bounds.

Tracks animate one each of `x`, `y`, `rotation`, `rotationX`, `rotationY`, `screenTurn`, `scale`, `opacity`, `contrast`, `brightness`, `shineSweep`, and `reflection`. Scene transitions support `cut`, `fade`, `push`, `wipe`, `curtain`, `iris`, `flip`, `cube`, `zoom`, `flash`, `reflectionFlip`, and `spin`. Legacy scene entrance settings remain supported. The optional `enter` field selects a per-scene preset (`fade-up`, `pop-in`, `slide-left`, `drop-bounce`, `elastic-zoom`, `flip-in-3d`, or `spring-rise`) and replays at each scene start. The optional `reveal` object animates title text by `char` or `word`, with a `style` (`rise`, `scale`, `blur`, `drop`, `slide`, or `tilt`), `staggerMs`, `durationMs`, `delayMs`, and `order` (`forward`, `center`, or `reverse`). Canvas decorations can contain up to 40 `line` items with dotted strokes and `icon` items with `spark`, `star`, `bolt`, `arrow`, or `ring` glyphs. Accent x/y coordinates are offsets from the canvas center.
Scenes may use `presentation: "kinetic"` for a large, unboxed title. Its optional `backdrop` value selects `arena`, `burst`, `scan`, or `spotlight`; `titleSize`, `titleY`, `titleAlign`, and `fontFamily` shape the title. A kinetic scene subtitle is rendered as supporting text by the project when it is also present as an animated text object. The optional `backdropMotion` object adds an animated `type` (`aurora`, `particles`, `rings`, `grid`, or `none`), `intensity` from 0 to 1, and `speed` from 0 to 3. Legacy string values in `backdrop` remain valid.
Optional top-level `objects` contains up to 24 vector layers. Each has a unique `id`, display `name`, a `type` (`orb`, `ring`, `star`, `diamond`, `bolt`, `arrow`, `triangle`, `square`, `circle`, `hexagon`, or `word`), `color`, optional `colorEnd`, `gradient`, and `glow`, plus a `keyframes` array. Optional `fillStyle` selects `solid`, `linear`, or `radial` fill; `shadow` and `innerShadow` set outer and inset shadow strength from 0 to 100. A text layer (`type: "word"`) can also define `text`, `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, and `wrap: true` for multiline layout. Each object keyframe stores `timeMs`, `x`, `y`, `scale`, `rotation`, `opacity`, and `easing`. Positions are offsets from the canvas center; the easing on the arriving keyframe governs all five transform channels. These fields are additive to v1 and preserve old files.

Keyframe easing values are `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInExpo`, `easeOutExpo`, `easeInBack`, `easeOutBack`, `easeInOutBack`, `easeOutElastic`, `easeOutBounce`, `spring`, and `hold`. The easing on the arriving keyframe controls interpolation into that keyframe. The editor provides reusable Enter, Exit, and Accent/loop presets; these insert ordinary v1 keyframes and add no schema fields.

## Safety and compatibility

- CRC detects accidental corruption; it is not a signature or authenticity proof.
- Valid JSON and CRC can still fail project schema validation.
- Hex Studio does not decode unknown containers. It edits raw bytes only in memory and exports a separate copy.
- If a future schema change breaks compatibility, bump the document version and provide an explicit migration.

## Schema v1 limits

- `durationMs`: 100–120000; `fps`: 1–240; canvas dimensions: 1–8192.
- At most 64 tracks, 32 scenes, and 10000 keyframes. Track/keyframe/scene IDs must be globally unique and non-empty.
- At most 24 independent motion objects; object keyframes share the 10000-keyframe project limit. Object scale is `0..100`; glow is `0..100`; object size is `8..1200` px; text is at most 80 characters.
- Keyframe time: `0..durationMs`; opacity/reflection: `0..1`; scale: `(0..100]`; contrast/brightness: `0..3`; shine sweep: `-1..1`; positions: `±100000`; rotations and screen turn: `±360000°`.
- Scene titles: at most 24 characters; subtitles: at most 80; colors use `#RRGGBB`.
- `canvas.effects.reflection` and `shine`: `0..1`; contrast and brightness: `0..3`; perspective: `100..3000` px.
- Narration text: at most 1000 characters; speech rate: `0.5..2`. The selected browser voice identifier can vary by device.
- Scene `startMs` values are strictly increasing. A scene's transition is centered on its start marker; neighboring transition windows must not overlap.
