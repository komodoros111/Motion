export const MOTION_FORMAT = "nirvy.motion";
export const MOTION_VERSION = 1;
export const MAX_BINARY_BYTES = 16 * 1024 * 1024;
const MAGIC = new Uint8Array([0x4e, 0x56, 0x4d, 0x42]); // NVMB
const HEADER_BYTES = 16;

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let value = i;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[i] = value >>> 0;
}

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function createSampleMotion() {
  return {
    format: MOTION_FORMAT,
    version: MOTION_VERSION,
    name: "Signal — Motion Study",
    durationMs: 4000,
    fps: 30,
    canvas: { width: 1280, height: 720, background: "#070912", label: "SIGNAL", objectColor: "#b9a3ff", subtitle: "DESIGN IN MOTION", effects: { reflection: 0.36, contrast: 1.25, brightness: 1.08, shine: 0.68, perspective: 900 } },
    tracks: [
      { id: "track-x", property: "x", label: "Position X", keyframes: [{ id: "x0", timeMs: 0, value: -210, easing: "easeOut" }, { id: "x1", timeMs: 1250, value: 0, easing: "easeInOut" }, { id: "x2", timeMs: 4000, value: 0, easing: "easeIn" }] },
      { id: "track-y", property: "y", label: "Position Y", keyframes: [{ id: "y0", timeMs: 0, value: 85, easing: "easeOut" }, { id: "y1", timeMs: 1250, value: 0, easing: "easeInOut" }, { id: "y2", timeMs: 4000, value: 0, easing: "easeIn" }] },
      { id: "track-rotation", property: "rotation", label: "Z Rotation", keyframes: [{ id: "r0", timeMs: 0, value: -24, easing: "easeOut" }, { id: "r1", timeMs: 1600, value: 0, easing: "easeInOut" }, { id: "r2", timeMs: 4000, value: 0, easing: "easeIn" }] },
      { id: "track-scale", property: "scale", label: "Scale", keyframes: [{ id: "s0", timeMs: 0, value: 0.35, easing: "easeOut" }, { id: "s1", timeMs: 900, value: 1.15, easing: "easeInOut" }, { id: "s2", timeMs: 1600, value: 1, easing: "linear" }] },
      { id: "track-opacity", property: "opacity", label: "Opacity", keyframes: [{ id: "o0", timeMs: 0, value: 0, easing: "easeOut" }, { id: "o1", timeMs: 650, value: 1, easing: "linear" }] },
      { id: "track-rotation-y", property: "rotationY", label: "3D Y Rotation", keyframes: [{ id: "ry0", timeMs: 0, value: -65, easing: "easeOut" }, { id: "ry1", timeMs: 1100, value: 0, easing: "easeOut" }] },
      { id: "track-shine", property: "shineSweep", label: "Shine Sweep", keyframes: [{ id: "sh0", timeMs: 700, value: -1, easing: "linear" }, { id: "sh1", timeMs: 1500, value: 1, easing: "easeInOut" }] },
      { id: "track-screen-turn", property: "screenTurn", label: "Screen Turn", keyframes: [{ id: "st0", timeMs: 0, value: -24, easing: "easeOut" }, { id: "st1", timeMs: 900, value: 0, easing: "easeInOut" }] },
    ],
    scenes: [
      { id: "scene-signal", startMs: 0, label: "SIGNAL", subtitle: "A NEW LEVEL OF MOTION", background: "#070912", objectColor: "#a78bfa", transition: { type: "flip", durationMs: 620 } },
      { id: "scene-motion", startMs: 1900, label: "MAKE IT MOVE", subtitle: "DEPTH · LIGHT · IMPACT", background: "#090818", objectColor: "#63e6ff", transition: { type: "reflectionFlip", durationMs: 760 } },
      { id: "scene-create", startMs: 3000, label: "CREATE WITHOUT LIMITS", subtitle: "DESIGN IN MOTION", background: "#100817", objectColor: "#ff668e", transition: { type: "zoom", durationMs: 600 } },
    ],
  };
}

export function validateMotionDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The document must be a JSON object.");
  if (value.format !== MOTION_FORMAT || value.version !== MOTION_VERSION) throw new Error("Unrecognized motion format or version.");
  if (typeof value.name !== "string" || value.name.length > 120) throw new Error("Project name is invalid.");
  if (!Number.isFinite(value.durationMs) || value.durationMs < 100 || value.durationMs > 120000) throw new Error("Duration must be between 100 ms and 120 s.");
  if (!Number.isFinite(value.fps) || value.fps < 1 || value.fps > 240) throw new Error("FPS must be between 1 and 240.");
  if (!value.canvas || !Number.isFinite(value.canvas.width) || !Number.isFinite(value.canvas.height) || value.canvas.width < 1 || value.canvas.width > 8192 || value.canvas.height < 1 || value.canvas.height > 8192) throw new Error("Invalid canvas: width and height must be between 1 and 8192 px.");
  if (value.canvas.label !== undefined && (typeof value.canvas.label !== "string" || value.canvas.label.length > 24)) throw new Error("Scene title must be 24 characters or fewer.");
  if (value.canvas.subtitle !== undefined && (typeof value.canvas.subtitle !== "string" || value.canvas.subtitle.length > 80)) throw new Error("Subtitle must be 80 characters or fewer.");
  if (value.canvas.effects !== undefined) {
    const effects = value.canvas.effects;
    if (!effects || typeof effects !== "object" || (effects.reflection !== undefined && (!Number.isFinite(effects.reflection) || effects.reflection < 0 || effects.reflection > 1)) || (effects.contrast !== undefined && (!Number.isFinite(effects.contrast) || effects.contrast < 0 || effects.contrast > 3)) || (effects.brightness !== undefined && (!Number.isFinite(effects.brightness) || effects.brightness < 0 || effects.brightness > 3)) || (effects.shine !== undefined && (!Number.isFinite(effects.shine) || effects.shine < 0 || effects.shine > 1)) || (effects.perspective !== undefined && (!Number.isFinite(effects.perspective) || effects.perspective < 100 || effects.perspective > 3000))) throw new Error("Invalid visual effects: check reflection, contrast, brightness, shine, and perspective ranges.");
  }
  if (value.scenes !== undefined) {
    if (!Array.isArray(value.scenes) || value.scenes.length < 1 || value.scenes.length > 32) throw new Error("A project can contain 1–32 scenes.");
    const sceneIds = new Set(); let previousStart = -1;
    for (const scene of value.scenes) {
      if (!scene || typeof scene.id !== "string" || !scene.id || sceneIds.has(scene.id) || !Number.isFinite(scene.startMs) || scene.startMs < 0 || scene.startMs >= value.durationMs || scene.startMs <= previousStart || typeof scene.label !== "string" || scene.label.length > 24 || typeof scene.subtitle !== "string" || scene.subtitle.length > 80 || typeof scene.background !== "string" || !/^#[\da-f]{6}$/i.test(scene.background) || typeof scene.objectColor !== "string" || !/^#[\da-f]{6}$/i.test(scene.objectColor)) throw new Error("Invalid scene: use unique IDs, ordered start times, supported text, and #RRGGBB colors.");
      sceneIds.add(scene.id); previousStart = scene.startMs;
      if (scene.transition !== undefined && (!scene.transition || !["cut", "fade", "flip", "cube", "wipe", "zoom", "flash", "reflectionFlip", "spin"].includes(scene.transition.type) || !Number.isFinite(scene.transition.durationMs) || scene.transition.durationMs < 100 || scene.transition.durationMs > 4000 || scene.startMs + (scene.transition.type === "cut" ? 0 : scene.transition.durationMs / 2) > value.durationMs)) throw new Error("Invalid scene transition type, duration, or timeline position.");
    }
    const transitionHalf = (scene) => scene.transition?.type === "cut" ? 0 : (scene.transition?.durationMs ?? 0) / 2;
    for (let i = 1; i < value.scenes.length; i++) {
      if (value.scenes[i].startMs - value.scenes[i - 1].startMs < transitionHalf(value.scenes[i]) + transitionHalf(value.scenes[i - 1])) throw new Error("Adjacent scene transition windows must not overlap.");
    }
  }
  if (value.narration !== undefined && (!value.narration || typeof value.narration !== "object" || typeof value.narration.text !== "string" || value.narration.text.length > 1000 || (value.narration.voiceURI !== undefined && (typeof value.narration.voiceURI !== "string" || value.narration.voiceURI.length > 500)) || (value.narration.rate !== undefined && (!Number.isFinite(value.narration.rate) || value.narration.rate < 0.5 || value.narration.rate > 2)))) throw new Error("Invalid narration: limit text to 1000 characters and speech rate to 0.5–2.");
  for (const key of ["background", "objectColor"]) if (value.canvas[key] !== undefined && (typeof value.canvas[key] !== "string" || !/^#[\da-f]{6}$/i.test(value.canvas[key]))) throw new Error(`Invalid ${key} color; use #RRGGBB hex format.`);
  if (!Array.isArray(value.tracks) || value.tracks.length > 64) throw new Error("Track list is invalid or exceeds the 64-track limit.");
  const properties = new Set(["x", "y", "rotation", "rotationX", "rotationY", "screenTurn", "scale", "opacity", "contrast", "brightness", "shineSweep", "reflection"]);
  const easing = new Set(["linear", "easeIn", "easeOut", "easeInOut"]);
  const ids = new Set();
  const usedProperties = new Set();
  let keyframeCount = 0;
  for (const track of value.tracks) {
    if (!track || typeof track !== "object" || !properties.has(track.property) || !Array.isArray(track.keyframes)) throw new Error("Invalid track or unsupported animated property.");
    if (typeof track.id !== "string" || !track.id || ids.has(track.id)) throw new Error("Track ID is empty or duplicated.");
    if (usedProperties.has(track.property)) throw new Error(`A ${track.property} track already exists; use one track per property.`);
    usedProperties.add(track.property);
    ids.add(track.id);
    keyframeCount += track.keyframes.length;
    if (keyframeCount > 10000) throw new Error("The project exceeds the 10,000-keyframe limit.");
    for (const frame of track.keyframes) {
      if (!frame || typeof frame.id !== "string" || !frame.id || ids.has(frame.id) || !Number.isFinite(frame.timeMs) || frame.timeMs < 0 || frame.timeMs > value.durationMs || !Number.isFinite(frame.value) || !easing.has(frame.easing)) throw new Error("Invalid keyframe: check unique IDs, time, numeric value, and easing.");
      ids.add(frame.id);
      if (track.property === "opacity" && (frame.value < 0 || frame.value > 1)) throw new Error("Opacity must stay between 0 and 1.");
      if (track.property === "scale" && (frame.value <= 0 || frame.value > 100)) throw new Error("Scale must be greater than 0 and at most 100.");
      if (["x", "y"].includes(track.property) && Math.abs(frame.value) > 100000) throw new Error("Positions must stay between -100000 and 100000.");
      if (track.property === "rotation" && Math.abs(frame.value) > 360000) throw new Error("Rotation must stay between -360000° and 360000°.");
      if (["rotationX", "rotationY", "screenTurn"].includes(track.property) && Math.abs(frame.value) > 360000) throw new Error(`${track.property} must stay between -360000° and 360000°.`);
      if (["shine", "reflection", "opacity"].includes(track.property) && (frame.value < 0 || frame.value > 1)) throw new Error(`${track.property} must stay between 0 and 1.`);
      if (track.property === "shineSweep" && (frame.value < -1 || frame.value > 1)) throw new Error("shineSweep must stay between -1 and 1.");
      if (["contrast", "brightness"].includes(track.property) && (frame.value < 0 || frame.value > 3)) throw new Error(`${track.property} must stay between 0 and 3.`);
    }
  }
  for (const scene of value.scenes ?? []) {
    if (ids.has(scene.id)) throw new Error(`Scene ID ${scene.id} is already used by a track or keyframe.`);
    ids.add(scene.id);
  }
  return structuredClone(value);
}

export function encodeMotionBinary(documentValue) {
  const document = validateMotionDocument(documentValue);
  const payload = new TextEncoder().encode(JSON.stringify(document, null, 2));
  if (payload.byteLength + HEADER_BYTES > MAX_BINARY_BYTES) throw new Error("Project exceeds the 16 MiB binary limit.");
  const buffer = new ArrayBuffer(HEADER_BYTES + payload.byteLength);
  const bytes = new Uint8Array(buffer);
  bytes.set(MAGIC, 0);
  const view = new DataView(buffer);
  view.setUint16(4, MOTION_VERSION, true);
  view.setUint16(6, HEADER_BYTES, true);
  view.setUint32(8, payload.byteLength, true);
  view.setUint32(12, crc32(payload), true);
  bytes.set(payload, HEADER_BYTES);
  return bytes;
}

export function decodeMotionBinary(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < HEADER_BYTES || bytes.byteLength > MAX_BINARY_BYTES) throw new Error("Invalid binary file size.");
  if (!MAGIC.every((byte, index) => bytes[index] === byte)) throw new Error("NVMB signature not found.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint16(4, true);
  const headerBytes = view.getUint16(6, true);
  const payloadLength = view.getUint32(8, true);
  const checksum = view.getUint32(12, true);
  if (version !== MOTION_VERSION || headerBytes !== HEADER_BYTES) throw new Error("Unsupported version or header size.");
  if (headerBytes + payloadLength !== bytes.byteLength) throw new Error("Payload length does not match the header.");
  const payload = bytes.subarray(headerBytes);
  if (crc32(payload) !== checksum) throw new Error("Invalid CRC-32. Repair the payload bytes or recalculate the checksum.");
  return validateMotionDocument(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload)));
}

export function repairMotionChecksum(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < HEADER_BYTES || !MAGIC.every((byte, index) => bytes[index] === byte)) throw new Error("File is not a valid NVMB container.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerBytes = view.getUint16(6, true);
  const payloadLength = view.getUint32(8, true);
  if (headerBytes !== HEADER_BYTES || headerBytes + payloadLength !== bytes.byteLength) throw new Error("Header/payload mismatch; the file was not changed.");
  view.setUint32(12, crc32(bytes.subarray(headerBytes)), true);
  return bytes;
}
