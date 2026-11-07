import test from "node:test";
import assert from "node:assert/strict";
import { createSampleMotion, validateMotionDocument } from "../src/motion-format.js";
import { PRESETS, applyPreset } from "../src/presets.js";

const counter = () => { let n = 0; return (kind) => `${kind}-t${++n}`; };

test("preset ids are unique, frames are ordered inside 0..1 and at least one track spans the whole preset", () => {
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
  for (const preset of PRESETS) {
    const tracks = Object.values(preset.tracks);
    for (const frames of tracks) assert.ok(frames.every((f, i) => f.at >= 0 && f.at <= 1 && (i === 0 || f.at > frames[i - 1].at)), preset.id);
    assert.ok(tracks.some((frames) => frames[0].at === 0 && frames.at(-1).at === 1), `${preset.id} spans 0..1`);
  }
});

test("every preset produces a valid document on the sample and on an empty project", () => {
  for (const preset of PRESETS) {
    for (const base of [createSampleMotion(), { ...createSampleMotion(), tracks: [] }]) {
      const doc = structuredClone(base); const id = counter();
      const result = applyPreset(doc, preset, 500, id);
      assert.ok(result.added > 0, preset.id);
      assert.doesNotThrow(() => validateMotionDocument(doc), preset.id);
    }
  }
});

test("applying replaces same-property keyframes inside the window and keeps the rest", () => {
  const doc = createSampleMotion(); const before = doc.tracks.find((t) => t.property === "x").keyframes.map((f) => f.id);
  applyPreset(doc, PRESETS.find((p) => p.id === "slide-left"), 200, counter());
  const x = doc.tracks.find((t) => t.property === "x").keyframes;
  assert.ok(x.every((f, i) => i === 0 || f.timeMs >= x[i - 1].timeMs), "sorted");
  assert.ok(!x.some((f) => before.includes(f.id) && f.timeMs >= 200 && f.timeMs <= 1000), "old in-window keyframes removed");
  assert.ok(x.some((f) => before.includes(f.id) && f.timeMs > 1000), "later keyframes kept");
});

test("a preset near the end is squeezed to fit; with no room it fails without touching the project", () => {
  const doc = createSampleMotion(); applyPreset(doc, PRESETS[0], doc.durationMs - 300, counter());
  assert.ok(doc.tracks.flatMap((t) => t.keyframes).every((f) => f.timeMs <= doc.durationMs));
  const snapshot = JSON.stringify(doc);
  assert.throws(() => applyPreset(doc, PRESETS[0], doc.durationMs - 10, counter()), /Not enough timeline/);
  assert.equal(JSON.stringify(doc), snapshot);
});

test("generated ids never collide with existing ones", () => {
  const doc = createSampleMotion(); const id = (kind) => `${kind}-${crypto.randomUUID()}`;
  for (const preset of PRESETS) applyPreset(doc, preset, 100, id);
  assert.doesNotThrow(() => validateMotionDocument(doc));
});
