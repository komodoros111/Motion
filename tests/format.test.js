import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { crc32, createSampleMotion, validateMotionDocument, encodeMotionBinary, decodeMotionBinary, repairMotionChecksum } from "../src/motion-format.js";

const sample = () => createSampleMotion();

test("CRC-32 matches the reference vector", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("NVMB round-trips the sample project", () => {
  const bytes = encodeMotionBinary(sample());
  assert.deepEqual(decodeMotionBinary(bytes), sample());
});

test("NVMB rejects truncated files, trailing bytes and a bad checksum", () => {
  const bytes = encodeMotionBinary(sample());
  assert.throws(() => decodeMotionBinary(bytes.subarray(0, bytes.length - 1)), /length/i);
  assert.throws(() => decodeMotionBinary(new Uint8Array([...bytes, 0])), /length/i);
  const corrupted = bytes.slice(); corrupted[40] ^= 0xff;
  assert.throws(() => decodeMotionBinary(corrupted), /CRC/);
  // Recalculating the CRC only fixes the checksum: it must never be reported as a CRC error afterwards.
  try { decodeMotionBinary(repairMotionChecksum(corrupted)); } catch (error) { assert.doesNotMatch(error.message, /CRC/); }
});

test("every bundled example is valid", () => {
  for (const file of readdirSync(new URL("../examples/", import.meta.url))) {
    const data = readFileSync(new URL(`../examples/${file}`, import.meta.url));
    if (file.endsWith(".json")) assert.doesNotThrow(() => validateMotionDocument(JSON.parse(data.toString("utf8"))), file);
    if (file.endsWith(".nvmb")) assert.doesNotThrow(() => decodeMotionBinary(new Uint8Array(data)), file);
  }
});

test("validator rejects invalid documents", () => {
  const bad = (mutate, pattern) => { const doc = sample(); mutate(doc); assert.throws(() => validateMotionDocument(doc), pattern); };
  bad((d) => { d.tracks[0].keyframes[0].easing = "bouncy"; }, /keyframe/i);
  bad((d) => { d.tracks.push({ ...structuredClone(d.tracks[0]), id: "dup", keyframes: [] }); }, /already exists/);
  bad((d) => { d.tracks.find((t) => t.property === "scale").keyframes[0].value = 0; }, /Scale/);
  bad((d) => { d.tracks.find((t) => t.property === "opacity").keyframes[0].value = 2; }, /Opacity/i);
  bad((d) => { d.scenes[1].startMs = d.scenes[0].startMs + 100; }, /overlap/i);
  bad((d) => { d.scenes[1].background = "red"; }, /scene/i);
  bad((d) => { d.durationMs = 50; }, /Duration/);
});

test("motion objects accept explicit fill and shadow styling while keeping bounds", () => {
  const doc = sample();
  doc.objects = [{ id: "style-object", name: "Styled shape", type: "star", color: "#47d9ff", colorEnd: "#ff5f9b", size: 140, fillStyle: "radial", glow: 48, shadow: 24, innerShadow: 32, keyframes: [{ id: "style-key", timeMs: 0, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, easing: "linear" }] }];
  assert.doesNotThrow(() => validateMotionDocument(doc));
  doc.objects[0].innerShadow = 101;
  assert.throws(() => validateMotionDocument(doc), /motion object/i);
});

test("validator accepts every new easing name", async () => {
  const { EASING_NAMES } = await import("../src/easing.js");
  for (const name of EASING_NAMES) {
    const doc = sample(); doc.tracks[0].keyframes[0].easing = name;
    assert.doesNotThrow(() => validateMotionDocument(doc), name);
  }
});
