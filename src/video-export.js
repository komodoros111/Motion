const defaults = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

function easingValue(t, easing) {
  if (easing === "easeIn") return t * t;
  if (easing === "easeOut") return 1 - (1 - t) ** 2;
  if (easing === "easeInOut") return t < .5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  return t;
}

function valueAt(project, property, time) {
  const frames = [...(project.tracks.find((track) => track.property === property)?.keyframes ?? [])].sort((a, b) => a.timeMs - b.timeMs);
  if (!frames.length) return defaults[property];
  if (time <= frames[0].timeMs) return frames[0].value;
  if (time >= frames.at(-1).timeMs) return frames.at(-1).value;
  const i = frames.findIndex((frame) => frame.timeMs >= time);
  const left = frames[i - 1], right = frames[i];
  const t = (time - left.timeMs) / Math.max(1, right.timeMs - left.timeMs);
  return left.value + (right.value - left.value) * easingValue(t, left.easing);
}

function drawFrame(ctx, project, time, width, height) {
  const { canvas } = project;
  const sx = width / canvas.width, sy = height / canvas.height, scale = Math.min(sx, sy);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = canvas.background || "#090b13"; ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, height * .62, 0, width / 2, height * .62, width * .52);
  glow.addColorStop(0, `${canvas.objectColor || "#a78bfa"}30`); glow.addColorStop(1, "#090b1300"); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);

  const label = canvas.label || "M", centerX = width / 2 + valueAt(project, "x", time) * sx, centerY = height / 2 + valueAt(project, "y", time) * sy;
  const fontSize = Math.max(18, Math.min(width * .065, height * .11));
  ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(valueAt(project, "rotation", time) * Math.PI / 180);
  ctx.scale(valueAt(project, "scale", time), valueAt(project, "scale", time)); ctx.globalAlpha = Math.max(0, Math.min(1, valueAt(project, "opacity", time)));
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const boxW = Math.max(fontSize * 3, ctx.measureText(label).width + fontSize * 1.3), boxH = fontSize * 2.45, radius = Math.min(fontSize * .52, boxH / 2);
  ctx.shadowColor = `${canvas.objectColor || "#b9a3ff"}99`; ctx.shadowBlur = fontSize * .85; ctx.shadowOffsetY = fontSize * .28;
  const gradient = ctx.createLinearGradient(centerX - boxW / 2, centerY - boxH / 2, centerX + boxW / 2, centerY + boxH / 2);
  gradient.addColorStop(0, "#ffffff"); gradient.addColorStop(.14, canvas.objectColor || "#b9a3ff"); gradient.addColorStop(1, "#31245f");
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, radius); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.fillStyle = "#fff"; ctx.fillText(label, 0, 1);
  ctx.restore();

  const subtitle = canvas.subtitle?.trim();
  if (subtitle) {
    ctx.save(); ctx.font = `600 ${Math.max(11, Math.min(width * .016, 22))}px system-ui, sans-serif`;
    const maxWidth = width * .8, words = subtitle.split(/\s+/), lines = []; let line = "";
    for (const word of words) { const test = line ? `${line} ${word}` : word; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test; }
    if (line) lines.push(line); const lineHeight = fontSize * .42, y = height * .68;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#e7eaff";
    lines.slice(0, 3).forEach((text, index) => ctx.fillText(text, width / 2, y + index * lineHeight, maxWidth)); ctx.restore();
  }
  ctx.save(); ctx.fillStyle = "#aab1c0"; ctx.font = `${Math.max(10, width * .01)}px ui-monospace, monospace`; ctx.textBaseline = "bottom";
  ctx.fillText(project.name || "Motion", width * .025, height * .035); ctx.restore();
}

export async function exportMotionVideo(project, onProgress = () => {}) {
  if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) throw new Error("Este navegador não oferece gravação de vídeo WebM. Abra o editor no Chrome ou Edge atualizado.");
  const maxSide = 1920, ratio = Math.min(1, maxSide / Math.max(project.canvas.width, project.canvas.height));
  const width = Math.max(2, Math.round(project.canvas.width * ratio / 2) * 2), height = Math.max(2, Math.round(project.canvas.height * ratio / 2) * 2);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) throw new Error("Não foi possível criar o canvas de renderização.");
  const fps = Math.max(1, Math.min(60, project.fps));
  const stream = canvas.captureStream(fps);
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { stream.getTracks().forEach((track) => track.stop()); throw new Error("Este navegador não oferece um codec WebM compatível."); }
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: Math.min(16_000_000, width * height * fps * .12) });
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => reject(new Error("O navegador interrompeu a gravação."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });
  drawFrame(ctx, project, 0, width, height); recorder.start(250);
  const started = performance.now();
  await new Promise((resolve) => {
    function frame(now) {
      const elapsed = Math.min(project.durationMs, now - started);
      drawFrame(ctx, project, elapsed, width, height); onProgress(elapsed / project.durationMs);
      if (elapsed >= project.durationMs) { recorder.stop(); resolve(); } else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  const blob = await result; stream.getTracks().forEach((track) => track.stop());
  return { blob, width, height, mimeType };
}
