const state = {
  channel: 0,
  presets: [],
  storedZones: {},
  selectedPreset: null,
};

const statusBar = document.getElementById("statusBar");
const channelInput = document.getElementById("channelInput");
const presetList = document.getElementById("presetList");
const presetCount = document.getElementById("presetCount");
const selectedPresetName = document.getElementById("selectedPresetName");
const selectedPresetMeta = document.getElementById("selectedPresetMeta");
const renamePresetButton = document.getElementById("renamePreset");
const gotoPresetButton = document.getElementById("gotoPreset");
const applyPresetButton = document.getElementById("applyPreset");
const refreshButton = document.getElementById("refreshPresets");
const createButton = document.getElementById("createPreset");
const refreshPanoramaButton = document.getElementById("refreshPanorama");
const panoramaImage = document.getElementById("panoramaImage");
const panoramaPlaceholder = document.getElementById("panoramaPlaceholder");
const panoramaMeta = document.getElementById("panoramaMeta");
const zoneCanvas = document.getElementById("zoneCanvas");
const zoneMeta = document.getElementById("zoneMeta");
const clearZoneButton = document.getElementById("clearZone");
const fillZoneButton = document.getElementById("fillZone");
const saveZoneButton = document.getElementById("saveZone");

const zoneEditor = new ZoneEditor(zoneCanvas, zoneMeta);

function updateStatus(message, variant = "info") {
  statusBar.textContent = message;
  statusBar.dataset.variant = variant;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return undefined;
  }
  return response.json();
}

function updatePresetList() {
  presetList.innerHTML = "";
  state.presets.forEach((preset) => {
    const li = document.createElement("li");
    li.dataset.id = String(preset.id);
    li.classList.toggle("active", state.selectedPreset?.id === preset.id);
    if (state.storedZones[preset.id]) {
      li.classList.add("has-zones");
    }
    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = `${preset.name} (#${preset.id})`;
    li.appendChild(nameSpan);
    if (state.storedZones[preset.id]) {
      const badge = document.createElement("span");
      badge.className = "badge";
      li.appendChild(badge);
    }
    li.addEventListener("click", () => {
      setSelectedPreset(preset.id);
    });
    presetList.appendChild(li);
  });
  presetCount.textContent = `${state.presets.length} presets`;
}

function updatePresetDetails() {
  if (!state.selectedPreset) {
    selectedPresetName.textContent = "No preset selected";
    selectedPresetMeta.textContent = "Select or create a preset to begin.";
    renamePresetButton.disabled = true;
    gotoPresetButton.disabled = true;
    applyPresetButton.disabled = true;
    clearZoneButton.disabled = true;
    fillZoneButton.disabled = true;
    saveZoneButton.disabled = true;
    zoneEditor.reset();
    return;
  }

  const preset = state.selectedPreset;
  selectedPresetName.textContent = `${preset.name}`;
  selectedPresetMeta.textContent = `Preset #${preset.id} · Channel ${state.channel}`;
  renamePresetButton.disabled = false;
  gotoPresetButton.disabled = false;
  applyPresetButton.disabled = false;
  clearZoneButton.disabled = false;
  fillZoneButton.disabled = false;
  saveZoneButton.disabled = false;
}

async function setSelectedPreset(id) {
  const preset = state.presets.find((p) => p.id === id);
  state.selectedPreset = preset ?? null;
  updatePresetList();
  updatePresetDetails();
  if (preset) {
    updateStatus(`Loading zones for preset #${preset.id}...`);
    try {
      const zones = await fetchJson(
        `/api/zones?channel=${state.channel}&presetId=${preset.id}`
      );
      const source = zones?.stored ?? zones?.deviceMd;
      if (source) {
        zoneEditor.setGrid(source, zones?.stored ? "stored" : "device");
      } else {
        zoneEditor.reset();
      }
    } catch (error) {
      console.error(error);
      zoneEditor.reset();
      updateStatus(`Failed to load zones: ${error.message}`, "error");
    }
  }
}

async function refreshPresets() {
  state.channel = Number(channelInput.value || 0);
  updateStatus("Loading presets...");
  try {
    const payload = await fetchJson(`/api/presets?channel=${state.channel}`);
    state.presets = payload.presets ?? [];
    state.storedZones = payload.storedZones ?? {};
    updatePresetList();
    updatePresetDetails();
    updateStatus(`Loaded ${state.presets.length} presets.`);
  } catch (error) {
    console.error(error);
    updateStatus(`Failed to load presets: ${error.message}`, "error");
  }
}

async function createPreset() {
  const idInput = prompt("Preset ID (1-64)", "1");
  if (!idInput) return;
  const id = Number(idInput);
  if (Number.isNaN(id) || id < 1 || id > 64) {
    updateStatus("Preset ID must be between 1 and 64.", "error");
    return;
  }
  const name = prompt("Preset name", `Preset ${id}`);
  if (!name) return;
  updateStatus("Saving preset...");
  try {
    await fetchJson(`/api/presets`, {
      method: "POST",
      body: JSON.stringify({
        channel: state.channel,
        id,
        name,
        enable: true,
      }),
    });
    updateStatus("Preset saved.");
    await refreshPresets();
    setSelectedPreset(id);
  } catch (error) {
    console.error(error);
    updateStatus(`Failed to save preset: ${error.message}`, "error");
  }
}

async function renamePreset() {
  if (!state.selectedPreset) return;
  const nextName = prompt("Preset name", state.selectedPreset.name);
  if (!nextName) return;
  updateStatus("Renaming preset...");
  try {
    await fetchJson(`/api/presets`, {
      method: "POST",
      body: JSON.stringify({
        channel: state.channel,
        id: state.selectedPreset.id,
        name: nextName,
      }),
    });
    updateStatus("Preset renamed.");
    await refreshPresets();
    setSelectedPreset(state.selectedPreset.id);
  } catch (error) {
    console.error(error);
    updateStatus(`Failed to rename preset: ${error.message}`, "error");
  }
}

async function gotoPreset(applyZones = false) {
  if (!state.selectedPreset) return;
  updateStatus(applyZones ? "Moving and applying zones..." : "Moving to preset...");
  try {
    await fetchJson(`/api/presets/goto`, {
      method: "POST",
      body: JSON.stringify({
        channel: state.channel,
        id: state.selectedPreset.id,
      }),
    });
    if (applyZones) {
      await saveZones(true);
    } else {
      updateStatus("Preset reached.");
    }
  } catch (error) {
    console.error(error);
    updateStatus(`Failed to move preset: ${error.message}`, "error");
  }
}

async function saveZones(applyAfterSave = false) {
  if (!state.selectedPreset) return;
  let zones;
  try {
    zones = zoneEditor.toGridArea();
  } catch (error) {
    updateStatus(error.message || "No zone grid loaded", "error");
    return;
  }
  updateStatus("Saving zones...");
  try {
    await fetchJson(`/api/zones`, {
      method: "POST",
      body: JSON.stringify({
        channel: state.channel,
        presetId: state.selectedPreset.id,
        zones: { md: zones },
        apply: applyAfterSave,
      }),
    });
    updateStatus(applyAfterSave ? "Zones applied." : "Zones saved.");
    await refreshPresets();
  } catch (error) {
    console.error(error);
    updateStatus(`Failed to save zones: ${error.message}`, "error");
  }
}

async function capturePanorama() {
  updateStatus("Capturing panorama... this may take a while.");
  panoramaMeta.textContent = "Running sweep...";
  panoramaPlaceholder.style.display = "block";
  panoramaImage.style.display = "none";
  try {
    const result = await fetchJson(`/api/panorama?channel=${state.channel}`);
    if (result?.image) {
      panoramaImage.src = result.image;
      panoramaImage.style.display = "block";
      panoramaPlaceholder.style.display = "none";
      panoramaMeta.textContent = `Tiles captured: ${result.tiles}`;
      updateStatus("Panorama captured.");
    } else if (result?.supported === false) {
      panoramaMeta.textContent = "Panorama capture not supported by this device.";
      updateStatus("Panorama not available.", "warning");
    } else {
      panoramaMeta.textContent = "Panorama capture returned no data.";
      updateStatus("Panorama did not return an image.", "warning");
    }
  } catch (error) {
    console.error(error);
    panoramaMeta.textContent = "Failed to capture panorama.";
    updateStatus(`Panorama failed: ${error.message}`, "error");
  }
}

function initEvents() {
  channelInput.addEventListener("change", () => {
    refreshPresets();
  });
  refreshButton.addEventListener("click", () => refreshPresets());
  createButton.addEventListener("click", () => createPreset());
  renamePresetButton.addEventListener("click", () => renamePreset());
  gotoPresetButton.addEventListener("click", () => gotoPreset(false));
  applyPresetButton.addEventListener("click", () => gotoPreset(true));
  clearZoneButton.addEventListener("click", () => {
    zoneEditor.fill(0);
  });
  fillZoneButton.addEventListener("click", () => {
    zoneEditor.fill(1);
  });
  saveZoneButton.addEventListener("click", () => saveZones(false));
  refreshPanoramaButton.addEventListener("click", () => capturePanorama());
}

class ZoneEditor {
  constructor(canvas, metaEl) {
    this.canvas = canvas;
    this.metaEl = metaEl;
    this.width = 0;
    this.height = 0;
    this.bits = [];
    this.painting = false;
    this.paintValue = 1;
    this.cellSize = 8;
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("pointerup", (event) => this.onPointerUp(event));
    window.addEventListener("pointerup", () => (this.painting = false));
    this.updateMeta();
  }

  reset() {
    this.width = 0;
    this.height = 0;
    this.bits = [];
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.updateMeta();
  }

  setGrid(area, source = "device") {
    this.width = area.width;
    this.height = area.height;
    this.bits = Array.from(area.bits, (c) => (c === "1" ? 1 : 0));
    this.resizeCanvas();
    this.draw();
    this.metaEl.innerHTML = `
      <div><strong>Source:</strong> ${source === "stored" ? "Stored preset zones" : "Device configuration"}</div>
      <div><strong>Resolution:</strong> ${this.width} × ${this.height}</div>
      <div><strong>Coverage:</strong> ${this.coverage().toFixed(1)}%</div>
    `;
  }

  resizeCanvas() {
    const maxWidth = 720;
    const maxHeight = 480;
    this.cellSize = Math.max(
      4,
      Math.floor(Math.min(maxWidth / this.width, maxHeight / this.height))
    );
    this.canvas.width = this.width * this.cellSize;
    this.canvas.height = this.height * this.cellSize;
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "rgba(59, 130, 246, 0.65)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        if (this.bits[index]) {
          ctx.fillRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize,
            this.cellSize
          );
        }
        ctx.strokeRect(
          x * this.cellSize,
          y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }
    }
    this.updateMeta();
  }

  onPointerDown(event) {
    if (this.width === 0 || this.height === 0) return;
    this.canvas.setPointerCapture(event.pointerId);
    const { x, y } = this.getCellFromEvent(event);
    if (x === null) return;
    const index = y * this.width + x;
    this.paintValue = this.bits[index] ? 0 : 1;
    this.painting = true;
    this.setCell(x, y, this.paintValue);
  }

  onPointerMove(event) {
    if (!this.painting) return;
    const { x, y } = this.getCellFromEvent(event);
    if (x === null) return;
    this.setCell(x, y, this.paintValue);
  }

  onPointerUp(event) {
    this.painting = false;
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  getCellFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / this.cellSize);
    const y = Math.floor((event.clientY - rect.top) / this.cellSize);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return { x: null, y: null };
    }
    return { x, y };
  }

  setCell(x, y, value) {
    const index = y * this.width + x;
    if (this.bits[index] === value) return;
    this.bits[index] = value;
    this.draw();
  }

  fill(value) {
    if (this.width === 0 || this.height === 0) return;
    this.bits.fill(value ? 1 : 0);
    this.draw();
  }

  coverage() {
    if (this.bits.length === 0) return 0;
    const active = this.bits.reduce((sum, bit) => sum + (bit ? 1 : 0), 0);
    return (active / this.bits.length) * 100;
  }

  updateMeta() {
    if (!this.metaEl) return;
    if (this.bits.length === 0) {
      this.metaEl.innerHTML = "<div>Select a preset to edit its zones.</div>";
      return;
    }
    this.metaEl.innerHTML = `
      <div><strong>Resolution:</strong> ${this.width} × ${this.height}</div>
      <div><strong>Coverage:</strong> ${this.coverage().toFixed(1)}%</div>
      <div class="muted">Click and drag to toggle grid cells.</div>
    `;
  }

  toGridArea() {
    if (this.bits.length === 0) {
      throw new Error("No zone grid loaded");
    }
    return {
      width: this.width,
      height: this.height,
      bits: this.bits.map((bit) => (bit ? "1" : "0")).join(""),
    };
  }
}

initEvents();
refreshPresets();
