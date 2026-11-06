import { createSampleMotion, validateMotionDocument, encodeMotionBinary, decodeMotionBinary, repairMotionChecksum, MAX_BINARY_BYTES } from "./motion-format.js";
import { exportMotionVideo } from "./video-export.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE_KEY = "motion-studio-ai-project-v1";
const BACKUP_KEY = "motion-studio-ai-project-backup-v1";
const colors = { x: "#a78bfa", y: "#56d7de", rotation: "#ff9b70", rotationX: "#ff7cc7", rotationY: "#a88cff", screenTurn: "#c7a4ff", scale: "#57d7a2", opacity: "#f4c96b", contrast: "#ffb86a", brightness: "#fff19a", shineSweep: "#70e8ff", reflection: "#91a8ff" };
const defaults = { x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, screenTurn: 0, scale: 1, opacity: 1, contrast: 1, brightness: 1, shineSweep: -1, reflection: 0.36 };
const iconPaths = {
  spark: "M50 2 61 37 96 50 61 63 50 98 39 63 4 50 39 37Z M80 4v20 M70 14h20 M18 75v17 M9.5 83.5h17",
  star: "m50 4 11 31 33 1-26 20 9 32-27-19-27 19 9-32L6 36l33-1Z",
  bolt: "M58 2 18 56h26l-6 42 44-58H54Z",
  arrow: "M14 50h66 M55 24l27 26-27 26",
  ring: "M50 7a43 43 0 1 0 0 86 43 43 0 0 0 0-86 M50 20a30 30 0 1 1 0 60 30 30 0 0 1 0-60"
};
let project = createSampleMotion();
let selectedSceneId = project.scenes?.[0]?.id ?? null;
let selectedDecorationId = null;
let activePanel = "timeline";
let selectedTrackId = project.tracks[0]?.id ?? null;
let selectedKey = null;
let currentTime = 0;
let zoom = 1;
let playing = false;
let playOrigin = 0;
let playOffset = 0;
let hexBytes = null;
let hexOriginal = null;
let hexName = "";
let hexOffset = 0;
let selectedByte = -1;
let hexDirty = false;
let toastTimer = 0;
let dragKey = null;
let saveTimer = 0;

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2800);
}

function markDirty() {
  $("#save-state").textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); $("#save-state").textContent = "Saved locally"; }
    catch { $("#save-state").textContent = "Could not save"; }
  }, 260);
}

function selectedTrack() { return project.tracks.find((track) => track.id === selectedTrackId) ?? project.tracks[0] ?? null; }
function selectedKeyframe() { return selectedKey ? project.tracks.find((track) => track.id === selectedKey.trackId)?.keyframes.find((frame) => frame.id === selectedKey.frameId) ?? null : null; }
function formatTime(ms) { const value = Math.max(0, ms); const seconds = Math.floor(value / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.${String(Math.floor(value % 1000)).padStart(3, "0")}`; }
function trackLabel(track) { return track.label || ({ x: "Position X", y: "Position Y", rotation: "Z Rotation", rotationX: "X Rotation", rotationY: "Y Rotation", screenTurn: "Screen Turn", scale: "Scale", opacity: "Opacity", contrast: "Contrast", brightness: "Brightness", shineSweep: "Shine Sweep", reflection: "Reflection" }[track.property] ?? track.property); }
function easingValue(t, easing) { if (easing === "easeIn") return t * t; if (easing === "easeOut") return 1 - (1 - t) ** 2; if (easing === "easeInOut") return t < .5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2; return t; }

function valueAt(property, time) {
  const track = project.tracks.find((item) => item.property === property);
  if (!track?.keyframes.length) return project.canvas.effects?.[property] ?? defaults[property];
  const frames = [...track.keyframes].sort((a, b) => a.timeMs - b.timeMs);
  if (time <= frames[0].timeMs) return frames[0].value;
  if (time >= frames.at(-1).timeMs) return frames.at(-1).value;
  const rightIndex = frames.findIndex((frame) => frame.timeMs >= time);
  const left = frames[rightIndex - 1];
  const right = frames[rightIndex];
  const ratio = (time - left.timeMs) / Math.max(1, right.timeMs - left.timeMs);
  return left.value + (right.value - left.value) * easingValue(ratio, right.easing);
}

function updateStage() {
  const x = valueAt("x", currentTime);
  const y = valueAt("y", currentTime);
  const rotation = valueAt("rotation", currentTime);
  const rotationX = valueAt("rotationX", currentTime);
  const rotationY = valueAt("rotationY", currentTime);
  const screenTurn = valueAt("screenTurn", currentTime);
  const scale = valueAt("scale", currentTime);
  const opacity = valueAt("opacity", currentTime);
  const contrast = valueAt("contrast", currentTime);
  const brightness = valueAt("brightness", currentTime);
  const shineSweep = valueAt("shineSweep", currentTime);
  const reflection = valueAt("reflection", currentTime);
  const stage = $("#stage");
  const scaleX = stage.clientWidth / project.canvas.width;
  const scaleY = stage.clientHeight / project.canvas.height;
  const state = sceneAtTime(currentTime);
  setSceneVisual($("#scene-in"), state.incoming, x, y, rotation, rotationX, rotationY, screenTurn, scale, opacity, contrast, brightness, shineSweep, reflection, false, state, scaleX, scaleY, currentTime);
  setSceneVisual($("#scene-out"), state.outgoing, x, y, rotation, rotationX, rotationY, screenTurn, scale, opacity, contrast, brightness, shineSweep, reflection, true, state, scaleX, scaleY, currentTime);
  $("#transition-flash").style.opacity = state.type === "flash" ? String(Math.max(0, 1 - Math.abs(state.progress - .5) * 2)) : "0";
  $("#transition-flash").style.background = state.incoming?.background ?? project.canvas.background;
  $("#time-current").textContent = formatTime(currentTime);
  $("#time-total").textContent = formatTime(project.durationMs);
  const position = Math.min(100, currentTime / project.durationMs * 100);
  $$(".playhead").forEach((line) => { line.style.left = `${position}%`; });
  $$(".timeline-scale").forEach((scaleEl) => { scaleEl.setAttribute("aria-valuenow", String(Math.round(currentTime))); });
}

function sceneAtTime(time) {
  const scenes = project.scenes?.length ? project.scenes : [{ id: "base", startMs: 0, label: project.canvas.label ?? "M", subtitle: project.canvas.subtitle ?? "", background: project.canvas.background ?? "#090b13", objectColor: project.canvas.objectColor ?? "#b9a3ff", transition: { type: "cut", durationMs: 0 } }];
  let index = scenes.findLastIndex((scene) => scene.startMs <= time);
  if (index < 0) index = 0;
  const next = scenes[index + 1], nextHalf = next?.transition?.type === "cut" ? 0 : (next?.transition?.durationMs ?? 0) / 2;
  if (next && nextHalf > 0 && time >= next.startMs - nextHalf) index += 1;
  const incoming = scenes[index], outgoing = scenes[index - 1], transition = incoming.transition ?? { type: "cut", durationMs: 0 };
  const half = transition.type === "cut" ? 0 : transition.durationMs / 2;
  if (outgoing && half > 0 && time >= incoming.startMs - half && time <= incoming.startMs + half) return { incoming, outgoing, type: transition.type, progress: Math.max(0, Math.min(1, (time - incoming.startMs + half) / (2 * half))) };
  return { incoming, outgoing: null, type: "cut", progress: 1 };
}

function renderDecorations(svg, time = currentTime) {
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg", { width, height } = project.canvas;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const signature = JSON.stringify([width, height, project.canvas.decorations ?? []]);
  if (svg.dataset.signature !== signature) { svg.replaceChildren(); svg.dataset.signature = signature;
  for (const item of project.canvas.decorations ?? []) {
    const group = document.createElementNS(NS, "g");
    group.setAttribute("transform", `translate(${width / 2 + item.x} ${height / 2 + item.y}) rotate(${item.rotation ?? 0})`); group.setAttribute("opacity", "0.82");
    if (item.type === "line") {
      const path = document.createElementNS(NS, "path"), half = item.size / 2;
      path.setAttribute("d", item.direction === "diagonal" ? `M ${-half} ${half * .45} L ${half} ${-half * .45}` : `M ${-half} 0 H ${half}`);
      path.classList.add("dotted-line"); path.setAttribute("fill", "none"); path.setAttribute("stroke", item.color); path.setAttribute("stroke-width", String(Math.max(2, width / 640))); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-dasharray", `${Math.max(1, width / 960)} ${Math.max(8, width / 96)}`); group.append(path);
    } else {
      const path = document.createElementNS(NS, "path"), scale = item.size / 100;
      group.setAttribute("transform", `${group.getAttribute("transform")} scale(${scale})`);
      path.setAttribute("d", iconPaths[item.icon] ?? iconPaths.spark); path.setAttribute("fill", ["arrow", "ring"].includes(item.icon) ? "none" : item.color); path.setAttribute("stroke", item.color); path.setAttribute("stroke-width", "6"); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round"); group.append(path);
    }
    svg.append(group);
  }
  }
  svg.querySelectorAll(".dotted-line").forEach((path) => path.setAttribute("stroke-dashoffset", String(-time * .035)));
}

function setSceneVisual(element, scene, x, y, rotation, rotationX, rotationY, screenTurn, scale, opacity, contrast, brightness, shineSweep, reflection, isOutgoing, state, scaleX, scaleY, time) {
  if (!scene) { element.hidden = true; return; }
  element.hidden = false;
  const card = element.querySelector(".motion-object");
  element.querySelector(".motion-object > span").textContent = scene.label;
  card.dataset.reflection = scene.label;
  const subtitle = element.querySelector(".stage-subtitle");
  subtitle.textContent = scene.subtitle; subtitle.hidden = !scene.subtitle;
  card.style.setProperty("--object-color", scene.objectColor);
  element.style.setProperty("--scene-background", scene.background);
  const progress = state.progress, type = state.type;
  let layerTransform = "none", layerOpacity = 1;
  let transform = `translate(${x * scaleX}px,${y * scaleY}px) perspective(${project.canvas.effects?.perspective ?? 900}px) rotateX(${rotationX}deg) rotateY(${rotationY + screenTurn}deg) rotateZ(${rotation}deg) scale(${scale})`;
  element.style.clipPath = "inset(0 0 0 0)";
  if (type !== "cut") {
    if (["flip", "reflectionFlip", "cube"].includes(type)) {
      const t = isOutgoing ? progress : 1 - progress;
      layerTransform = `perspective(${project.canvas.effects?.perspective ?? 900}px) rotateY(${(isOutgoing ? 1 : -1) * t * (type === "cube" ? 96 : 88)}deg) ${type === "cube" ? `translateZ(${$("#stage").clientWidth / 2}px)` : ""}`;
    } else if (type === "spin") { layerTransform = `perspective(${project.canvas.effects?.perspective ?? 900}px) rotateY(${(isOutgoing ? progress : 1 - progress) * 180}deg)`; layerOpacity = isOutgoing ? 1 - progress * .35 : .65 + progress * .35; }
    else if (type === "zoom") { layerTransform = `scale(${isOutgoing ? 1 + progress * .22 : .78 + progress * .22})`; layerOpacity = isOutgoing ? 1 - progress : progress; }
    else if (type === "push") layerTransform = `translateX(${isOutgoing ? -progress * 100 : (1 - progress) * 100}%)`;
    else if (type === "curtain") { const inset = (isOutgoing ? progress : 1 - progress) * 50; element.style.clipPath = `inset(0 ${inset}% 0 ${inset}%)`; }
    else if (type === "iris") element.style.clipPath = `circle(${(isOutgoing ? 1 - progress : progress) * 72}% at 50% 50%)`;
    else if (["fade", "flash"].includes(type)) layerOpacity = isOutgoing ? 1 - progress : progress;
    else if (type === "wipe") element.style.clipPath = `inset(0 ${isOutgoing ? progress * 100 : (1 - progress) * 100}% 0 0)`;
  }
  element.style.transform = layerTransform; element.style.opacity = String(layerOpacity);
  element.style.zIndex = isOutgoing ? "1" : "2";
  const content = element.querySelector(".scene-content");
  content.style.transform = transform; content.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  content.style.filter = `contrast(${Math.max(0, contrast)}) brightness(${Math.max(0, brightness)})`;
  content.style.setProperty("--shine-position", `${Math.max(-1, Math.min(1, shineSweep)) * 50 + 50}%`);
  content.style.setProperty("--shine-opacity", String(project.canvas.effects?.shine ?? .68));
  const reflectionAmount = type === "reflectionFlip" ? Math.max(.7, reflection) : Math.max(0, Math.min(1, reflection));
  content.style.setProperty("--reflection-opacity", String(reflectionAmount * .16));
  content.style.setProperty("--motion-font", `"${project.canvas.fontFamily ?? "Space Grotesk"}", sans-serif`);
  renderDecorations(element.querySelector(".scene-decorations"), time);
  const entrance = scene.entrance ?? { type: "none", durationMs: 700 };
  const half = scene.transition?.type === "cut" ? 0 : (scene.transition?.durationMs ?? 0) / 2;
  const entryStart = scene.startMs === 0 ? 0 : scene.startMs - half;
  const raw = Math.max(0, Math.min(1, (time - entryStart) / (entrance.durationMs || 700))), p = 1 - (1 - raw) ** 3;
  if (!isOutgoing && entrance.type !== "none" && raw < 1) {
    const entryScale = entrance.type === "pop" ? .78 + .22 * p + .11 * Math.sin(p * Math.PI) * (1 - p) : entrance.type === "rotateIn" ? .88 + .12 * p : entrance.type === "bounce" ? .92 + .08 * p + .07 * Math.sin(p * Math.PI) * (1 - p) : 1;
    const entryY = entrance.type === "fadeUp" ? 38 * (1 - p) : entrance.type === "bounce" ? -62 * (1 - p) + 18 * Math.sin(p * Math.PI) * (1 - p) : 0;
    const entryRotation = entrance.type === "rotateIn" ? -18 * (1 - p) : 0;
    card.style.transform = `translateY(${entryY}px) rotate(${entryRotation}deg) scale(${entryScale})`;
    card.style.opacity = String(["fadeUp", "blurIn"].includes(entrance.type) ? p : 1);
    card.style.filter = entrance.type === "blurIn" ? `blur(${(1 - p) * 12}px)` : "none";
    card.style.clipPath = entrance.type === "reveal" ? `inset(0 ${(1 - p) * 100}% 0 0)` : "none";
    subtitle.style.opacity = String(["fadeUp", "blurIn"].includes(entrance.type) ? p : 1);
  } else { card.style.transform = "none"; card.style.opacity = "1"; card.style.filter = "none"; card.style.clipPath = "none"; subtitle.style.opacity = "1"; }
}

function normalizeSceneTransitions() {
  const scenes = [...(project.scenes ?? [])].sort((a, b) => a.startMs - b.startMs);
  let previousHalf = 0, adjusted = false;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]; scene.transition ??= { type: "cut", durationMs: 0 };
    if (scene.transition.type === "cut") { previousHalf = 0; continue; }
    const gap = i ? scene.startMs - scenes[i - 1].startMs : Infinity;
    const max = Math.max(0, Math.min(4000, 2 * Math.max(0, project.durationMs - scene.startMs), i ? 2 * Math.max(0, gap - previousHalf) : 4000));
    if (max < 100) { scene.transition = { type: "cut", durationMs: 0 }; previousHalf = 0; adjusted = true; }
    else { const next = Math.min(scene.transition.durationMs || 620, max); adjusted ||= next !== scene.transition.durationMs; scene.transition.durationMs = next; previousHalf = next / 2; }
  }
  return adjusted;
}

function renderTimeline() {
  const selectedScene = project.scenes?.find((scene) => scene.id === selectedSceneId) ?? null;
  $("#project-name").textContent = project.name;
  $("#heading-name").textContent = project.name;
  $("#stage-caption-name").textContent = project.name;
  $("#field-name").value = project.name;
  $("#field-label").value = selectedScene?.label ?? project.canvas.label ?? "M";
  $("#field-subtitle").value = selectedScene?.subtitle ?? project.canvas.subtitle ?? "";
  $("#field-narration").value = project.narration?.text ?? "";
  $("#field-narration-rate").value = project.narration?.rate ?? 1;
  $("#narration-rate-label").textContent = `${Number(project.narration?.rate ?? 1).toFixed(1)}×`;
  $("#field-voice").value = project.narration?.voiceURI ?? "";
  $("#field-background").value = selectedScene?.background ?? project.canvas.background ?? "#090b13";
  $("#field-object-color").value = selectedScene?.objectColor ?? project.canvas.objectColor ?? "#b9a3ff";
  project.canvas.effects = { reflection: .36, contrast: 1, brightness: 1, shine: .68, perspective: 900, ...(project.canvas.effects ?? {}) };
  for (const key of ["reflection", "contrast", "brightness", "shine", "perspective"]) $("#field-" + key).value = project.canvas.effects[key] ?? ({ reflection: .36, contrast: 1, brightness: 1, shine: .68, perspective: 900 })[key];
  $("#reflection-label").textContent = `${Math.round(project.canvas.effects.reflection * 100)}%`;
  $("#contrast-label").textContent = `${project.canvas.effects.contrast.toFixed(2)}×`;
  $("#brightness-label").textContent = `${project.canvas.effects.brightness.toFixed(2)}×`;
  $("#shine-label").textContent = `${Math.round(project.canvas.effects.shine * 100)}%`;
  $("#perspective-label").textContent = `${project.canvas.effects.perspective} px`;
  $("#field-duration").value = project.durationMs;
  $("#field-fps").value = project.fps;
  $("#field-width").value = project.canvas.width;
  $("#field-height").value = project.canvas.height;
  $("#field-font").value = project.canvas.fontFamily ?? "Space Grotesk";
  $("#stage-size").textContent = `${project.canvas.width} × ${project.canvas.height} · ${project.fps} FPS`;
  $("#stage").style.setProperty("--stage-bg", project.canvas.background ?? "#090b13");
  $("#stage").style.setProperty("--canvas-ratio", `${project.canvas.width} / ${project.canvas.height}`);
  $("#restore-previous").hidden = !localStorage.getItem(BACKUP_KEY);
  $("#track-count").textContent = `${project.tracks.length} tracks`;
  $("#zoom-label").textContent = `${Math.round(zoom * 100)}%`;
  renderSceneControls(selectedScene);
  renderDecorationControls();

  const laneWidth = Math.max(380, Math.round(project.durationMs / 1000 * 175 * zoom));
  const template = `118px ${laneWidth}px`;
  $("#timeline-content").style.minWidth = `${118 + laneWidth}px`;
  $("#timeline-ruler").style.gridTemplateColumns = template;
  const ruler = $("#ruler-scale");
  ruler.innerHTML = "";
  const head = document.createElement("div"); head.className = "playhead"; ruler.append(head);
  for (let i = 0; i <= 4; i++) {
    const tick = document.createElement("div"); tick.className = "ruler-tick"; tick.style.left = `${i * 25}%`;
    const label = document.createElement("span"); label.textContent = `${(project.durationMs * i / 4 / 1000).toFixed(i === 0 ? 0 : 1)}s`; tick.append(label); ruler.append(tick);
  }
  for (const scene of project.scenes ?? []) {
    const marker = document.createElement("button"); marker.type = "button"; marker.className = "scene-marker"; marker.dataset.sceneId = scene.id; marker.style.left = `${scene.startMs / project.durationMs * 100}%`; marker.title = `${scene.label} · ${formatTime(scene.startMs)}`; marker.setAttribute("aria-label", `Select scene ${scene.label} at ${formatTime(scene.startMs)}`); ruler.append(marker);
  }
  const lanes = $("#track-lanes"); lanes.innerHTML = "";
  for (const track of project.tracks) {
    const lane = document.createElement("div"); lane.className = `track-lane${track.id === selectedTrackId ? " is-selected" : ""}`; lane.dataset.trackId = track.id;
    const label = document.createElement("button"); label.className = "track-label"; label.type = "button"; label.dataset.selectTrack = track.id;
    label.innerHTML = `<span class="track-dot" style="--track-color:${colors[track.property] ?? "#a78bfa"}"></span><span>${escapeHtml(trackLabel(track))}</span>`;
    const scale = document.createElement("div"); scale.className = "lane-scale timeline-scale"; scale.dataset.trackId = track.id; scale.style.gridColumn = "2"; scale.style.gridRow = "1";
    scale.setAttribute("role", "slider"); scale.setAttribute("aria-label", `${trackLabel(track)} timeline`); scale.setAttribute("aria-valuemin", "0"); scale.setAttribute("aria-valuemax", String(project.durationMs));
    const laneHead = document.createElement("div"); laneHead.className = "playhead"; scale.append(laneHead);
    for (const frame of track.keyframes) {
      const point = document.createElement("button"); point.type = "button"; point.className = `keyframe${selectedKey?.trackId === track.id && selectedKey.frameId === frame.id ? " is-selected" : ""}`; point.style.left = `${frame.timeMs / project.durationMs * 100}%`; point.dataset.trackId = track.id; point.dataset.frameId = frame.id; point.title = `${Math.round(frame.timeMs)} ms · ${frame.value}`; point.setAttribute("aria-label", `${trackLabel(track)}, ${Math.round(frame.timeMs)} milliseconds, value ${frame.value}`); scale.append(point);
    }
    lane.append(label, scale); lane.addEventListener("click", (event) => { if (!event.target.closest(".keyframe")) { selectedTrackId = track.id; if (event.target.closest(".lane-scale")) setTimeFromScale(event, event.target.closest(".lane-scale")); renderTimeline(); renderInspector(); } });
    lanes.append(lane);
  }
  updateStage();
  renderInspector();
}

function renderSceneControls(scene) {
  const scenes = project.scenes ?? [];
  $("#scene-count").textContent = `${scenes.length || 1} ${scenes.length === 1 ? "SCENE" : "SCENES"}`;
  $("#field-scene").innerHTML = scenes.map((item, index) => `<option value="${escapeAttribute(item.id)}">${String(index + 1).padStart(2, "0")} · ${escapeHtml(item.label)} · ${formatTime(item.startMs)}</option>`).join("");
  $("#field-scene").value = scene?.id ?? "";
  $("#field-transition").value = scene?.transition?.type ?? "cut";
  $("#field-transition-duration").value = scene?.transition?.durationMs ?? 620;
  $("#transition-duration-label").textContent = `${scene?.transition?.durationMs ?? 620} ms`;
  $("#field-entrance").value = scene?.entrance?.type ?? "none";
  $("#field-entrance-duration").value = scene?.entrance?.durationMs ?? 700;
  $("#entrance-duration-label").textContent = `${scene?.entrance?.durationMs ?? 700} ms`;
  $("[data-action='remove-scene']").disabled = scenes.length < 2;
}

function renderDecorationControls() {
  const decorations = project.canvas.decorations ?? [], selected = decorations.find((item) => item.id === selectedDecorationId) ?? decorations.at(-1) ?? null;
  selectedDecorationId = selected?.id ?? null;
  $("#decor-count").textContent = `${decorations.length} ${decorations.length === 1 ? "ITEM" : "ITEMS"}`;
  const select = $("#field-decor"); select.replaceChildren();
  for (const item of decorations) { const option = document.createElement("option"); option.value = item.id; option.textContent = item.type === "line" ? "Dotted line" : `SVG · ${item.icon}`; select.append(option); }
  select.value = selected?.id ?? "";
  for (const [field, key] of [["x", "x"], ["y", "y"], ["size", "size"], ["color", "color"]]) $("#field-decor-" + field).value = selected?.[key] ?? (key === "color" ? "#ffffff" : key === "size" ? 96 : 0);
  $("#field-decor-rotation").value = selected?.rotation ?? 0;
  $("#remove-decoration").disabled = !selected;
  $("#field-decor-icon").value = selected?.icon ?? "spark";
}

function addDecoration(type) {
  project.canvas.decorations ??= [];
  if (project.canvas.decorations.length >= 40) { toast("A project can contain up to 40 SVG accents."); return; }
  const isLine = type === "line", item = { id: `accent-${crypto.randomUUID()}`, type, x: 0, y: isLine ? -180 : -155, size: isLine ? Math.min(project.canvas.width * .48, 800) : 96, color: isLine ? "#8bdcff" : "#ffffff", rotation: isLine ? -8 : 0 };
  if (isLine) item.direction = "horizontal"; else item.icon = $("#field-decor-icon").value;
  project.canvas.decorations.push(item); selectedDecorationId = item.id; markDirty(); renderTimeline(); toast(isLine ? "Animated dotted line added." : "Scalable SVG accent added.");
}

function updateSelectedDecoration(field, value) {
  const item = project.canvas.decorations?.find((entry) => entry.id === selectedDecorationId); if (!item) return;
  if (field === "color") item.color = /^#[\da-f]{6}$/i.test(value) ? value : "#ffffff";
  else item[field] = Math.max(field === "size" ? 8 : field === "rotation" ? -360 : -8192, Math.min(field === "size" ? 1200 : field === "rotation" ? 360 : 8192, Number(value) || 0));
  markDirty(); updateStage();
}

function addScene() {
  project.scenes ??= [{ id: `scene-${crypto.randomUUID()}`, startMs: 0, label: project.canvas.label ?? "SCENE 01", subtitle: project.canvas.subtitle ?? "", background: project.canvas.background ?? "#090b13", objectColor: project.canvas.objectColor ?? "#b9a3ff", transition: { type: "cut", durationMs: 620 } }];
  if (project.scenes.length >= 32) { toast("A project can contain up to 32 scenes."); return; }
  const sorted = [...project.scenes].sort((a, b) => a.startMs - b.startMs);
  let startMs = currentTime;
  if (sorted.some((scene) => Math.abs(scene.startMs - startMs) < 100)) startMs = sorted.at(-1).startMs + 1500;
  const duration = 620, previous = sorted.filter((scene) => scene.startMs < startMs).at(-1), next = sorted.find((scene) => scene.startMs > startMs);
  const half = (scene) => scene?.transition?.type === "cut" ? 0 : (scene?.transition?.durationMs ?? 0) / 2;
  const minStart = Math.max(1, previous ? previous.startMs + half(previous) + duration / 2 + 1 : 1);
  const maxStart = Math.min(project.durationMs - duration / 2 - 1, next ? next.startMs - half(next) - duration / 2 - 1 : project.durationMs - duration / 2 - 1);
  if (minStart > maxStart) { toast("There is not enough timeline space for another scene here."); return; }
  startMs = Math.round(Math.max(minStart, Math.min(maxStart, startMs)));
  const source = project.scenes.find((scene) => scene.id === selectedSceneId) ?? project.scenes.at(-1);
  const scene = { ...structuredClone(source), id: `scene-${crypto.randomUUID()}`, startMs, label: `SCENE ${String(project.scenes.length + 1).padStart(2, "0")}`, transition: { type: "flip", durationMs: duration } };
  project.scenes.push(scene); project.scenes.sort((a, b) => a.startMs - b.startMs); selectedSceneId = scene.id; currentTime = startMs;
  markDirty(); renderTimeline(); toast("Scene added at the playhead.");
}

function removeScene() {
  if (!project.scenes || project.scenes.length < 2) { toast("Keep at least one scene in the project."); return; }
  project.scenes = project.scenes.filter((scene) => scene.id !== selectedSceneId);
  selectedSceneId = project.scenes[0].id; markDirty(); renderTimeline(); toast("Scene removed.");
}

function selectedScene() { return project.scenes?.find((scene) => scene.id === selectedSceneId) ?? null; }
function updateSelectedScene(field, value) {
  const scene = selectedScene(); if (!scene) return false;
  scene[field] = value; markDirty(); updateStage();
  if (field === "label" || field === "startMs") renderTimeline();
  return true;
}

function renderInspector() {
  const frame = selectedKeyframe();
  $("#empty-selection").hidden = Boolean(frame);
  $("#keyframe-fields").hidden = !frame;
  $("#keyframe-state").textContent = frame ? "Selected" : "None";
  $("#keyframe-state").style.color = frame ? "#66dce1" : "";
  const select = $("#field-track");
  select.innerHTML = project.tracks.map((track) => `<option value="${escapeAttribute(track.id)}">${escapeHtml(trackLabel(track))}</option>`).join("");
  if (frame) {
    const track = project.tracks.find((item) => item.id === selectedKey.trackId);
    select.value = track.id;
    $("#field-key-time").value = frame.timeMs;
    $("#field-key-value").value = frame.value;
    $("#field-easing").value = frame.easing;
  }
}

function renderAll() { renderTimeline(); renderInspector(); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }

function setCurrentTime(time) { currentTime = Math.max(0, Math.min(project.durationMs, Math.round(time))); updateStage(); }
function setTimeFromScale(event, scale) { const rect = scale.getBoundingClientRect(); setCurrentTime((event.clientX - rect.left) / rect.width * project.durationMs); }
function addKeyframe() {
  const track = selectedTrack();
  if (!track) { toast("Add a track before adding keyframes."); return; }
  const existing = track.keyframes.find((frame) => Math.abs(frame.timeMs - currentTime) < 1);
  if (existing) { selectedKey = { trackId: track.id, frameId: existing.id }; toast("A keyframe already exists at this time."); }
  else {
    const frame = { id: `kf-${crypto.randomUUID()}`, timeMs: currentTime, value: Number(valueAt(track.property, currentTime).toFixed(2)), easing: "easeInOut" };
    track.keyframes.push(frame); track.keyframes.sort((a, b) => a.timeMs - b.timeMs); selectedKey = { trackId: track.id, frameId: frame.id }; markDirty();
  }
  renderTimeline();
}
function deleteKeyframe() {
  if (!selectedKey) return;
  const track = project.tracks.find((item) => item.id === selectedKey.trackId);
  if (track) track.keyframes = track.keyframes.filter((frame) => frame.id !== selectedKey.frameId);
  selectedKey = null; markDirty(); renderTimeline(); toast("Keyframe deleted.");
}
function addTrack() {
  const options = ["x", "y", "rotation", "rotationX", "rotationY", "screenTurn", "scale", "opacity", "contrast", "brightness", "shineSweep", "reflection"].filter((property) => !project.tracks.some((track) => track.property === property));
  if (!options.length) { toast("Every supported property already has a track."); return; }
  const property = prompt(`Choose a property to animate:\n${options.join(", ")}`, options[0]);
  if (!property || !options.includes(property)) return;
  const id = `track-${crypto.randomUUID()}`;
  const start = project.canvas.effects?.[property] ?? defaults[property];
  project.tracks.push({ id, property, label: trackLabel({ property }), keyframes: [{ id: `kf-${crypto.randomUUID()}`, timeMs: 0, value: start, easing: "linear" }] });
  selectedTrackId = id; selectedKey = null; markDirty(); renderTimeline();
}

function togglePlay() {
  playing = !playing;
  const button = $("[data-action='toggle-play']");
  button.textContent = playing ? "Ⅱ" : "▶";
  button.setAttribute("aria-label", playing ? "Pause" : "Play");
  if (playing) { playOrigin = performance.now(); playOffset = currentTime; requestAnimationFrame(tick); }
}
function tick(now) {
  if (!playing) return;
  const next = playOffset + (now - playOrigin);
  if (next >= project.durationMs) {
    setCurrentTime(project.durationMs); playing = false; $("[data-action='toggle-play']").textContent = "▶"; $("[data-action='toggle-play']").setAttribute("aria-label", "Play"); return;
  }
  setCurrentTime(next); requestAnimationFrame(tick);
}
function stopPlayback() { playing = false; $("[data-action='toggle-play']").textContent = "▶"; $("[data-action='toggle-play']").setAttribute("aria-label", "Play"); setCurrentTime(0); }

function download(name, bytes, type) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function saveJSON() {
  try { validateMotionDocument(project); download(`${safeName(project.name)}.motion.json`, JSON.stringify(project, null, 2), "application/json"); toast("Motion JSON exported."); }
  catch (error) { toast(error.message); }
}
function saveMotionBinary() {
  try { const bytes = encodeMotionBinary(project); download(`${safeName(project.name)}.nvmb`, bytes, "application/octet-stream"); toast(`Motion Binary exported · ${bytes.byteLength} bytes.`); }
  catch (error) { toast(error.message); }
}
function exportSvgIcon() {
  try {
    validateMotionDocument(project);
    const state = sceneAtTime(currentTime), scene = state.incoming;
    const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
    const label = scene.label || "MOTION", subtitle = scene.subtitle || "";
    const color = /^#[\da-f]{6}$/i.test(scene.objectColor) ? scene.objectColor : "#9878e8";
    const bg = /^#[\da-f]{6}$/i.test(scene.background) ? scene.background : "#11121a";
    const font = (project.canvas.fontFamily ?? "Space Grotesk").replace(/[^\p{L}\p{N} _.,'-]/gu, "");
    const centerX = 512 + valueAt("x", currentTime) / project.canvas.width * 880;
    const centerY = 490 + valueAt("y", currentTime) / project.canvas.height * 500;
    const fit = Math.min(1, 800 / Math.max(label.length * 54, 350));
    const transform = `translate(${centerX} ${centerY}) rotate(${valueAt("rotation", currentTime)}) scale(${valueAt("scale", currentTime) * fit})`;
    const subtitleSvg = subtitle ? `<text x="512" y="755" text-anchor="middle" fill="#e9eaf6" font-family="${esc(font)},Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3">${esc(subtitle)}</text>` : "";
    const decorSvg = (project.canvas.decorations ?? []).map((item) => {
      const x = 512 + item.x / project.canvas.width * 880, y = 490 + item.y / project.canvas.height * 500, size = item.size / project.canvas.width * 1024, accent = /^#[\da-f]{6}$/i.test(item.color) ? item.color : "#ffffff";
      if (item.type === "line") return `<path d="M${x - size / 2} ${y}H${x + size / 2}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 14" transform="rotate(${item.rotation ?? 0} ${x} ${y})"/>`;
      const d = iconPaths[item.icon] ?? iconPaths.spark;
      return `<path d="${d}" transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 100}) rotate(${item.rotation ?? 0} 50 50)" fill="${["arrow", "ring"].includes(item.icon) ? "none" : accent}" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".86"/>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc"><title id="title">${esc(label)}</title><desc id="desc">SVG icon exported from ${esc(project.name)}.</desc><defs><linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".3"/><stop offset=".25" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".65"/></linearGradient><filter id="shadow" x="-.15" y="-.2" width="1.3" height="1.5" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="${color}" flood-opacity=".2"/></filter></defs><rect width="1024" height="1024" rx="150" fill="${bg}"/><circle cx="512" cy="490" r="370" fill="${color}" opacity=".08"/>${decorSvg}<g transform="${transform}" opacity="${Math.max(0, Math.min(1, valueAt("opacity", currentTime)))}" filter="url(#shadow)"><rect x="-420" y="-170" width="840" height="340" rx="76" fill="url(#card)" stroke="#fff" stroke-opacity=".42" stroke-width="3"/><path d="M-350 -156h700" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><text x="0" y="20" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="${esc(font)},Arial,sans-serif" font-size="${Math.round(110 * fit)}" font-weight="800" letter-spacing="-4">${esc(label)}</text></g>${subtitleSvg}</svg>`;
    download(`${safeName(label)}.svg`, svg, "image/svg+xml;charset=utf-8"); toast("Scalable SVG icon exported for the current scene.");
  } catch (error) { toast(error.message); }
}
const GOOGLE_FONTS = new Set(["Space Grotesk", "DM Sans", "Barlow Condensed", "Bebas Neue", "Archivo Black", "Orbitron", "Sora", "Manrope", "Inter", "Outfit"]);
function loadFont(name) {
  const family = String(name ?? "").trim();
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.,'-]{0,79}$/u.test(family)) { toast("Enter a valid Google Fonts family name."); return; }
  if (!GOOGLE_FONTS.has(family) && !$("#field-font-custom").value.trim()) { toast("Choose a listed family or enter a custom Google Fonts name."); return; }
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400&display=swap`;
  let link = document.querySelector(`link[data-google-font="${CSS.escape(family)}"]`);
  if (!link) { link = document.createElement("link"); link.rel = "stylesheet"; link.href = href; link.dataset.googleFont = family; document.head.append(link); }
  project.canvas.fontFamily = family; $("#field-font").value = GOOGLE_FONTS.has(family) ? family : "";
  document.fonts.load(`700 32px "${family}"`).then(() => toast(`Loaded ${family} from Google Fonts.`)).catch(() => toast(`Using a system fallback for ${family}.`));
  markDirty(); updateStage();
}
function safeName(name) { return String(name || "motion").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-|-$/g, "").slice(0, 80) || "motion"; }
function setPanel(panel) {
  activePanel = panel;
  $("#motion-panel").hidden = panel !== "timeline";
  $("#hex-panel").hidden = panel !== "hex";
  $$(".rail-item[data-panel]").forEach((item) => item.classList.toggle("is-active", item.dataset.panel === panel));
}

function openProjectFile(file) {
  if (!file) return;
  if (file.size > MAX_BINARY_BYTES) { toast("Files larger than 16 MiB are not supported."); return; }
  file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let next;
    if (bytes[0] === 0x4e && bytes[1] === 0x56 && bytes[2] === 0x4d && bytes[3] === 0x42) {
      next = decodeMotionBinary(bytes);
      setHexBuffer(bytes, file.name);
      toast("Motion Binary loaded and CRC validated.");
    } else {
      next = validateMotionDocument(JSON.parse(new TextDecoder().decode(bytes)));
      toast("Motion JSON loaded.");
    }
    backupCurrentProject();
    project = next; selectedTrackId = project.tracks[0]?.id ?? null; selectedSceneId = project.scenes?.[0]?.id ?? null; selectedKey = null; currentTime = 0; markDirty(); setPanel("timeline"); renderAll();
  }).catch((error) => toast(`Could not open project: ${error.message}`));
}

function refreshSpeechVoices() {
  const select = $("#field-voice");
  if (!select || !("speechSynthesis" in window)) return;
  const previous = project.narration?.voiceURI ?? select.value;
  const voices = speechSynthesis.getVoices();
  select.innerHTML = `<option value="">Browser default voice</option>${voices.map((voice) => `<option value="${escapeAttribute(voice.voiceURI)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}${voice.localService ? " · local" : ""}</option>`).join("")}`;
  if (voices.some((voice) => voice.voiceURI === previous)) select.value = previous;
}

function speakNarration() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) { toast("Speech synthesis is not available in this browser."); return; }
  const text = project.narration?.text?.trim();
  if (!text) { toast("Enter narration text first."); $("#field-narration").focus(); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.voiceURI === project.narration.voiceURI) ?? null;
  utterance.rate = project.narration.rate ?? 1;
  utterance.onstart = () => toast("Playing narration with the browser voice.");
  utterance.onerror = (event) => { if (event.error !== "canceled") toast("Could not play the narration."); };
  speechSynthesis.speak(utterance);
}

async function exportVideo() {
  try {
    validateMotionDocument(project);
    $(".video-action b").textContent = "Rendering…";
    $(".video-action").disabled = true;
    const { blob, width, height } = await exportMotionVideo(project, (progress) => {
      $(".video-action b").textContent = `${Math.round(progress * 100)}%`;
    });
    download(`${safeName(project.name)}.webm`, blob, "video/webm");
    toast(`WebM video exported · ${width} × ${height}.`);
  } catch (error) { toast(error.message); }
  finally { $(".video-action b").textContent = "Export video"; $(".video-action").disabled = false; }
}

function setHexBuffer(bytes, name) {
  hexBytes = new Uint8Array(bytes); hexOriginal = new Uint8Array(bytes); hexName = name; hexOffset = 0; selectedByte = -1; hexDirty = false; renderHex();
}
function renderHex() {
  $("#hex-file-name").textContent = hexName || "Sem arquivo aberto";
  $("#hex-file-size").textContent = hexBytes ? `${hexBytes.byteLength.toLocaleString("en-US")} bytes · ${hexBytes.byteLength.toString(16).toUpperCase()} hex · in-memory copy` : "Open a file to inspect or edit the current Motion Binary.";
  $("#hex-dirty").hidden = !hexDirty;
  const rows = $("#hex-rows");
  rows.innerHTML = "";
  if (!hexBytes) { rows.innerHTML = `<div class="hex-empty"><span>▦</span><strong>No file loaded</strong><p>Open a local binary file or export the current motion as NVMB.</p><button class="button-secondary" data-action="save-binary">Export Motion Binary</button></div>`; return; }
  const start = Math.max(0, Math.floor(hexOffset / 16) * 16);
  const end = Math.min(hexBytes.length, start + 256);
  for (let rowOffset = start; rowOffset < end; rowOffset += 16) {
    const row = document.createElement("div"); row.className = "hex-row";
    const offset = document.createElement("span"); offset.className = "hex-offset"; offset.textContent = rowOffset.toString(16).toUpperCase().padStart(8, "0");
    const hex = document.createElement("div"); hex.className = "hex-bytes";
    let ascii = "";
    for (let index = rowOffset; index < Math.min(rowOffset + 16, end); index++) {
      const byte = hexBytes[index]; ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
      const input = document.createElement("input"); input.className = `hex-byte${selectedByte === index ? " is-selected" : ""}`; input.value = byte.toString(16).toUpperCase().padStart(2, "0"); input.maxLength = 2; input.inputMode = "text"; input.spellcheck = false; input.dataset.index = String(index); input.setAttribute("aria-label", `Byte at offset ${index.toString(16)}`); input.title = `Offset 0x${index.toString(16).toUpperCase()}`;
      input.addEventListener("focus", () => { selectedByte = index; $("#hex-selection").textContent = `Offset 0x${index.toString(16).toUpperCase().padStart(8, "0")} · ${byte.toString(16).toUpperCase().padStart(2, "0")}`; });
      input.addEventListener("input", () => { const text = input.value.trim(); if (/^[\da-f]{2}$/i.test(text)) { hexBytes[index] = parseInt(text, 16); selectedByte = index; hexDirty = !sameBytes(hexBytes, hexOriginal); renderHexKeepFocus(index); } });
      hex.append(input);
    }
    const asciiEl = document.createElement("span"); asciiEl.className = "hex-ascii"; asciiEl.textContent = ascii;
    row.append(offset, hex, asciiEl); rows.append(row);
  }
  $("#hex-jump").value = start.toString(16).toUpperCase().padStart(8, "0");
}
function renderHexKeepFocus(index) { const start = Math.floor(index / 16) * 16; renderHex(); const target = $(`#hex-rows .hex-byte[data-index="${index}"]`); if (target) { target.focus({ preventScroll: true }); target.select(); } }
function sameBytes(a, b) { if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
function saveHexCopy() { if (!hexBytes) { toast("Open a file first."); return; } download(hexName ? `edited-${hexName}` : "motion-edited.bin", hexBytes, "application/octet-stream"); toast("Binary copy exported; the original was not overwritten."); }
function parseHexSequence(value) { const clean = value.trim().replace(/^0x/i, "").replace(/[^\da-f]/gi, ""); if (!clean || clean.length % 2) throw new Error("Enter hexadecimal bytes in pairs, such as 4E 56 4D 42."); return clean.match(/.{2}/g).map((pair) => parseInt(pair, 16)); }
function searchHex() {
  if (!hexBytes) { toast("Open a file first."); return; }
  try {
    const needle = parseHexSequence($("#hex-search").value);
    const start = Math.max(0, hexOffset + 1);
    outer: for (let i = start; i <= hexBytes.length - needle.length; i++) { for (let j = 0; j < needle.length; j++) if (hexBytes[i + j] !== needle[j]) continue outer; hexOffset = i; selectedByte = i; renderHex(); $(`#hex-rows .hex-byte[data-index="${i}"]`)?.focus(); $("#hex-selection").textContent = `Encontrado em 0x${i.toString(16).toUpperCase().padStart(8, "0")}`; return; }
    toast("Sequence not found after the current offset.");
  } catch (error) { toast(error.message); }
}
function jumpHex() {
  if (!hexBytes) return;
  const raw = $("#hex-jump").value.trim().replace(/^0x/i, "");
  const offset = Number.parseInt(raw, 16);
  if (!Number.isFinite(offset) || offset < 0 || offset >= hexBytes.length) { toast("Offset is outside the file bounds."); return; }
  hexOffset = offset; selectedByte = offset; renderHex(); $(`#hex-rows .hex-byte[data-index="${offset}"]`)?.focus();
}
function crcRepair() {
  if (!hexBytes) { toast("Open an NVMB container first."); return; }
  try { repairMotionChecksum(hexBytes); hexDirty = !sameBytes(hexBytes, hexOriginal); renderHex(); toast("CRC-32 recalculated. Validate with ‘Open as Motion’ before using the project."); }
  catch (error) { toast(error.message); }
}
function importCurrentBinary() {
  if (!hexBytes) { toast("Open a file first."); return; }
  try { const next = decodeMotionBinary(hexBytes); backupCurrentProject(); project = next; selectedTrackId = project.tracks[0]?.id ?? null; selectedSceneId = project.scenes?.[0]?.id ?? null; selectedKey = null; currentTime = 0; markDirty(); setPanel("timeline"); renderAll(); toast("NVMB project validated and opened on the timeline."); }
  catch (error) { toast(error.message); }
}
function backupCurrentProject() { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(project)); } catch { toast("Could not create a local recovery copy."); } }
function restorePreviousProject() {
  try {
    const previous = localStorage.getItem(BACKUP_KEY);
    if (!previous) { toast("No previous project is saved."); return; }
    const restored = validateMotionDocument(JSON.parse(previous));
    localStorage.setItem(BACKUP_KEY, JSON.stringify(project));
    project = restored; selectedTrackId = project.tracks[0]?.id ?? null; selectedSceneId = project.scenes?.[0]?.id ?? null; selectedKey = null; currentTime = 0;
    markDirty(); renderAll(); toast("Previous project restored. Your current project is saved as a recovery copy.");
  } catch (error) { toast(`Could not restore project: ${error.message}`); }
}
async function openNextLevelPromo() {
  try {
    const response = await fetch("/examples/next-level-promo.motion.json", { cache: "no-store" });
    if (!response.ok) throw new Error("The promo example was not found.");
    const next = validateMotionDocument(await response.json());
    backupCurrentProject(); project = next; selectedTrackId = project.tracks[0]?.id ?? null; selectedSceneId = project.scenes?.[0]?.id ?? null; selectedKey = null; currentTime = 0;
    markDirty(); renderAll(); toast("Next Level motion loaded. Restore your previous project from the top bar.");
  } catch (error) { toast(`Could not open the example: ${error.message}`); }
}
async function upgradeSavedNextLevelPromo() {
  if (project.name !== "NEXT LEVEL — Afterburn" || project.canvas.decorations?.length || !project.scenes?.some((scene) => scene.id === "scene-entry")) return;
  try {
    const response = await fetch("/examples/next-level-promo.motion.json", { cache: "no-store" }); if (!response.ok) return;
    const sample = validateMotionDocument(await response.json());
    if (project.name !== "NEXT LEVEL — Afterburn" || project.canvas.decorations?.length) return;
    backupCurrentProject(); project.canvas.decorations = sample.canvas.decorations;
    for (let i = 0; i < project.scenes.length; i++) {
      const oldScene = project.scenes[i], freshScene = sample.scenes[i]; if (!freshScene) continue;
      if (!oldScene.entrance) oldScene.entrance = freshScene.entrance;
      if (i === 1 && oldScene.transition?.type === "reflectionFlip") oldScene.transition = structuredClone(freshScene.transition);
      if (i === 2 && oldScene.transition?.type === "zoom") oldScene.transition = structuredClone(freshScene.transition);
    }
    selectedSceneId = project.scenes[0]?.id ?? selectedSceneId; markDirty(); renderTimeline(); toast("Next Level updated with dotted SVG accents and new scene motion. The previous project is backed up.");
  } catch { /* Keep the saved project intact if the local example is unavailable. */ }
}
function aiBrief() {
  const request = $("#ai-request").value.trim();
  if (!request) { $("#ai-request").focus(); toast("Describe the requested change or choose a prompt example."); return; }
  const prompt = `You are Motion Editor, an AI specialized in motion design and this repository. Follow AI-INSTRUCTIONS.md and docs/FORMAT.md.\n\nUSER REQUEST\n${request}\n\nDELIVERY REQUIREMENTS\n- Edit the current document without deleting unknown fields. Preserve format, version, IDs, scenes, effects, and properties unrelated to the request.\n- Return one complete valid JSON document in a single json code block. No comments, ellipses, or base64 NVMB.\n- Validate: duration 100–120000 ms; FPS 1–240; canvas 1–8192 px; up to 64 tracks, 32 scenes, 10000 keyframes, and 40 SVG accents; label up to 24 chars; subtitle up to 80 chars; colors #RRGGBB; unique nonempty IDs; keyframe times within duration; easing linear/easeIn/easeOut/easeInOut.\n- Supported properties: x, y, rotation, rotationX, rotationY, screenTurn, scale, opacity, contrast, brightness, shineSweep, reflection. Follow AI-INSTRUCTIONS.md for bounds.\n- Scene transitions: cut, fade, push, wipe, curtain, iris, flip, cube, zoom, flash, reflectionFlip, spin. Entrances: none, fadeUp, pop, rotateIn, blurIn, reveal, bounce. SVG accents: dotted lines or spark/star/bolt/arrow/ring icons. Use restrained timing and avoid overlapping transition windows.\n- Preserve the visual intent. Use enough keyframes for smooth motion and avoid sudden movement or redundant tracks. If the request is ambiguous, choose a conservative interpretation and state the assumption.\n- Never claim the preview renders features it does not support.\n\nCURRENT DOCUMENT (nirvy.motion v1)\n${JSON.stringify(project, null, 2)}\n\nAfter the JSON, summarize up to 5 changes and how to review them on the timeline.`;
  navigator.clipboard?.writeText(prompt).then(() => toast("Project brief copied. Paste it into an AI and import the finished JSON."), () => toast("The browser blocked clipboard access."));
}

document.addEventListener("click", (event) => {
  const preset = event.target.closest("[data-prompt]");
  if (preset) { $("#ai-request").value = preset.dataset.prompt; $("#ai-request").focus(); return; }
  const sceneMarker = event.target.closest(".scene-marker");
  if (sceneMarker) { const scene = project.scenes?.find((item) => item.id === sceneMarker.dataset.sceneId); if (scene) { selectedSceneId = scene.id; setCurrentTime(scene.startMs); renderTimeline(); } return; }
  const panel = event.target.closest("[data-panel]");
  if (panel) { setPanel(panel.dataset.panel); return; }
  const inspector = event.target.closest("[data-inspector]");
  if (inspector) {
    $$(".inspector-tabs button").forEach((button) => button.classList.toggle("is-active", button === inspector));
    $("#inspector-motion").hidden = inspector.dataset.inspector !== "motion";
    $("#inspector-ai").hidden = inspector.dataset.inspector !== "ai";
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const actions = {
    "open-project": () => $("#open-file").click(), "open-binary": () => $("#open-binary-file").click(), "save-json": saveJSON, "save-binary": saveMotionBinary,
    "export-video": exportVideo, "export-svg": exportSvgIcon, "load-font": () => loadFont($("#field-font-custom").value || $("#field-font").value), "add-svg-icon": () => addDecoration("icon"), "add-dotted-line": () => addDecoration("line"), "remove-decoration": () => { project.canvas.decorations = (project.canvas.decorations ?? []).filter((item) => item.id !== selectedDecorationId); selectedDecorationId = null; markDirty(); renderTimeline(); }, "speak": speakNarration, "stop-speech": () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); },
    "add-scene": addScene, "remove-scene": removeScene,
    "save-binary-file": saveHexCopy, "ai-brief": aiBrief, "rename": () => { const name = prompt("Project name", project.name); if (name?.trim()) { project.name = name.trim().slice(0, 120); markDirty(); renderTimeline(); } },
    "reset-sample": () => { if (confirm("Load the Motion Studio sample? Your current project will be saved for recovery.")) { backupCurrentProject(); project = createSampleMotion(); selectedTrackId = project.tracks[0].id; selectedSceneId = project.scenes?.[0]?.id ?? null; selectedKey = null; currentTime = 0; markDirty(); renderAll(); } },
    "open-next-level": openNextLevelPromo, "restore-previous": restorePreviousProject,
    "toggle-play": togglePlay, "stop": stopPlayback, "add-keyframe": addKeyframe, "delete-keyframe": deleteKeyframe, "add-track": addTrack,
    "zoom-in": () => { zoom = Math.min(3, zoom + .15); renderTimeline(); }, "zoom-out": () => { zoom = Math.max(.45, zoom - .15); renderTimeline(); },
    "fit-stage": async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $("#stage").requestFullscreen(); } catch { toast("The browser could not enter fullscreen."); } }, "hex-prev": () => { if (hexBytes) { hexOffset = Math.max(0, hexOffset - 256); renderHex(); } },
    "hex-next": () => { if (hexBytes) { hexOffset = Math.min(Math.max(0, hexBytes.length - 1), hexOffset + 256); renderHex(); } }, "hex-jump": jumpHex, "hex-search": searchHex,
    "repair-crc": crcRepair, "import-current-binary": importCurrentBinary,
  };
  actions[action]?.();
});

document.addEventListener("click", (event) => {
  const key = event.target.closest(".keyframe");
  if (!key) return;
  selectedKey = { trackId: key.dataset.trackId, frameId: key.dataset.frameId };
  selectedTrackId = key.dataset.trackId;
  const track = project.tracks.find((item) => item.id === selectedKey.trackId);
  const frame = track?.keyframes.find((item) => item.id === selectedKey.frameId);
  if (frame) setCurrentTime(frame.timeMs);
  renderTimeline();
});
document.addEventListener("pointerdown", (event) => {
  const key = event.target.closest(".keyframe");
  if (!key || event.button !== 0) return;
  dragKey = { trackId: key.dataset.trackId, frameId: key.dataset.frameId, pointerId: event.pointerId, point: key, scale: key.closest(".lane-scale") };
  key.setPointerCapture(event.pointerId);
});
document.addEventListener("pointermove", (event) => {
  if (!dragKey || event.pointerId !== dragKey.pointerId) return;
  const rect = dragKey.scale.getBoundingClientRect();
  const rawTime = Math.max(0, Math.min(project.durationMs, (event.clientX - rect.left) / rect.width * project.durationMs));
  const frameStep = 1000 / project.fps;
  const time = Math.min(project.durationMs, Math.round(rawTime / frameStep) * frameStep);
  const track = project.tracks.find((item) => item.id === dragKey.trackId);
  const frame = track?.keyframes.find((item) => item.id === dragKey.frameId);
  if (!frame) return;
  frame.timeMs = Math.round(time * 1000) / 1000;
  dragKey.point.style.left = `${frame.timeMs / project.durationMs * 100}%`;
  currentTime = frame.timeMs;
  updateStage();
});
function finishKeyframeDrag(event) {
  if (!dragKey || (event && event.pointerId !== dragKey.pointerId)) return;
  const track = project.tracks.find((item) => item.id === dragKey.trackId);
  if (track) track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  selectedTrackId = dragKey.trackId;
  selectedKey = { trackId: dragKey.trackId, frameId: dragKey.frameId };
  dragKey = null;
  markDirty();
  renderTimeline();
}
document.addEventListener("pointerup", finishKeyframeDrag);
document.addEventListener("pointercancel", finishKeyframeDrag);
$("#ruler-scale").addEventListener("click", (event) => setTimeFromScale(event, event.currentTarget));
$("#field-name").addEventListener("input", (event) => { project.name = event.target.value.slice(0, 120); $("#heading-name").textContent = project.name || "Sem nome"; $("#project-name").textContent = project.name || "Sem nome"; $("#stage-caption-name").textContent = project.name || "Sem nome"; markDirty(); });
$("#field-label").addEventListener("input", (event) => { if (!updateSelectedScene("label", event.target.value.slice(0, 24))) { project.canvas.label = event.target.value.slice(0, 24); markDirty(); updateStage(); } });
$("#field-font").addEventListener("change", (event) => { $("#field-font-custom").value = ""; loadFont(event.target.value); });
$("#field-subtitle").addEventListener("input", (event) => { if (!updateSelectedScene("subtitle", event.target.value.slice(0, 80))) { project.canvas.subtitle = event.target.value.slice(0, 80); markDirty(); updateStage(); } });
$("#field-narration").addEventListener("input", (event) => { project.narration ??= { text: "", rate: 1 }; project.narration.text = event.target.value.slice(0, 1000); markDirty(); });
$("#field-voice").addEventListener("change", (event) => { project.narration ??= { text: "", rate: 1 }; project.narration.voiceURI = event.target.value; markDirty(); });
$("#field-narration-rate").addEventListener("input", (event) => { project.narration ??= { text: "", rate: 1 }; project.narration.rate = Number(event.target.value); $("#narration-rate-label").textContent = `${project.narration.rate.toFixed(1)}×`; markDirty(); });
$("#field-background").addEventListener("input", (event) => { if (!updateSelectedScene("background", event.target.value)) { project.canvas.background = event.target.value; markDirty(); updateStage(); } });
$("#field-object-color").addEventListener("input", (event) => { if (!updateSelectedScene("objectColor", event.target.value)) { project.canvas.objectColor = event.target.value; markDirty(); updateStage(); } });
for (const field of ["reflection", "contrast", "brightness", "shine", "perspective"]) $("#field-" + field).addEventListener("input", (event) => {
  project.canvas.effects ??= { reflection: .36, contrast: 1, brightness: 1, shine: .68, perspective: 900 };
  project.canvas.effects[field] = Number(event.target.value);
  const label = field === "reflection" ? `${Math.round(event.target.value * 100)}%` : field === "shine" ? `${Math.round(event.target.value * 100)}%` : field === "perspective" ? `${event.target.value} px` : `${Number(event.target.value).toFixed(2)}×`;
  $("#" + field + "-label").textContent = label; markDirty(); updateStage();
});
$("#field-scene").addEventListener("change", (event) => { const scene = project.scenes?.find((item) => item.id === event.target.value); if (!scene) return; selectedSceneId = scene.id; setCurrentTime(scene.startMs); renderTimeline(); });
$("#field-transition").addEventListener("change", (event) => { const scene = selectedScene(); if (!scene) return; scene.transition ??= { type: "flip", durationMs: 620 }; scene.transition.type = event.target.value; if (normalizeSceneTransitions()) toast("Transition timing was adjusted to fit the timeline."); renderSceneControls(scene); markDirty(); updateStage(); });
$("#field-entrance").addEventListener("change", (event) => { const scene = selectedScene(); if (!scene) return; scene.entrance = { type: event.target.value, durationMs: Number($("#field-entrance-duration").value) || 700 }; markDirty(); updateStage(); });
$("#field-entrance-duration").addEventListener("input", (event) => { const scene = selectedScene(); if (!scene) return; scene.entrance ??= { type: "fadeUp", durationMs: 700 }; scene.entrance.durationMs = Number(event.target.value); $("#entrance-duration-label").textContent = `${scene.entrance.durationMs} ms`; markDirty(); updateStage(); });
$("#field-decor").addEventListener("change", (event) => { selectedDecorationId = event.target.value; renderDecorationControls(); });
$("#field-decor-icon").addEventListener("change", (event) => { const item = project.canvas.decorations?.find((entry) => entry.id === selectedDecorationId); if (!item || item.type !== "icon") return; item.icon = event.target.value; markDirty(); renderTimeline(); });
for (const field of ["x", "y", "size", "color"]) $("#field-decor-" + field).addEventListener("input", (event) => updateSelectedDecoration(field, event.target.value));
$("#field-decor-rotation").addEventListener("input", (event) => updateSelectedDecoration("rotation", event.target.value));
$("#field-transition-duration").addEventListener("input", (event) => { const scene = selectedScene(); if (!scene) return; scene.transition ??= { type: "flip", durationMs: 620 }; scene.transition.durationMs = Number(event.target.value); if (normalizeSceneTransitions()) { renderSceneControls(scene); toast("Transition duration was limited to prevent overlap."); } $("#transition-duration-label").textContent = `${scene.transition.durationMs} ms`; markDirty(); updateStage(); });
$("#field-duration").addEventListener("change", (event) => { project.durationMs = Math.max(100, Math.min(120000, Number(event.target.value) || 100)); for (const track of project.tracks) for (const frame of track.keyframes) frame.timeMs = Math.min(project.durationMs, frame.timeMs); let previousStart = -1; for (const scene of [...(project.scenes ?? [])].sort((a, b) => a.startMs - b.startMs)) { scene.startMs = Math.max(previousStart + 1, Math.min(project.durationMs - 1, scene.startMs)); previousStart = scene.startMs; } const adjusted = normalizeSceneTransitions(); currentTime = Math.min(currentTime, project.durationMs); markDirty(); renderTimeline(); if (adjusted) toast("Scene transitions were resized to fit the new duration."); });
$("#field-fps").addEventListener("change", (event) => { project.fps = Math.max(1, Math.min(240, Number(event.target.value) || 30)); markDirty(); renderTimeline(); });
$("#field-width").addEventListener("change", (event) => { project.canvas.width = Math.max(1, Math.min(8192, Number(event.target.value) || 1280)); markDirty(); renderTimeline(); });
$("#field-height").addEventListener("change", (event) => { project.canvas.height = Math.max(1, Math.min(8192, Number(event.target.value) || 720)); markDirty(); renderTimeline(); });
$("#field-track").addEventListener("change", (event) => { if (!selectedKey) return; const nextTrack = project.tracks.find((item) => item.id === event.target.value); const frame = selectedKeyframe(); if (!nextTrack || !frame) return; const from = project.tracks.find((item) => item.id === selectedKey.trackId); from.keyframes = from.keyframes.filter((item) => item.id !== frame.id); nextTrack.keyframes.push(frame); selectedKey = { trackId: nextTrack.id, frameId: frame.id }; selectedTrackId = nextTrack.id; markDirty(); renderTimeline(); });
$("#field-key-time").addEventListener("change", (event) => { const frame = selectedKeyframe(); if (!frame) return; frame.timeMs = Math.max(0, Math.min(project.durationMs, Number(event.target.value) || 0)); selectedTrack().keyframes.sort((a, b) => a.timeMs - b.timeMs); currentTime = frame.timeMs; markDirty(); renderTimeline(); });
$("#field-key-value").addEventListener("change", (event) => { const frame = selectedKeyframe(); if (!frame) return; frame.value = Number(event.target.value); markDirty(); renderTimeline(); });
$("#field-easing").addEventListener("change", (event) => { const frame = selectedKeyframe(); if (!frame) return; frame.easing = event.target.value; markDirty(); renderTimeline(); });
$("#open-file").addEventListener("change", (event) => { openProjectFile(event.target.files?.[0]); event.target.value = ""; });
$("#open-binary-file").addEventListener("change", (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (file.size > MAX_BINARY_BYTES) { toast("Files larger than 16 MiB are not supported."); return; } file.arrayBuffer().then((buffer) => { setHexBuffer(new Uint8Array(buffer), file.name); setPanel("hex"); toast(`${file.name} loaded into memory.`); }).catch(() => toast("Could not read this file.")); });
$("#hex-jump").addEventListener("keydown", (event) => { if (event.key === "Enter") jumpHex(); });
$("#hex-search").addEventListener("keydown", (event) => { if (event.key === "Enter") searchHex(); });
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  if (editing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.code === "Space" && activePanel === "timeline") { event.preventDefault(); togglePlay(); }
  else if (event.key.toLowerCase() === "k" && activePanel === "timeline") { event.preventDefault(); addKeyframe(); }
  else if (event.key === "ArrowLeft" && activePanel === "timeline") setCurrentTime(currentTime - 1000 / project.fps);
  else if (event.key === "ArrowRight" && activePanel === "timeline") setCurrentTime(currentTime + 1000 / project.fps);
  else if (event.key === "Delete" && selectedKey) deleteKeyframe();
});

if ("speechSynthesis" in window) { refreshSpeechVoices(); speechSynthesis.addEventListener?.("voiceschanged", refreshSpeechVoices); }
const dropOverlay = $("#drop-overlay");
let dragDepth = 0;
document.addEventListener("dragenter", (event) => { if (!event.dataTransfer?.types.includes("Files")) return; event.preventDefault(); dragDepth += 1; dropOverlay.hidden = false; });
document.addEventListener("dragover", (event) => { if (event.dataTransfer?.types.includes("Files")) event.preventDefault(); });
document.addEventListener("dragleave", (event) => { if (!event.dataTransfer?.types.includes("Files")) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dropOverlay.hidden = true; });
document.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault(); dragDepth = 0; dropOverlay.hidden = true;
  const file = event.dataTransfer.files[0];
  if (!/\.(motion\.json|json|nvmb)$/i.test(file.name)) { toast("Drop a .motion.json, .json, or .nvmb project."); return; }
  openProjectFile(file);
});

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) project = validateMotionDocument(JSON.parse(saved));
} catch { project = createSampleMotion(); }
selectedTrackId = project.tracks[0]?.id ?? null; selectedSceneId = project.scenes?.[0]?.id ?? null;
renderAll();
if (project.name === "NEXT LEVEL • comunidade no Discord" && !project.scenes?.length) openNextLevelPromo();
else upgradeSavedNextLevelPromo();
