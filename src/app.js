import { createSampleMotion, validateMotionDocument, encodeMotionBinary, decodeMotionBinary, repairMotionChecksum, MAX_BINARY_BYTES } from "./motion-format.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE_KEY = "motion-studio-ai-project-v1";
const colors = { x: "#a78bfa", y: "#56d7de", rotation: "#ff9b70", scale: "#57d7a2", opacity: "#f4c96b" };
const defaults = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
let project = createSampleMotion();
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
  $("#save-state").textContent = "Salvando…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); $("#save-state").textContent = "Salvo localmente"; }
    catch { $("#save-state").textContent = "Não foi possível salvar"; }
  }, 260);
}

function selectedTrack() { return project.tracks.find((track) => track.id === selectedTrackId) ?? project.tracks[0] ?? null; }
function selectedKeyframe() { return selectedKey ? project.tracks.find((track) => track.id === selectedKey.trackId)?.keyframes.find((frame) => frame.id === selectedKey.frameId) ?? null : null; }
function formatTime(ms) { const value = Math.max(0, ms); const seconds = Math.floor(value / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.${String(Math.floor(value % 1000)).padStart(3, "0")}`; }
function trackLabel(track) { return track.label || ({ x: "Posição X", y: "Posição Y", rotation: "Rotação", scale: "Escala", opacity: "Opacidade" }[track.property] ?? track.property); }
function easingValue(t, easing) { if (easing === "easeIn") return t * t; if (easing === "easeOut") return 1 - (1 - t) ** 2; if (easing === "easeInOut") return t < .5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2; return t; }

function valueAt(property, time) {
  const track = project.tracks.find((item) => item.property === property);
  if (!track?.keyframes.length) return defaults[property];
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
  const scale = valueAt("scale", currentTime);
  const opacity = valueAt("opacity", currentTime);
  const stage = $("#stage");
  const scaleX = stage.clientWidth / project.canvas.width;
  const scaleY = stage.clientHeight / project.canvas.height;
  $("#motion-object").style.transform = `translate(${x * scaleX}px,${y * scaleY}px) rotate(${rotation}deg) scale(${scale})`;
  $("#motion-object").style.opacity = String(Math.max(0, Math.min(1, opacity)));
  $("#time-current").textContent = formatTime(currentTime);
  $("#time-total").textContent = formatTime(project.durationMs);
  const position = Math.min(100, currentTime / project.durationMs * 100);
  $$(".playhead").forEach((line) => { line.style.left = `${position}%`; });
  $$(".timeline-scale").forEach((scaleEl) => { scaleEl.setAttribute("aria-valuenow", String(Math.round(currentTime))); });
}

function renderTimeline() {
  $("#project-name").textContent = project.name;
  $("#heading-name").textContent = project.name;
  $("#stage-caption-name").textContent = project.name;
  $("#field-name").value = project.name;
  $("#field-label").value = project.canvas.label ?? "M";
  $("#field-background").value = project.canvas.background ?? "#090b13";
  $("#field-object-color").value = project.canvas.objectColor ?? "#b9a3ff";
  $("#field-duration").value = project.durationMs;
  $("#field-fps").value = project.fps;
  $("#field-width").value = project.canvas.width;
  $("#field-height").value = project.canvas.height;
  $("#stage-size").textContent = `${project.canvas.width} × ${project.canvas.height} · ${project.fps} FPS`;
  $("#motion-object > span").textContent = project.canvas.label ?? "M";
  $("#motion-object").style.setProperty("--object-color", project.canvas.objectColor ?? "#b9a3ff");
  $("#stage").style.setProperty("--stage-bg", project.canvas.background ?? "#090b13");
  $("#stage").style.setProperty("--canvas-ratio", `${project.canvas.width} / ${project.canvas.height}`);
  $("#track-count").textContent = `${project.tracks.length} trilhas`;
  $("#zoom-label").textContent = `${Math.round(zoom * 100)}%`;

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
  const lanes = $("#track-lanes"); lanes.innerHTML = "";
  for (const track of project.tracks) {
    const lane = document.createElement("div"); lane.className = `track-lane${track.id === selectedTrackId ? " is-selected" : ""}`; lane.dataset.trackId = track.id;
    const label = document.createElement("button"); label.className = "track-label"; label.type = "button"; label.dataset.selectTrack = track.id;
    label.innerHTML = `<span class="track-dot" style="--track-color:${colors[track.property] ?? "#a78bfa"}"></span><span>${escapeHtml(trackLabel(track))}</span>`;
    const scale = document.createElement("div"); scale.className = "lane-scale timeline-scale"; scale.dataset.trackId = track.id; scale.style.gridColumn = "2"; scale.style.gridRow = "1";
    scale.setAttribute("role", "slider"); scale.setAttribute("aria-label", `${trackLabel(track)} timeline`); scale.setAttribute("aria-valuemin", "0"); scale.setAttribute("aria-valuemax", String(project.durationMs));
    const laneHead = document.createElement("div"); laneHead.className = "playhead"; scale.append(laneHead);
    for (const frame of track.keyframes) {
      const point = document.createElement("button"); point.type = "button"; point.className = `keyframe${selectedKey?.trackId === track.id && selectedKey.frameId === frame.id ? " is-selected" : ""}`; point.style.left = `${frame.timeMs / project.durationMs * 100}%`; point.dataset.trackId = track.id; point.dataset.frameId = frame.id; point.title = `${Math.round(frame.timeMs)} ms · ${frame.value}`; point.setAttribute("aria-label", `${trackLabel(track)}, ${Math.round(frame.timeMs)} milissegundos, valor ${frame.value}`); scale.append(point);
    }
    lane.append(label, scale); lane.addEventListener("click", (event) => { if (!event.target.closest(".keyframe")) { selectedTrackId = track.id; if (event.target.closest(".lane-scale")) setTimeFromScale(event, event.target.closest(".lane-scale")); renderTimeline(); renderInspector(); } });
    lanes.append(lane);
  }
  updateStage();
  renderInspector();
}

function renderInspector() {
  const frame = selectedKeyframe();
  $("#empty-selection").hidden = Boolean(frame);
  $("#keyframe-fields").hidden = !frame;
  $("#keyframe-state").textContent = frame ? "Selecionado" : "Nenhum";
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
  if (!track) { toast("Crie uma trilha antes de adicionar keyframes."); return; }
  const existing = track.keyframes.find((frame) => Math.abs(frame.timeMs - currentTime) < 1);
  if (existing) { selectedKey = { trackId: track.id, frameId: existing.id }; toast("Já existe um keyframe neste tempo."); }
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
  selectedKey = null; markDirty(); renderTimeline(); toast("Keyframe excluído.");
}
function addTrack() {
  const options = ["x", "y", "rotation", "scale", "opacity"].filter((property) => !project.tracks.some((track) => track.property === property));
  if (!options.length) { toast("Todas as propriedades disponíveis já têm uma trilha."); return; }
  const property = prompt(`Qual propriedade deseja animar?\n${options.join(", ")}`, options[0]);
  if (!property || !options.includes(property)) return;
  const id = `track-${crypto.randomUUID()}`;
  const start = defaults[property];
  project.tracks.push({ id, property, label: ({ x: "Posição X", y: "Posição Y", rotation: "Rotação", scale: "Escala", opacity: "Opacidade" })[property], keyframes: [{ id: `kf-${crypto.randomUUID()}`, timeMs: 0, value: start, easing: "linear" }] });
  selectedTrackId = id; selectedKey = null; markDirty(); renderTimeline();
}

function togglePlay() {
  playing = !playing;
  const button = $("[data-action='toggle-play']");
  button.textContent = playing ? "Ⅱ" : "▶";
  button.setAttribute("aria-label", playing ? "Pausar" : "Reproduzir");
  if (playing) { playOrigin = performance.now(); playOffset = currentTime; requestAnimationFrame(tick); }
}
function tick(now) {
  if (!playing) return;
  const next = playOffset + (now - playOrigin);
  if (next >= project.durationMs) {
    setCurrentTime(project.durationMs); playing = false; $("[data-action='toggle-play']").textContent = "▶"; $("[data-action='toggle-play']").setAttribute("aria-label", "Reproduzir"); return;
  }
  setCurrentTime(next); requestAnimationFrame(tick);
}
function stopPlayback() { playing = false; $("[data-action='toggle-play']").textContent = "▶"; $("[data-action='toggle-play']").setAttribute("aria-label", "Reproduzir"); setCurrentTime(0); }

function download(name, bytes, type) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function saveJSON() {
  try { validateMotionDocument(project); download(`${safeName(project.name)}.motion.json`, JSON.stringify(project, null, 2), "application/json"); toast("Motion JSON exportado."); }
  catch (error) { toast(error.message); }
}
function saveMotionBinary() {
  try { const bytes = encodeMotionBinary(project); download(`${safeName(project.name)}.nvmb`, bytes, "application/octet-stream"); toast(`Motion Binary exportado · ${bytes.byteLength} bytes.`); }
  catch (error) { toast(error.message); }
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
  if (file.size > MAX_BINARY_BYTES) { toast("Arquivo maior que o limite de 16 MiB."); return; }
  file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let next;
    if (bytes[0] === 0x4e && bytes[1] === 0x56 && bytes[2] === 0x4d && bytes[3] === 0x42) {
      next = decodeMotionBinary(bytes);
      setHexBuffer(bytes, file.name);
      toast("Motion Binary carregado e CRC validado.");
    } else {
      next = validateMotionDocument(JSON.parse(new TextDecoder().decode(bytes)));
      toast("Motion JSON carregado.");
    }
    project = next; selectedTrackId = project.tracks[0]?.id ?? null; selectedKey = null; currentTime = 0; markDirty(); setPanel("timeline"); renderAll();
  }).catch((error) => toast(`Não consegui abrir: ${error.message}`));
}

function setHexBuffer(bytes, name) {
  hexBytes = new Uint8Array(bytes); hexOriginal = new Uint8Array(bytes); hexName = name; hexOffset = 0; selectedByte = -1; hexDirty = false; renderHex();
}
function renderHex() {
  $("#hex-file-name").textContent = hexName || "Sem arquivo aberto";
  $("#hex-file-size").textContent = hexBytes ? `${hexBytes.byteLength.toLocaleString("pt-BR")} bytes · ${hexBytes.byteLength.toString(16).toUpperCase()} hex · cópia em memória` : "Abra um arquivo para inspecionar ou edite o Motion Binary atual.";
  $("#hex-dirty").hidden = !hexDirty;
  const rows = $("#hex-rows");
  rows.innerHTML = "";
  if (!hexBytes) { rows.innerHTML = `<div class="hex-empty"><span>▦</span><strong>Nenhum arquivo carregado</strong><p>Abra um binário local ou exporte o Motion atual para NVMB.</p><button class="button-secondary" data-action="save-binary">Exportar Motion Binary</button></div>`; return; }
  const start = Math.max(0, Math.floor(hexOffset / 16) * 16);
  const end = Math.min(hexBytes.length, start + 256);
  for (let rowOffset = start; rowOffset < end; rowOffset += 16) {
    const row = document.createElement("div"); row.className = "hex-row";
    const offset = document.createElement("span"); offset.className = "hex-offset"; offset.textContent = rowOffset.toString(16).toUpperCase().padStart(8, "0");
    const hex = document.createElement("div"); hex.className = "hex-bytes";
    let ascii = "";
    for (let index = rowOffset; index < Math.min(rowOffset + 16, end); index++) {
      const byte = hexBytes[index]; ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
      const input = document.createElement("input"); input.className = `hex-byte${selectedByte === index ? " is-selected" : ""}`; input.value = byte.toString(16).toUpperCase().padStart(2, "0"); input.maxLength = 2; input.inputMode = "text"; input.spellcheck = false; input.dataset.index = String(index); input.setAttribute("aria-label", `Byte no offset ${index.toString(16)}`); input.title = `Offset 0x${index.toString(16).toUpperCase()}`;
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
function saveHexCopy() { if (!hexBytes) { toast("Abra um arquivo primeiro."); return; } download(hexName ? `edited-${hexName}` : "motion-edited.bin", hexBytes, "application/octet-stream"); toast("Cópia binária exportada; o original não foi sobrescrito."); }
function parseHexSequence(value) { const clean = value.trim().replace(/^0x/i, "").replace(/[^\da-f]/gi, ""); if (!clean || clean.length % 2) throw new Error("Digite bytes hexadecimais em pares, como 4E 56 4D 42."); return clean.match(/.{2}/g).map((pair) => parseInt(pair, 16)); }
function searchHex() {
  if (!hexBytes) { toast("Abra um arquivo primeiro."); return; }
  try {
    const needle = parseHexSequence($("#hex-search").value);
    const start = Math.max(0, hexOffset + 1);
    outer: for (let i = start; i <= hexBytes.length - needle.length; i++) { for (let j = 0; j < needle.length; j++) if (hexBytes[i + j] !== needle[j]) continue outer; hexOffset = i; selectedByte = i; renderHex(); $(`#hex-rows .hex-byte[data-index="${i}"]`)?.focus(); $("#hex-selection").textContent = `Encontrado em 0x${i.toString(16).toUpperCase().padStart(8, "0")}`; return; }
    toast("Sequência não encontrada depois do offset atual.");
  } catch (error) { toast(error.message); }
}
function jumpHex() {
  if (!hexBytes) return;
  const raw = $("#hex-jump").value.trim().replace(/^0x/i, "");
  const offset = Number.parseInt(raw, 16);
  if (!Number.isFinite(offset) || offset < 0 || offset >= hexBytes.length) { toast("Offset fora dos limites do arquivo."); return; }
  hexOffset = offset; selectedByte = offset; renderHex(); $(`#hex-rows .hex-byte[data-index="${offset}"]`)?.focus();
}
function crcRepair() {
  if (!hexBytes) { toast("Abra um contêiner NVMB primeiro."); return; }
  try { repairMotionChecksum(hexBytes); hexDirty = !sameBytes(hexBytes, hexOriginal); renderHex(); toast("CRC-32 recalculado. Valide com ‘Abrir como Motion’ antes de usar o projeto."); }
  catch (error) { toast(error.message); }
}
function importCurrentBinary() {
  if (!hexBytes) { toast("Abra um arquivo primeiro."); return; }
  try { const next = decodeMotionBinary(hexBytes); project = next; selectedTrackId = project.tracks[0]?.id ?? null; selectedKey = null; currentTime = 0; markDirty(); setPanel("timeline"); renderAll(); toast("NVMB validado e aberto na timeline."); }
  catch (error) { toast(error.message); }
}
function aiBrief() {
  const request = $("#ai-request").value.trim();
  if (!request) { $("#ai-request").focus(); toast("Descreva a alteração desejada ou escolha um exemplo."); return; }
  const prompt = `Você é Motion Editor, uma IA especializada em motion design e neste repositório. Siga AI-INSTRUCTIONS.md e docs/FORMAT.md.\n\nTAREFA DO USUÁRIO\n${request}\n\nCRITÉRIOS DE ENTREGA\n- Edite o documento atual sem apagar campos desconhecidos e preserve version, format, IDs e propriedades não relacionadas ao pedido.\n- Retorne um JSON completo e válido, sem comentários ou reticências, em um único bloco json. Não retorne NVMB em base64.\n- Valide: duração 100–120000 ms; FPS 1–240; canvas 1–8192 px; até 64 tracks e 10000 keyframes; IDs não vazios e únicos; tempos entre 0 e durationMs; easing linear/easeIn/easeOut/easeInOut.\n- Para opacity use 0–1; scale maior que 0 e até 100; posições até ±100000 px; rotação até ±360000°.\n- Preserve a intenção visual, use keyframes suficientes para suavidade e evite movimentos bruscos ou tracks redundantes. Se a solicitação for ambígua, escolha uma interpretação conservadora e informe a suposição.\n- Não alegue que o preview renderiza mais do que realmente suporta.\n\nDOCUMENTO ATUAL (nirvy.motion v1)\n${JSON.stringify(project, null, 2)}\n\nDepois do JSON, resuma em até 5 itens o que mudou e como verificar na timeline.`;
  navigator.clipboard?.writeText(prompt).then(() => toast("Briefing e projeto copiados. Cole-os na IA e reimporte o JSON final."), () => toast("O navegador bloqueou a área de transferência."));
}

document.addEventListener("click", (event) => {
  const preset = event.target.closest("[data-prompt]");
  if (preset) { $("#ai-request").value = preset.dataset.prompt; $("#ai-request").focus(); return; }
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
    "save-binary-file": saveHexCopy, "ai-brief": aiBrief, "rename": () => { const name = prompt("Nome do motion", project.name); if (name?.trim()) { project.name = name.trim().slice(0, 120); markDirty(); renderTimeline(); } },
    "reset-sample": () => { if (confirm("Carregar o exemplo? As alterações atuais ficam salvas no histórico do navegador?")) { project = createSampleMotion(); selectedTrackId = project.tracks[0].id; selectedKey = null; currentTime = 0; markDirty(); renderAll(); } },
    "toggle-play": togglePlay, "stop": stopPlayback, "add-keyframe": addKeyframe, "delete-keyframe": deleteKeyframe, "add-track": addTrack,
    "zoom-in": () => { zoom = Math.min(3, zoom + .15); renderTimeline(); }, "zoom-out": () => { zoom = Math.max(.45, zoom - .15); renderTimeline(); },
    "fit-stage": async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $("#stage").requestFullscreen(); } catch { toast("O navegador não permitiu abrir o palco em tela cheia."); } }, "hex-prev": () => { if (hexBytes) { hexOffset = Math.max(0, hexOffset - 256); renderHex(); } },
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
$("#field-label").addEventListener("input", (event) => { project.canvas.label = event.target.value.slice(0, 24); $("#motion-object > span").textContent = project.canvas.label || " "; markDirty(); });
$("#field-background").addEventListener("input", (event) => { project.canvas.background = event.target.value; $("#stage").style.setProperty("--stage-bg", event.target.value); markDirty(); });
$("#field-object-color").addEventListener("input", (event) => { project.canvas.objectColor = event.target.value; $("#motion-object").style.setProperty("--object-color", event.target.value); markDirty(); });
$("#field-duration").addEventListener("change", (event) => { project.durationMs = Math.max(100, Math.min(120000, Number(event.target.value) || 100)); for (const track of project.tracks) for (const frame of track.keyframes) frame.timeMs = Math.min(project.durationMs, frame.timeMs); currentTime = Math.min(currentTime, project.durationMs); markDirty(); renderTimeline(); });
$("#field-fps").addEventListener("change", (event) => { project.fps = Math.max(1, Math.min(240, Number(event.target.value) || 30)); markDirty(); renderTimeline(); });
$("#field-width").addEventListener("change", (event) => { project.canvas.width = Math.max(1, Math.min(8192, Number(event.target.value) || 1280)); markDirty(); renderTimeline(); });
$("#field-height").addEventListener("change", (event) => { project.canvas.height = Math.max(1, Math.min(8192, Number(event.target.value) || 720)); markDirty(); renderTimeline(); });
$("#field-track").addEventListener("change", (event) => { if (!selectedKey) return; const nextTrack = project.tracks.find((item) => item.id === event.target.value); const frame = selectedKeyframe(); if (!nextTrack || !frame) return; const from = project.tracks.find((item) => item.id === selectedKey.trackId); from.keyframes = from.keyframes.filter((item) => item.id !== frame.id); nextTrack.keyframes.push(frame); selectedKey = { trackId: nextTrack.id, frameId: frame.id }; selectedTrackId = nextTrack.id; markDirty(); renderTimeline(); });
$("#field-key-time").addEventListener("change", (event) => { const frame = selectedKeyframe(); if (!frame) return; frame.timeMs = Math.max(0, Math.min(project.durationMs, Number(event.target.value) || 0)); selectedTrack().keyframes.sort((a, b) => a.timeMs - b.timeMs); currentTime = frame.timeMs; markDirty(); renderTimeline(); });
$("#field-key-value").addEventListener("change", (event) => { const frame = selectedKeyframe(); if (!frame) return; frame.value = Number(event.target.value); markDirty(); renderTimeline(); });
$("#field-easing").addEventListener("change", (event) => { const frame = selectedKeyframe(); if (!frame) return; frame.easing = event.target.value; markDirty(); renderTimeline(); });
$("#open-file").addEventListener("change", (event) => { openProjectFile(event.target.files?.[0]); event.target.value = ""; });
$("#open-binary-file").addEventListener("change", (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (file.size > MAX_BINARY_BYTES) { toast("Arquivo maior que 16 MiB não será carregado."); return; } file.arrayBuffer().then((buffer) => { setHexBuffer(new Uint8Array(buffer), file.name); setPanel("hex"); toast(`${file.name} carregado em memória.`); }).catch(() => toast("Não consegui ler esse arquivo.")); });
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

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) project = validateMotionDocument(JSON.parse(saved));
} catch { project = createSampleMotion(); }
selectedTrackId = project.tracks[0]?.id ?? null;
renderAll();
