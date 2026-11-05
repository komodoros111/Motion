# Motion System References

The editor's scene/timeline vocabulary was informed by public documentation for existing motion tools. The application code and instructions in this repository are independently written; no source-code blocks or documentation passages were copied.

## Patterns used as references

- **Remotion transitions:** scene sequencing, overlap timing, and a catalog of fade, slide, flip, wipe, zoom, flash, and 3D-style transitions. Our subset is implemented in the local DOM preview and canvas exporter. [Transition documentation](https://www.remotion.dev/docs/transitions/), [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
- **Motion Canvas:** explicit scene boundaries and custom scene-transition lifecycle. We use transition markers centered on scene boundaries as a simpler data model. [Transition documentation](https://motioncanvas.io/docs/transitions/), [Motion Canvas repository and MIT license](https://github.com/motion-canvas/motion-canvas).
- **GSAP CSSPlugin:** perspective and X/Y/Z transform concepts for convincing 3D turns. We implement them with browser CSS and a separate Canvas approximation; GSAP is not a dependency. [CSSPlugin documentation](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/).

## Attribution and licensing

## Typography references

- The font picker loads families from the **Google Fonts CSS2 API** at runtime and uses a system-font fallback offline. It needs no API key and does not download or vendor font binaries in this repository. See [CSS API documentation](https://developers.google.com/fonts/docs/css2).
- Curated families are sourced from the public [google/fonts GitHub repository](https://github.com/google/fonts). Check each family directory for its license before redistributing font files or embedding them in exported assets. SVG icons reference the selected family name; they remain scalable, but the font must be installed or available to the viewer to render identically.

These are design/behavior references, not copied implementation. Remotion uses its own license with eligibility and company-use conditions; the project does not import Remotion code. Motion Canvas is MIT-licensed; no Motion Canvas source is included. GSAP is documentation-only inspiration; no GSAP package is bundled. Check each upstream license before copying source code or adding a dependency.
