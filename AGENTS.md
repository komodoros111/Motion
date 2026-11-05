# Working instructions for AI coding agents

Read this file before changing code. For motion-document edits, also read `AI-INSTRUCTIONS.md`; for NVMB or codec changes, read `docs/FORMAT.md` first.

## Product contract

Motion Studio AI is an original, local-first 2D motion editor. The preview currently renders one stylized text element with X/Y translation, rotation, scale, opacity, editable label and colors. Do not claim support for multiple animated layers, video/audio playback, masks, particle systems, path animation, or arbitrary compositing: those features are not implemented.

The AI handoff copies user-authored text and project JSON to the clipboard only after an explicit click. Never send project data to a service, add hidden telemetry, or add credentials without the user's explicit request.

## Architecture

- `index.html`: semantic application shell and controls.
- `src/app.js`: local project state, preview, timeline interactions, file import/export, AI handoff, and raw hex editor.
- `src/motion-format.js`: schema validation, NVMB codec, CRC-32 implementation.
- `src/styles.css`: app styling and responsive states.
- `server.mjs`: static local server. It binds to `127.0.0.1`; preserve path traversal protections and the loopback binding.
- No runtime dependencies. Do not add a framework for a small targeted change without a clear need.

## Motion model v1

The JSON document uses `format: "nirvy.motion"`, `version: 1`, `name`, `durationMs`, `fps`, `canvas`, and `tracks`. Canvas currently has `width`, `height`, `background`, optional `label`, and optional `objectColor`. A track has a stable `id`, `property`, optional `label`, and `keyframes`. A keyframe has a unique `id`, `timeMs`, numeric `value`, and `easing`.

Supported properties are `x`, `y`, `rotation`, `scale`, and `opacity`. Supported easing values: `linear`, `easeIn`, `easeOut`, `easeInOut`. Bounds are enforced in `validateMotionDocument`. Keep interpolation, controls, schema validation, sample data, prompt, example, and documentation in sync when adding a property.

Do not change the meaning of v1 fields. If a schema change is not backward-compatible, bump the version and add a migration path. Preserve unknown JSON fields when editing existing documents.

## Binary and file safety

- `.nvmb` v1 is specified in `docs/FORMAT.md`. Preserve its 16-byte little-endian header and CRC behavior.
- A valid CRC is not proof of a valid project or a trusted file. Validate the header, payload, UTF-8, JSON, and schema.
- Unknown binary formats remain opaque bytes. Never infer offsets or patch them without a user-supplied specification.
- Never overwrite source files. Keep hex edits in memory and export as a separate copy.
- Cap untrusted binary input at `MAX_BINARY_BYTES`. Validate offsets before reading or writing.
- Do not execute imported content or render user text as HTML. Use `textContent` or safe escaping.

## Interaction and accessibility

- Preserve keyboard shortcuts, visible focus, usable labels, reduced-motion preferences, and narrow-screen layouts.
- Keep timeline keyframe movement snapped to frame boundaries and clamped to project duration.
- Don't discard edits when a file import fails. Display a concise, actionable error.
- Use the existing toast for status and announce important state changes accessibly.

## Change workflow

1. Find the smallest owning module and inspect existing schema plus examples.
2. Implement the behavior and update README, agent instructions, and examples when the user-facing contract changes.
3. Run `npm run check` for syntax validation. Do not describe this as a full browser or visual test.
4. Report what the preview actually supports and any behavior that still needs manual review.
