import { sampleKeyframes } from "./easing.js";

export const MOTION_OBJECT_TYPES = ["orb", "ring", "star", "diamond", "bolt", "arrow", "triangle", "square", "circle", "hexagon", "word"];
export const MOTION_OBJECT_LABELS = { orb: "Glow orb", ring: "Outline ring", star: "Star", diamond: "Diamond", bolt: "Bolt", arrow: "Arrow", triangle: "Triangle", square: "Square", circle: "Circle", hexagon: "Hexagon", word: "Gradient text" };
export const MOTION_OBJECT_PATHS = {
  star: "m50 3 11 32 34 2-26 21 9 33-28-19-28 19 9-33L5 37l34-2Z",
  diamond: "M50 3 96 50 50 97 4 50Z",
  bolt: "M57 2 21 55h25l-5 43 41-59H56Z",
  arrow: "M7 50h73M54 22l29 28-29 28",
  triangle: "M50 5 96 92H4Z",
  square: "M12 12h76v76H12Z",
  circle: "M50 5a45 45 0 1 0 0 90 45 45 0 0 0 0-90Z",
  hexagon: "M25 7h50l25 43-25 43H25L0 50Z",
  ring: "M50 5a45 45 0 1 0 0 90 45 45 0 0 0 0-90Z",
};

const PROPERTIES = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

export function objectValueAt(object, property, timeMs) {
  const keyframes = (object.keyframes ?? []).map((frame) => ({ timeMs: frame.timeMs, value: frame[property], easing: frame.easing }));
  return sampleKeyframes(keyframes, timeMs, PROPERTIES[property]);
}

export function objectStateAt(object, timeMs) {
  return Object.fromEntries(Object.keys(PROPERTIES).map((property) => [property, objectValueAt(object, property, timeMs)]));
}
