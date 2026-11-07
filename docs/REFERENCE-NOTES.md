# Motion System References

The editor's scene/timeline vocabulary was informed by public documentation for existing motion tools. The application code and instructions in this repository are independently written; no source-code blocks or documentation passages were copied.

## Patterns used as references

- **Remotion transitions:** scene sequencing, overlap timing, and a catalog of fade, slide, flip, wipe, zoom, flash, and 3D-style transitions. Our subset is implemented in the local DOM preview and canvas exporter. [Transition documentation](https://www.remotion.dev/docs/transitions/), [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
- **Motion Canvas:** explicit scene boundaries and custom scene-transition lifecycle. We use transition markers centered on scene boundaries as a simpler data model. [Transition documentation](https://motioncanvas.io/docs/transitions/), [Motion Canvas repository and MIT license](https://github.com/motion-canvas/motion-canvas).
- **GSAP CSSPlugin:** perspective and X/Y/Z transform concepts for convincing 3D turns. We implement them with browser CSS and a separate Canvas approximation; GSAP is not a dependency. [CSSPlugin documentation](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/).

## Attribution and licensing

## Typography references

- The editor bundles 21 Latin/Latin-Extended WOFF2 families from [Fontsource](https://github.com/fontsource/fontsource) version 5.3.0. Fonts are self-hosted and work offline; the bundled files are about 1.8 MB. Search/filter, specimen preview, and weight selection use the local `assets/fonts/library.css` collection.
- Fontsource packages identify each typeface's own license; all 21 included packages currently specify the SIL Open Font License 1.1. License copies and package/version/source attribution are kept in [`assets/fonts/CATALOG.md`](../assets/fonts/CATALOG.md) and the per-family `*.LICENSE.txt` files. The Fontsource repository describes the package collection and warns that individual font licenses must be checked.
- Custom family loading remains an optional, explicit Google Fonts CSS2 request; it is not used by the bundled collection. See [CSS API documentation](https://developers.google.com/fonts/docs/css2). Exported SVGs retain family names, so viewers need the font installed or available to render text identically.

## Transitions and vector motion

- [Remotion transitions](https://www.remotion.dev/docs/transitions/) and its [open-source slide presentation](https://github.com/remotion-dev/remotion/blob/main/packages/transitions/src/presentations/slide.tsx) helped review centered scene timing and directional movement.
- [Motion Canvas tweening](https://motioncanvas.io/docs/tweening/) informed the entrance presets' eased progress and small, damped overshoot.
- [GSAP DrawSVG documentation](https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/) describes stroke reveal using dash properties; the editor uses native SVG dash strokes for its dotted-line accent, with an independently authored small feature set.
- Public GitHub projects [Animora](https://github.com/itsrajverma/animora) and [My Motion Studio](https://github.com/rodolphe37/my-motion-studio) were reviewed for SVG and animation-editor affordances. No source code, assets, or product instructions were copied; this implementation remains dependency-free and original.
- The 45-second Next Level promo's storyboard pacing was informed by the public Short [“Claude Code Made These Motion Graphics From ONE Prompt” by @edita.visuals](https://www.youtube.com/shorts/uGoQJJ76tSE) (51.56 seconds). Visible beats were sampled at roughly five-second intervals. This was not an exhaustive frame-by-frame extraction. Only pacing and broad structure were used; no footage, frames, logo, or text was copied.

These are design/behavior references, not copied implementation. Remotion uses its own license with eligibility and company-use conditions; the project does not import Remotion code. Motion Canvas is MIT-licensed; no Motion Canvas source is included. GSAP is documentation-only inspiration; no GSAP package is bundled. Check each upstream license before copying source code or adding a dependency.
