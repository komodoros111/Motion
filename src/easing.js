// Shared easing + keyframe sampling. Used by the live preview, the WebM exporter and the tests,
// so the three can never drift apart again. Pure functions, no DOM access.
//
// The easing stored on a keyframe governs the segment that ARRIVES at that keyframe.
// Formulas follow the widely published Penner-style curves (see docs/REFERENCE-NOTES.md);
// this file is an original implementation.

export const EASING_LABELS = {
  linear: "Linear",
  easeIn: "Ease in",
  easeOut: "Ease out",
  easeInOut: "Ease in/out",
  easeInCubic: "Ease in · cubic",
  easeOutCubic: "Ease out · cubic",
  easeInOutCubic: "Ease in/out · cubic",
  easeInExpo: "Ease in · expo",
  easeOutExpo: "Ease out · expo",
  easeInBack: "Anticipate (back in)",
  easeOutBack: "Overshoot (back out)",
  easeInOutBack: "Anticipate + overshoot",
  easeOutElastic: "Elastic out",
  easeOutBounce: "Bounce out",
  spring: "Spring",
  hold: "Hold (step)",
};
export const EASING_NAMES = Object.keys(EASING_LABELS);

const C1 = 1.70158, C2 = C1 * 1.525, C3 = C1 + 1;

function bounceOut(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
  return n * (t -= 2.625 / d) * t + .984375;
}

const CURVES = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) ** 2,
  easeInOut: (t) => (t < .5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
  easeInCubic: (t) => t ** 3,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t) => (t < .5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2),
  easeInExpo: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  easeInBack: (t) => C3 * t ** 3 - C1 * t * t,
  easeOutBack: (t) => 1 + C3 * (t - 1) ** 3 + C1 * (t - 1) ** 2,
  easeInOutBack: (t) => (t < .5 ? ((2 * t) ** 2 * ((C2 + 1) * 2 * t - C2)) / 2 : ((2 * t - 2) ** 2 * ((C2 + 1) * (2 * t - 2) + C2) + 2) / 2),
  easeOutElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1),
  easeOutBounce: bounceOut,
  // Damped oscillation that lands exactly on 1 (cos(2.5π) = 0). ~9% overshoot, one small rebound.
  spring: (t) => (t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(t * 2.5 * Math.PI)),
  hold: (t) => (t >= 1 ? 1 : 0),
};

/** Eased progress for t in 0..1. Unknown names fall back to linear so old files keep working. */
export function ease(t, name) {
  const x = Math.max(0, Math.min(1, t));
  return (CURVES[name] ?? CURVES.linear)(x);
}

/**
 * Value of a keyframe list at `time`. Holds the first/last value outside the range and uses the
 * easing of the ARRIVING keyframe inside it. Input does not need to be sorted.
 */
export function sampleKeyframes(keyframes, time, fallback) {
  if (!keyframes?.length) return fallback;
  const frames = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
  if (time <= frames[0].timeMs) return frames[0].value;
  const last = frames[frames.length - 1];
  if (time >= last.timeMs) return last.value;
  const right = frames.findIndex((frame) => frame.timeMs >= time);
  const a = frames[right - 1], b = frames[right];
  const t = (time - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
  return a.value + (b.value - a.value) * ease(t, b.easing);
}

/** SVG path for a small easing preview. Includes 0 and 1 in the vertical range so overshoot is visible. */
export function curvePath(name, width = 100, height = 56, pad = 7, samples = 48) {
  const values = Array.from({ length: samples + 1 }, (_, i) => ease(i / samples, name));
  const lo = Math.min(0, ...values), hi = Math.max(1, ...values), span = hi - lo;
  const X = (t) => pad + t * (width - pad * 2);
  const Y = (v) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const d = values.map((v, i) => `${i ? "L" : "M"}${X(i / samples).toFixed(2)} ${Y(v).toFixed(2)}`).join(" ");
  return { d, x0: X(0), x1: X(1), y0: Y(0), y1: Y(1) };
}
