// Animated scene backdrops drawn on a 2D canvas. The live preview and the WebM exporter call the
// same function, so a backdrop looks the same in both. Deterministic: same time => same pixels.

export const BACKDROP_LABELS = { none: "None", aurora: "Aurora glow", particles: "Floating particles", rings: "Pulse rings", grid: "Perspective grid" };
export const BACKDROP_TYPES = Object.keys(BACKDROP_LABELS);
export const BACKDROP_DEFAULTS = { type: "aurora", intensity: .6, speed: 1 };

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`; };
const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`; };

export function hashSeed(text) { let h = 2166136261; for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Draw `scene.backdrop` over an already-filled background. No-op for none / missing. */
export function drawBackdrop(ctx, width, height, scene, timeMs) {
  const cfg = scene?.backdrop ? { ...BACKDROP_DEFAULTS, ...scene.backdrop } : null;
  if (!cfg || cfg.type === "none" || width < 2 || height < 2) return;
  const color = scene.objectColor || "#a78bfa", t = timeMs / 1000 * cfg.speed, k = cfg.intensity, unit = width / 1280;
  ctx.save();
  if (cfg.type === "aurora") {
    ctx.globalCompositeOperation = "lighter";
    const blobs = [[color, .21, .17, 0, .62], [mix(color, "#47d9ff", .65), .13, .27, 2.1, .5], [mix(color, "#ff5f9b", .65), .17, .11, 4.2, .46]];
    for (const [c, fx, fy, ph, r] of blobs) {
      const x = width * (.5 + .34 * Math.sin(t * fx * 6.283 + ph)), y = height * (.5 + .3 * Math.cos(t * fy * 6.283 + ph * 1.3)), radius = width * r;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, rgba(c, .5 * k)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
    }
  } else if (cfg.type === "particles") {
    ctx.globalCompositeOperation = "lighter";
    const rand = rng(hashSeed(scene.id ?? scene.label ?? "scene")), count = Math.round(30 + 90 * k);
    for (let i = 0; i < count; i++) {
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
      const y = (((r2 - t * (.02 + .05 * r3)) % 1) + 1) % 1, x = r1 + .018 * Math.sin(t * .8 + r4 * 6.283);
      const alpha = (.2 + .6 * r4) * (.65 + .35 * Math.sin(t * 2 + r1 * 20)) * Math.min(1, .35 + k) * Math.sin(Math.PI * y) ** .5;
      ctx.fillStyle = rgba(r3 > .7 ? "#ffffff" : color, alpha); ctx.beginPath(); ctx.arc(x * width, y * height, (.7 + 2.4 * r3) * unit, 0, 6.283); ctx.fill();
    }
  } else if (cfg.type === "rings") {
    const cx = width / 2, cy = height * .52, reach = Math.hypot(width, height) * .55;
    for (let i = 0; i < 4; i++) {
      const p = (t * .22 + i / 4) % 1;
      ctx.strokeStyle = rgba(color, (1 - p) ** 1.6 * .5 * k); ctx.lineWidth = Math.max(1, (2.2 - p * 1.4) * unit * 1.5);
      ctx.beginPath(); ctx.arc(cx, cy, p * reach, 0, 6.283); ctx.stroke();
    }
  } else if (cfg.type === "grid") {
    const horizon = height * .58, floor = height - horizon, phase = (t * .32) % 1;
    const glow = ctx.createLinearGradient(0, horizon - floor * .35, 0, horizon + floor * .12); glow.addColorStop(0, rgba(color, 0)); glow.addColorStop(.7, rgba(color, .2 * k)); glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, horizon - floor * .35, width, floor * .47);
    ctx.beginPath(); ctx.rect(0, horizon, width, floor); ctx.clip(); ctx.lineWidth = Math.max(1, unit * 1.2);
    for (let i = 0; i < 14; i++) { const u = (i + phase) / 14, y = horizon + floor * u * u; ctx.strokeStyle = rgba(color, u * .55 * k); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    for (let n = -14; n <= 14; n++) { ctx.strokeStyle = rgba(color, (.32 - Math.abs(n) * .008) * k); ctx.beginPath(); ctx.moveTo(width / 2 + n * width * .012, horizon); ctx.lineTo(width / 2 + n * width * .16, height); ctx.stroke(); }
  }
  ctx.restore();
}
