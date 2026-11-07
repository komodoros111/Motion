// Kinetic typography: per-letter / per-word reveal. Pure math shared by the DOM preview and the canvas exporter.
import { ease } from "./easing.js";

export const REVEAL_LABELS = { none: "None (static text)", rise: "Rise", scale: "Pop (scale)", blur: "Blur in", drop: "Drop & bounce", slide: "Slide in", tilt: "Tilt in" };
export const REVEAL_STYLES = Object.keys(REVEAL_LABELS);
export const REVEAL_ORDERS = ["forward", "center", "reverse"];
export const REVEAL_DEFAULTS = { style: "rise", unit: "char", staggerMs: 40, durationMs: 520, delayMs: 0, order: "forward" };

/** Split text into animation units. Whitespace stays attached so layout and spacing are preserved. */
export function splitUnits(text, unit = "char") {
  if (unit === "word") return (String(text).match(/\S+\s*|\s+/g) ?? []).map((part) => ({ text: part }));
  return [...String(text)].map((part) => ({ text: part }));
}

/** Delay (ms) before unit `i` of `count` starts, for the given order. */
export function unitDelay(i, count, staggerMs, order = "forward") {
  if (order === "reverse") return (count - 1 - i) * staggerMs;
  if (order === "center") return Math.abs(i - (count - 1) / 2) * staggerMs;
  return i * staggerMs;
}

/** Pose of one unit at progress p (0..1). Offsets are in em so they scale with the font. */
export function unitPose(style, p) {
  const t = Math.max(0, Math.min(1, p));
  const rest = { dx: 0, dy: 0, scale: 1, rotate: 0, blur: 0, opacity: 1 };
  if (style === "none" || t >= 1) return rest;
  const out = ease(t, "easeOutCubic");
  switch (style) {
    case "rise": return { ...rest, dy: (1 - out) * .55, opacity: Math.min(1, t * 2.2) };
    case "scale": return { ...rest, scale: .15 + .85 * ease(t, "easeOutBack"), opacity: Math.min(1, t * 3) };
    case "blur": return { ...rest, blur: (1 - out) * .32, dy: (1 - out) * .12, opacity: t };
    case "drop": return { ...rest, dy: -(1 - ease(t, "easeOutBounce")) * .95, opacity: Math.min(1, t * 5) };
    case "slide": return { ...rest, dx: -(1 - out) * .75, opacity: t };
    case "tilt": return { ...rest, rotate: (1 - ease(t, "easeOutBack")) * -28, dy: (1 - out) * .3, opacity: Math.min(1, t * 2.5) };
    default: return rest;
  }
}

/** Resolved pose for every unit of a scene's label at `localMs` since the scene started. */
export function revealPoses(scene, localMs) {
  const reveal = scene?.reveal && scene.reveal.style !== "none" ? { ...REVEAL_DEFAULTS, ...scene.reveal } : null;
  const units = splitUnits(scene?.label || "M", reveal?.unit);
  if (!reveal) return { units, poses: units.map(() => unitPose("none", 1)), reveal: null, endMs: 0 };
  const poses = units.map((_, i) => unitPose(reveal.style, (localMs - reveal.delayMs - unitDelay(i, units.length, reveal.staggerMs, reveal.order)) / reveal.durationMs));
  const endMs = reveal.delayMs + unitDelay(0, units.length, reveal.staggerMs, "reverse") + reveal.durationMs;
  return { units, poses, reveal, endMs };
}

/** Subtitle follows the title: it rises in once about 60% of the title reveal has played. */
export function subtitlePose(scene, localMs) {
  if (!scene?.reveal || scene.reveal.style === "none") return { dy: 0, opacity: 1 };
  const { reveal, endMs } = revealPoses(scene, localMs);
  const start = reveal.delayMs + (endMs - reveal.delayMs) * .6;
  const p = (localMs - start) / Math.max(200, reveal.durationMs);
  const pose = unitPose("rise", p);
  return { dy: pose.dy, opacity: pose.opacity };
}
