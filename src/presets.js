import { sampleKeyframes } from "./easing.js";

// Motion presets: ready-made keyframe recipes that can be dropped on the timeline at the playhead.
// A preset only describes keyframes (fractions of its duration); it adds no new document fields,
// so everything it produces is plain nirvy.motion v1 and stays valid for old versions of the editor.

export const PROPERTY_LABELS = {
  x: "Position X", y: "Position Y", rotation: "Z Rotation", rotationX: "X Rotation", rotationY: "Y Rotation",
  screenTurn: "Screen Turn", scale: "Scale", opacity: "Opacity", contrast: "Contrast", brightness: "Brightness",
  shineSweep: "Shine Sweep", reflection: "Reflection",
};

const k = (at, value, easing = "linear") => ({ at, value, easing });

export const PRESETS = [
  { id: "fade-up", group: "Enter", label: "Fade up", durationMs: 700, tracks: { y: [k(0, 60), k(1, 0, "easeOutCubic")], opacity: [k(0, 0), k(.7, 1, "easeOut")] } },
  { id: "pop-in", group: "Enter", label: "Pop in (overshoot)", durationMs: 600, tracks: { scale: [k(0, .4), k(1, 1, "easeOutBack")], opacity: [k(0, 0), k(.35, 1, "easeOut")] } },
  { id: "slide-left", group: "Enter", label: "Slide in from left", durationMs: 800, tracks: { x: [k(0, -420), k(1, 0, "easeOutExpo")], opacity: [k(0, 0), k(.5, 1, "easeOut")] } },
  { id: "drop-bounce", group: "Enter", label: "Drop & bounce", durationMs: 900, tracks: { y: [k(0, -320), k(1, 0, "easeOutBounce")], opacity: [k(0, 0), k(.15, 1)] } },
  { id: "elastic-zoom", group: "Enter", label: "Elastic zoom", durationMs: 1100, tracks: { scale: [k(0, .05), k(1, 1, "easeOutElastic")], opacity: [k(0, 0), k(.2, 1, "easeOut")] } },
  { id: "flip-in-3d", group: "Enter", label: "3D flip in", durationMs: 800, tracks: { rotationX: [k(0, -90), k(1, 0, "easeOutBack")], opacity: [k(0, 0), k(.4, 1, "easeOut")] } },
  { id: "spring-rise", group: "Enter", label: "Spring rise", durationMs: 900, tracks: { y: [k(0, 140), k(1, 0, "spring")], scale: [k(0, .85), k(1, 1, "spring")], opacity: [k(0, 0), k(.3, 1, "easeOut")] } },
  { id: "fade-down-out", group: "Exit", label: "Fade down & out", durationMs: 500, tracks: { y: [k(0, 0), k(1, 50, "easeInCubic")], opacity: [k(0, 1), k(1, 0, "easeIn")] } },
  { id: "shrink-out", group: "Exit", label: "Anticipate & shrink out", durationMs: 500, tracks: { scale: [k(0, 1), k(1, .6, "easeInBack")], opacity: [k(0, 1), k(1, 0, "easeIn")] } },
  { id: "float", group: "Accent / loop", label: "Float (loop-safe)", durationMs: 2400, tracks: { y: [k(0, 0), k(.5, -16, "easeInOut"), k(1, 0, "easeInOut")] } },
  { id: "pulse", group: "Accent / loop", label: "Pulse (loop-safe)", durationMs: 1200, tracks: { scale: [k(0, 1), k(.5, 1.06, "easeInOut"), k(1, 1, "easeInOut")] } },
  { id: "shake", group: "Accent / loop", label: "Shake", durationMs: 500, tracks: { x: [k(0, 0), k(.15, -14, "easeOut"), k(.35, 12, "easeOut"), k(.55, -9, "easeOut"), k(.72, 6, "easeOut"), k(.88, -3, "easeOut"), k(1, 0, "easeOut")] } },
  { id: "wobble", group: "Accent / loop", label: "Wobble", durationMs: 800, tracks: { rotation: [k(0, 0), k(.2, -6, "easeOut"), k(.45, 5, "easeInOut"), k(.7, -3, "easeInOut"), k(1, 0, "easeOut")] } },
  { id: "shine-pass", group: "Accent / loop", label: "Shine pass", durationMs: 900, tracks: { shineSweep: [k(0, -1), k(1, 1, "easeInOut")] } },
];

/**
 * Writes a preset's keyframes into `project.tracks`, starting at `startMs`.
 * Creates missing tracks, replaces same-property keyframes inside the preset window and squeezes the
 * preset if it would run past the end of the project. All-or-nothing: on error the project is untouched.
 */
export function applyPreset(project, preset, startMs, makeId) {
  const start = Math.max(0, Math.round(startMs));
  const end = Math.min(project.durationMs, start + preset.durationMs);
  const span = end - start;
  if (span < 100) throw new Error("Not enough timeline left after the playhead for this preset. Move the playhead earlier.");
  const tracks = structuredClone(project.tracks);
  let added = 0;
  for (const [property, frames] of Object.entries(preset.tracks)) {
    let track = tracks.find((item) => item.property === property);
    if (!track) {
      if (tracks.length >= 64) throw new Error("The project already has the maximum of 64 tracks.");
      track = { id: makeId("track"), property, label: PROPERTY_LABELS[property] ?? property, keyframes: [] };
      tracks.push(track);
    }
    track.keyframes = track.keyframes.filter((frame) => frame.timeMs < start || frame.timeMs > end);
    for (const frame of frames) { track.keyframes.push({ id: makeId("kf"), timeMs: Math.round(start + frame.at * span), value: frame.value, easing: frame.easing }); added++; }
    track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  }
  if (tracks.reduce((sum, track) => sum + track.keyframes.length, 0) > 10000) throw new Error("The project would exceed the 10,000-keyframe limit.");
  project.tracks = tracks;
  return { start, end, added };
}

// Per-scene entrances share the same curves as keyframe tracks and start with each scene.
export const ENTER_PRESETS = PRESETS.filter((preset) => preset.group === "Enter");
export const ENTER_IDS = ENTER_PRESETS.map((preset) => preset.id);
const NEUTRAL_ENTER = { x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, scale: 1, opacity: 1 };
export function sceneOrigin(scene) {
  const half = scene?.transition && scene.transition.type !== "cut" ? (scene.transition.durationMs ?? 0) / 2 : 0;
  return Math.max(0, (scene?.startMs ?? 0) - half);
}
export function sceneEnter(scene, localMs) {
  const preset = ENTER_PRESETS.find((item) => item.id === scene?.enter);
  const out = { ...NEUTRAL_ENTER };
  if (!preset) return out;
  for (const [property, frames] of Object.entries(preset.tracks)) {
    out[property] = sampleKeyframes(frames.map((f) => ({ timeMs: f.at * preset.durationMs, value: f.value, easing: f.easing })), localMs, NEUTRAL_ENTER[property] ?? 0);
  }
  return out;
}
