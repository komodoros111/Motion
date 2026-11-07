import test from "node:test";
import assert from "node:assert/strict";
import { splitUnits, unitDelay, unitPose, revealPoses } from "../src/kinetic.js";
import { drawBackdrop } from "../src/backdrop.js";
import { ENTER_PRESETS, sceneEnter, sceneOrigin } from "../src/presets.js";

test("kinetic text keeps spaces and handles words, characters, and stagger orders", () => {
  assert.equal(splitUnits("GO NOW", "char").map((part) => part.text).join(""), "GO NOW");
  assert.equal(splitUnits("GO NOW", "word").map((part) => part.text).join(""), "GO NOW");
  assert.equal(unitDelay(0, 5, 20, "reverse"), 80);
  assert.equal(unitDelay(2, 5, 20, "center"), 0);
  assert.equal(unitPose("rise", 1).opacity, 1);
});

test("scene entrances settle to neutral and honor transition-centered origin", () => {
  const scene = { startMs: 5000, transition: { type: "fade", durationMs: 600 }, enter: "pop-in" };
  assert.equal(sceneOrigin(scene), 4700);
  assert.equal(sceneEnter(scene, 2000).scale, 1);
  assert.ok(ENTER_PRESETS.length >= 7);
  assert.equal(sceneEnter({ startMs: 0 }, 0).opacity, 1);
});

test("animated backdrops draw through a canvas context and none is a no-op", () => {
  const calls = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({
    save() {}, restore() {}, createRadialGradient() { return gradient; }, createLinearGradient() { return gradient; },
    fillRect() { calls.push("fillRect"); }, beginPath() {}, arc() { calls.push("arc"); }, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, rect() {}, clip() {}
  }, { set(target, key, value) { target[key] = value; return true; } });
  drawBackdrop(ctx, 640, 360, { id: "test", objectColor: "#aabbcc", backdrop: { type: "particles", intensity: .5, speed: 1 } }, 1000);
  assert.ok(calls.length > 0);
  const count = calls.length;
  drawBackdrop(ctx, 640, 360, { backdrop: { type: "none" } }, 1000);
  assert.equal(calls.length, count);
});

test("reveal poses converge to a visible resting state", () => {
  const { poses, endMs } = revealPoses({ label: "NEXT", reveal: { style: "drop", unit: "char", staggerMs: 30, durationMs: 300 } }, 1000);
  assert.equal(poses.length, 4);
  assert.ok(endMs > 300);
  assert.ok(poses.every((pose) => pose.opacity === 1 && pose.dy === 0));
});
