import test from "node:test";
import assert from "node:assert/strict";
import { EASING_NAMES, ease, sampleKeyframes, curvePath } from "../src/easing.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("every easing starts at 0 and ends at 1", () => {
  for (const name of EASING_NAMES) { close(ease(0, name), 0); close(ease(1, name), 1); }
});

test("original v1 easings keep their exact formulas", () => {
  close(ease(.5, "linear"), .5); close(ease(.5, "easeIn"), .25); close(ease(.5, "easeOut"), .75); close(ease(.25, "easeInOut"), .125);
  assert.equal(ease(.3, "not-an-easing"), .3, "unknown names fall back to linear");
});

test("input is clamped to 0..1", () => { assert.equal(ease(-5, "easeOutBounce"), 0); assert.equal(ease(9, "easeOutBounce"), 1); });

test("overshoot easings leave the 0..1 range, ordinary ones do not", () => {
  const peak = (name) => Math.max(...Array.from({ length: 101 }, (_, i) => ease(i / 100, name)));
  for (const name of ["easeOutBack", "easeOutElastic", "spring"]) assert.ok(peak(name) > 1.02, name);
  for (const name of ["linear", "easeOut", "easeOutCubic", "easeOutExpo", "easeOutBounce"]) assert.ok(peak(name) <= 1 + 1e-9, name);
  assert.ok(Math.min(...Array.from({ length: 101 }, (_, i) => ease(i / 100, "easeInBack"))) < -.05);
});

test("hold keeps the previous value until the next keyframe", () => {
  const frames = [{ timeMs: 0, value: 10, easing: "linear" }, { timeMs: 1000, value: 20, easing: "hold" }];
  assert.equal(sampleKeyframes(frames, 999, 0), 10); assert.equal(sampleKeyframes(frames, 1000, 0), 20);
});

test("sampling uses the ARRIVING keyframe easing (preview and export share this)", () => {
  const frames = [{ timeMs: 0, value: 0, easing: "easeOut" }, { timeMs: 1000, value: 100, easing: "easeIn" }];
  close(sampleKeyframes(frames, 500, 0), 25, 1e-9); // easeIn(0.5) = 0.25, not easeOut's 0.75
});

test("sampling holds ends, handles unsorted input and empty tracks", () => {
  const frames = [{ timeMs: 1000, value: 5, easing: "linear" }, { timeMs: 0, value: 1, easing: "linear" }];
  assert.equal(sampleKeyframes(frames, -10, 0), 1); assert.equal(sampleKeyframes(frames, 5000, 0), 5); close(sampleKeyframes(frames, 500, 0), 3);
  assert.equal(sampleKeyframes([], 100, 42), 42);
});

test("curvePath returns a drawable path for every easing", () => {
  for (const name of EASING_NAMES) { const { d } = curvePath(name); assert.match(d, /^M[\d.\- ]+(L[\d.\- ]+)+$/, name); assert.ok(!d.includes("NaN"), name); }
});
