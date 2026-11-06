const defaults = { x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, screenTurn: 0, scale: 1, opacity: 1, contrast: 1, brightness: 1, shineSweep: -1, reflection: .36 };

function ease(t, type) {
  if (type === "easeIn") return t * t;
  if (type === "easeOut") return 1 - (1 - t) ** 2;
  if (type === "easeInOut") return t < .5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  return t;
}

function valueAt(project, property, time) {
  const frames = [...(project.tracks.find((track) => track.property === property)?.keyframes ?? [])].sort((a, b) => a.timeMs - b.timeMs);
  if (!frames.length) return project.canvas.effects?.[property] ?? defaults[property];
  if (time <= frames[0].timeMs) return frames[0].value;
  if (time >= frames.at(-1).timeMs) return frames.at(-1).value;
  const i = frames.findIndex((frame) => frame.timeMs >= time), a = frames[i - 1], b = frames[i];
  const t = (time - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
  return a.value + (b.value - a.value) * ease(t, a.easing);
}

function sceneAtTime(project, time) {
  const scenes = project.scenes?.length ? project.scenes : [{ id: "base", startMs: 0, label: project.canvas.label || "M", subtitle: project.canvas.subtitle || "", background: project.canvas.background || "#090b13", objectColor: project.canvas.objectColor || "#b9a3ff", transition: { type: "cut", durationMs: 0 } }];
  let index = scenes.findLastIndex((scene) => scene.startMs <= time); if (index < 0) index = 0;
  const next = scenes[index + 1], nextHalf = next?.transition?.type === "cut" ? 0 : (next?.transition?.durationMs ?? 0) / 2;
  if (next && nextHalf > 0 && time >= next.startMs - nextHalf) index += 1;
  const incoming = scenes[index], outgoing = scenes[index - 1], transition = incoming.transition ?? { type: "cut", durationMs: 0 }, half = transition.type === "cut" ? 0 : transition.durationMs / 2;
  if (outgoing && half && time >= incoming.startMs - half && time <= incoming.startMs + half) return { incoming, outgoing, type: transition.type, progress: Math.max(0, Math.min(1, (time - incoming.startMs + half) / (half * 2))) };
  return { incoming, outgoing: null, type: "cut", progress: 1 };
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
}

function renderScene(ctx, project, scene, time, width, height) {
  const { canvas } = project, sx = width / canvas.width, sy = height / canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = scene.background || canvas.background || "#080912"; ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * .5, height * .58, 0, width * .5, height * .58, width * .63);
  glow.addColorStop(0, `${scene.objectColor || canvas.objectColor || "#a78bfa"}38`); glow.addColorStop(1, "#00000000"); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.strokeStyle = "#ffffff09"; ctx.lineWidth = Math.max(1, width / 1600);
  for (let x = 0; x < width; x += width / 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += height / 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.restore();

  const paths = { spark: "M50 2 61 37 96 50 61 63 50 98 39 63 4 50 39 37Z", star: "m50 4 11 31 33 1-26 20 9 32-27-19-27 19 9-32L6 36l33-1Z", bolt: "M58 2 18 56h26l-6 42 44-58H54Z", arrow: "M14 50h66 M55 24l27 26-27 26", ring: "M50 7a43 43 0 1 0 0 86 43 43 0 0 0 0-86 M50 20a30 30 0 1 1 0 60 30 30 0 0 1 0-60" };
  for (const item of canvas.decorations ?? []) {
    const x = width / 2 + item.x * sx, y = height / 2 + item.y * sy;
    ctx.save(); ctx.translate(x, y); ctx.rotate((item.rotation ?? 0) * Math.PI / 180); ctx.globalAlpha = .82; ctx.strokeStyle = item.color; ctx.fillStyle = item.color; ctx.lineWidth = Math.max(2, width / 640); ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (item.type === "line") { ctx.setLineDash([Math.max(1, width / 960), Math.max(8, width / 96)]); ctx.lineDashOffset = -time * .035; ctx.beginPath(); ctx.moveTo(-item.size * sx / 2, 0); ctx.lineTo(item.size * sx / 2, 0); ctx.stroke(); }
    else { const iconScale = item.size / 100; ctx.scale(iconScale, iconScale); const path = new Path2D(paths[item.icon] ?? paths.spark); if (["arrow", "ring"].includes(item.icon)) ctx.stroke(path); else ctx.fill(path); }
    ctx.restore();
  }

  const label = scene.label || "M", color = scene.objectColor || canvas.objectColor || "#b9a3ff";
  const fontSize = Math.max(20, Math.min(width * .066, height * .12));
  const entrance = scene.entrance ?? { type: "none", durationMs: 700 }, half = scene.transition?.type === "cut" ? 0 : (scene.transition?.durationMs ?? 0) / 2;
  const entranceStart = scene.startMs === 0 ? 0 : scene.startMs - half, entryRaw = Math.max(0, Math.min(1, (time - entranceStart) / (entrance.durationMs || 700))), entry = 1 - (1 - entryRaw) ** 3;
  const entryScale = entrance.type === "pop" ? .78 + .22 * entry + .11 * Math.sin(entry * Math.PI) * (1 - entry) : entrance.type === "rotateIn" ? .88 + .12 * entry : entrance.type === "bounce" ? .92 + .08 * entry + .07 * Math.sin(entry * Math.PI) * (1 - entry) : 1;
  const entryY = entrance.type === "fadeUp" ? 38 * (1 - entry) : entrance.type === "bounce" ? -62 * (1 - entry) + 18 * Math.sin(entry * Math.PI) * (1 - entry) : 0;
  const entryRotation = entrance.type === "rotateIn" ? -18 * (1 - entry) : 0;
  const centerX = width / 2 + valueAt(project, "x", time) * sx, centerY = height / 2 + (valueAt(project, "y", time) + entryY) * sy;
  ctx.save(); ctx.translate(centerX, centerY);
  const rotX = valueAt(project, "rotationX", time), rotY = valueAt(project, "rotationY", time);
  ctx.scale(Math.cos(rotY * Math.PI / 180), Math.cos(rotX * Math.PI / 180));
  ctx.rotate((valueAt(project, "rotation", time) + entryRotation) * Math.PI / 180);
  const itemScale = valueAt(project, "scale", time);
  ctx.scale(itemScale * entryScale, itemScale * entryScale);
  const opacity = Math.max(0, Math.min(1, valueAt(project, "opacity", time))) * (["fadeUp", "blurIn"].includes(entrance.type) ? entry : 1);
  ctx.globalAlpha = opacity;
  ctx.filter = `contrast(${Math.max(0, valueAt(project, "contrast", time))}) brightness(${Math.max(0, valueAt(project, "brightness", time))})${entrance.type === "blurIn" ? ` blur(${(1 - entry) * 12 * sx}px)` : ""}`;
  const fontFamily = String(canvas.fontFamily ?? "Space Grotesk").replace(/[^\p{L}\p{N} _.,'-]/gu, "");
  ctx.font = `800 ${fontSize}px "${fontFamily}", system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const boxWidth = Math.max(fontSize * 3.5, ctx.measureText(label).width + fontSize * 1.35), boxHeight = fontSize * 2.35, radius = Math.min(fontSize * .48, boxHeight / 2);
  if (entrance.type === "reveal" && entryRaw < 1) { ctx.beginPath(); ctx.rect(-boxWidth / 2, -boxHeight / 2, boxWidth * entry, boxHeight); ctx.clip(); }
  const reflection = Math.max(0, Math.min(1, valueAt(project, "reflection", time)));
  const drawFace = () => {
    const gradient = ctx.createLinearGradient(-boxWidth / 2, -boxHeight / 2, boxWidth / 2, boxHeight / 2);
    gradient.addColorStop(0, "#ffffff"); gradient.addColorStop(.14, color); gradient.addColorStop(.55, color); gradient.addColorStop(1, "#17152c");
    ctx.fillStyle = gradient; ctx.shadowColor = `${color}44`; ctx.shadowBlur = fontSize * .28; ctx.shadowOffsetY = fontSize * .12;
    roundedRect(ctx, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, radius); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#ffffff"; ctx.fillText(label, 0, 1);
  };
  if (reflection > .01) {
    ctx.save(); ctx.translate(0, boxHeight + 8 * sx); ctx.scale(1, -.48); ctx.globalAlpha = opacity * reflection * .14; drawFace(); ctx.restore();
    const fade = ctx.createLinearGradient(0, boxHeight / 2 + 6, 0, boxHeight * 1.18); fade.addColorStop(0, "#00000000"); fade.addColorStop(.4, "#000000aa"); fade.addColorStop(1, "#000000ff");
    ctx.fillStyle = fade; ctx.fillRect(-boxWidth, boxHeight / 2, boxWidth * 2, boxHeight * 1.1);
  }
  drawFace();
  const sweep = valueAt(project, "shineSweep", time), intensity = Math.max(0, Math.min(1, canvas.effects?.shine ?? .68));
  if (intensity > .01) {
    ctx.save(); roundedRect(ctx, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, radius); ctx.clip();
    const shineX = (sweep * .5 + .5) * boxWidth * 2 - boxWidth;
    const shine = ctx.createLinearGradient(shineX - fontSize * .9, 0, shineX + fontSize * .9, 0);
    shine.addColorStop(0, "#ffffff00"); shine.addColorStop(.48, `#ffffff${Math.round(intensity * 0xb0).toString(16).padStart(2, "0")}`); shine.addColorStop(1, "#ffffff00");
    ctx.globalAlpha = opacity; ctx.fillStyle = shine; ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight); ctx.restore();
  }
  ctx.restore();

  if (scene.subtitle?.trim()) {
    ctx.save(); ctx.font = `700 ${Math.max(12, Math.min(width * .017, 24))}px "${fontFamily}", system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#edf3ff";
    ctx.shadowColor = "#00000055"; ctx.shadowBlur = 4; ctx.fillText(scene.subtitle, width / 2, height * .68, width * .84); ctx.restore();
  }
}

function drawTransition(ctx, image, role, type, progress, width, height, screenTurn) {
  const outgoing = role === "out"; const t = progress;
  ctx.save();
  ctx.translate(width / 2, height / 2); ctx.scale(Math.max(.025, Math.cos(screenTurn * Math.PI / 180)), 1); ctx.translate(-width / 2, -height / 2);
  if (type === "wipe") {
    const reveal = outgoing ? 1 - t : t; ctx.beginPath(); ctx.rect(0, 0, width * reveal, height); ctx.clip();
  } else if (type === "push") {
    ctx.translate((outgoing ? -t : 1 - t) * width, 0);
  } else if (type === "curtain") {
    const inset = (outgoing ? t : 1 - t) * .5; ctx.beginPath(); ctx.rect(width * inset, 0, width * (1 - inset * 2), height); ctx.clip();
  } else if (type === "iris") {
    const radius = (outgoing ? 1 - t : t) * Math.hypot(width, height) * .72; ctx.beginPath(); ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2); ctx.clip();
  } else if (["flip", "reflectionFlip", "cube", "spin"].includes(type)) {
    const angle = outgoing ? t * Math.PI / 2 : (1 - t) * Math.PI / 2;
    ctx.translate(width / 2, 0); ctx.scale(Math.max(.025, Math.cos(angle)), 1); ctx.translate(-width / 2, 0);
    if (type === "cube") ctx.translate((outgoing ? -1 : 1) * Math.sin(angle) * width * .26, 0);
    if (type === "spin") ctx.rotate((outgoing ? 1 : -1) * t * Math.PI);
    ctx.globalAlpha = type === "spin" ? (outgoing ? 1 - t * .35 : .65 + t * .35) : 1;
  } else if (type === "zoom") {
    const scale = outgoing ? 1 + t * .22 : .78 + t * .22;
    ctx.translate(width / 2, height / 2); ctx.scale(scale, scale); ctx.translate(-width / 2, -height / 2); ctx.globalAlpha = outgoing ? 1 - t : t;
  } else if (["fade", "flash"].includes(type)) ctx.globalAlpha = outgoing ? 1 - t : t;
  ctx.drawImage(image, 0, 0, width, height); ctx.restore();
}

function drawFrame(ctx, project, time, width, height, buffers) {
  const state = sceneAtTime(project, time); ctx.fillStyle = state.incoming.background; ctx.fillRect(0, 0, width, height);
  renderScene(buffers.in.getContext("2d"), project, state.incoming, time, width, height);
  const screenTurn = valueAt(project, "screenTurn", time);
  if (!state.outgoing) { drawTransition(ctx, buffers.in, "in", "cut", 1, width, height, screenTurn); return; }
  renderScene(buffers.out.getContext("2d"), project, state.outgoing, time, width, height);
  drawTransition(ctx, buffers.out, "out", state.type, state.progress, width, height, screenTurn);
  drawTransition(ctx, buffers.in, "in", state.type, state.progress, width, height, screenTurn);
  if (state.type === "flash") { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.abs(state.progress - .5) * 2) * .72; ctx.fillStyle = state.incoming.objectColor; ctx.fillRect(0, 0, width, height); ctx.restore(); }
}

export async function exportMotionVideo(project, onProgress = () => {}) {
  if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) throw new Error("This browser cannot record WebM. Open the editor in a recent Chrome or Edge version.");
  const maxSide = 1920, ratio = Math.min(1, maxSide / Math.max(project.canvas.width, project.canvas.height));
  const width = Math.max(2, Math.round(project.canvas.width * ratio / 2) * 2), height = Math.max(2, Math.round(project.canvas.height * ratio / 2) * 2);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) throw new Error("Could not create the render canvas.");
  const buffers = { in: document.createElement("canvas"), out: document.createElement("canvas") };
  for (const buffer of Object.values(buffers)) { buffer.width = width; buffer.height = height; }
  const fps = Math.max(1, Math.min(60, project.fps)), stream = canvas.captureStream(fps);
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { stream.getTracks().forEach((track) => track.stop()); throw new Error("This browser does not provide a compatible WebM codec."); }
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: Math.min(16_000_000, width * height * fps * .12) }), chunks = [];
  const result = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => reject(new Error("The browser stopped the recording."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });
  drawFrame(ctx, project, 0, width, height, buffers); recorder.start(250);
  const started = performance.now();
  await new Promise((resolve) => {
    function frame(now) {
      const elapsed = Math.min(project.durationMs, now - started);
      drawFrame(ctx, project, elapsed, width, height, buffers); onProgress(elapsed / project.durationMs);
      if (elapsed >= project.durationMs) { recorder.stop(); resolve(); } else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  const blob = await result; stream.getTracks().forEach((track) => track.stop());
  return { blob, width, height, mimeType };
}
