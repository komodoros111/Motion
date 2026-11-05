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
    name: "Aurora — entrada",
    durationMs: 4000,
    fps: 30,
    canvas: { width: 1280, height: 720, background: "#090b13", label: "M", objectColor: "#b9a3ff", subtitle: "" },
    tracks: [
      { id: "track-x", property: "x", label: "Posição X", keyframes: [{ id: "x0", timeMs: 0, value: -210, easing: "easeOut" }, { id: "x1", timeMs: 1250, value: 0, easing: "easeInOut" }, { id: "x2", timeMs: 4000, value: 170, easing: "easeIn" }] },
      { id: "track-y", property: "y", label: "Posição Y", keyframes: [{ id: "y0", timeMs: 0, value: 85, easing: "easeOut" }, { id: "y1", timeMs: 1250, value: 0, easing: "easeInOut" }, { id: "y2", timeMs: 4000, value: -60, easing: "easeIn" }] },
      { id: "track-rotation", property: "rotation", label: "Rotação", keyframes: [{ id: "r0", timeMs: 0, value: -24, easing: "easeOut" }, { id: "r1", timeMs: 1600, value: 0, easing: "easeInOut" }, { id: "r2", timeMs: 4000, value: 20, easing: "easeIn" }] },
      { id: "track-scale", property: "scale", label: "Escala", keyframes: [{ id: "s0", timeMs: 0, value: 0.35, easing: "easeOut" }, { id: "s1", timeMs: 900, value: 1.15, easing: "easeInOut" }, { id: "s2", timeMs: 1600, value: 1, easing: "linear" }] },
      { id: "track-opacity", property: "opacity", label: "Opacidade", keyframes: [{ id: "o0", timeMs: 0, value: 0, easing: "easeOut" }, { id: "o1", timeMs: 650, value: 1, easing: "linear" }] },
    ],
  };
}

export function validateMotionDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("O documento precisa ser um objeto JSON.");
  if (value.format !== MOTION_FORMAT || value.version !== MOTION_VERSION) throw new Error("Formato ou versão de motion não reconhecidos.");
  if (typeof value.name !== "string" || value.name.length > 120) throw new Error("Nome inválido.");
  if (!Number.isFinite(value.durationMs) || value.durationMs < 100 || value.durationMs > 120000) throw new Error("Duração deve ficar entre 100 ms e 120 s.");
  if (!Number.isFinite(value.fps) || value.fps < 1 || value.fps > 240) throw new Error("FPS deve ficar entre 1 e 240.");
  if (!value.canvas || !Number.isFinite(value.canvas.width) || !Number.isFinite(value.canvas.height) || value.canvas.width < 1 || value.canvas.width > 8192 || value.canvas.height < 1 || value.canvas.height > 8192) throw new Error("Canvas inválido: largura e altura devem ficar entre 1 e 8192 px.");
  if (value.canvas.label !== undefined && (typeof value.canvas.label !== "string" || value.canvas.label.length > 24)) throw new Error("O texto do elemento deve ter até 24 caracteres.");
  if (value.canvas.subtitle !== undefined && (typeof value.canvas.subtitle !== "string" || value.canvas.subtitle.length > 80)) throw new Error("A frase de apoio deve ter até 80 caracteres.");
  for (const key of ["background", "objectColor"]) if (value.canvas[key] !== undefined && (typeof value.canvas[key] !== "string" || !/^#[\da-f]{6}$/i.test(value.canvas[key]))) throw new Error(`Cor ${key} inválida; use hexadecimal no formato #RRGGBB.`);
  if (!Array.isArray(value.tracks) || value.tracks.length > 64) throw new Error("Lista de trilhas inválida ou longa demais.");
  const properties = new Set(["x", "y", "rotation", "scale", "opacity"]);
  const easing = new Set(["linear", "easeIn", "easeOut", "easeInOut"]);
  const ids = new Set();
  const usedProperties = new Set();
  let keyframeCount = 0;
  for (const track of value.tracks) {
    if (!track || typeof track !== "object" || !properties.has(track.property) || !Array.isArray(track.keyframes)) throw new Error("Trilha inválida.");
    if (typeof track.id !== "string" || !track.id || ids.has(track.id)) throw new Error("ID de trilha vazio ou duplicado.");
    if (usedProperties.has(track.property)) throw new Error(`Já existe uma trilha para ${track.property}; o preview anima uma trilha por propriedade.`);
    usedProperties.add(track.property);
    ids.add(track.id);
    keyframeCount += track.keyframes.length;
    if (keyframeCount > 10000) throw new Error("O projeto excede 10.000 keyframes.");
    for (const frame of track.keyframes) {
      if (!frame || typeof frame.id !== "string" || !frame.id || ids.has(frame.id) || !Number.isFinite(frame.timeMs) || frame.timeMs < 0 || frame.timeMs > value.durationMs || !Number.isFinite(frame.value) || !easing.has(frame.easing)) throw new Error("Keyframe inválido: confira IDs únicos, tempo, valor e interpolação.");
      ids.add(frame.id);
      if (track.property === "opacity" && (frame.value < 0 || frame.value > 1)) throw new Error("Opacidade precisa ficar entre 0 e 1.");
      if (track.property === "scale" && (frame.value <= 0 || frame.value > 100)) throw new Error("Escala precisa ser maior que 0 e no máximo 100.");
      if (["x", "y"].includes(track.property) && Math.abs(frame.value) > 100000) throw new Error("Posições precisam ficar entre -100000 e 100000.");
      if (track.property === "rotation" && Math.abs(frame.value) > 360000) throw new Error("Rotação precisa ficar entre -360000° e 360000°.");
    }
  }
  return structuredClone(value);
}

export function encodeMotionBinary(documentValue) {
  const document = validateMotionDocument(documentValue);
  const payload = new TextEncoder().encode(JSON.stringify(document, null, 2));
  if (payload.byteLength + HEADER_BYTES > MAX_BINARY_BYTES) throw new Error("O projeto excede o limite binário de 16 MiB.");
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
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < HEADER_BYTES || bytes.byteLength > MAX_BINARY_BYTES) throw new Error("Tamanho de arquivo binário inválido.");
  if (!MAGIC.every((byte, index) => bytes[index] === byte)) throw new Error("Assinatura NVMB não encontrada.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint16(4, true);
  const headerBytes = view.getUint16(6, true);
  const payloadLength = view.getUint32(8, true);
  const checksum = view.getUint32(12, true);
  if (version !== MOTION_VERSION || headerBytes !== HEADER_BYTES) throw new Error("Versão ou tamanho de cabeçalho não suportado.");
  if (headerBytes + payloadLength !== bytes.byteLength) throw new Error("O tamanho do payload não corresponde ao cabeçalho.");
  const payload = bytes.subarray(headerBytes);
  if (crc32(payload) !== checksum) throw new Error("CRC-32 inválido. Corrija os bytes do payload ou recalcule o checksum.");
  return validateMotionDocument(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload)));
}

export function repairMotionChecksum(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < HEADER_BYTES || !MAGIC.every((byte, index) => bytes[index] === byte)) throw new Error("O arquivo não é um contêiner NVMB válido.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerBytes = view.getUint16(6, true);
  const payloadLength = view.getUint32(8, true);
  if (headerBytes !== HEADER_BYTES || headerBytes + payloadLength !== bytes.byteLength) throw new Error("Cabeçalho/payload inconsistente; não alterei o arquivo.");
  view.setUint32(12, crc32(bytes.subarray(headerBytes)), true);
  return bytes;
}
