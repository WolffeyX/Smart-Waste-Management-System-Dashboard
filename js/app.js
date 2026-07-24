/* ════════════════════════════════════════════════════════════
   app.js — UI Shell Bootstrap
   ════════════════════════════════════════════════════════════
   Renders the city map, wires up interactive controls, and
   populates the sidebar. No algorithm logic — just visuals.
   ════════════════════════════════════════════════════════════ */

// ─── Mock Data (from KIRO_SPEC) ───
const SAMPLE_BINS = [
  { id: "B1", zoneName: "Jalan Merak 1",   capacity: 20, x: 120, y: 100  },
  { id: "B2", zoneName: "Jalan Merak 2",   capacity: 85, x: 280, y: 100  },
  { id: "B3", zoneName: "Jalan Merak 3",   capacity: 45, x: 440, y: 100  },
  { id: "B4", zoneName: "Jalan Nuri 1",    capacity: 90, x: 440, y: 250  },
  { id: "B5", zoneName: "Jalan Nuri 2",    capacity: 10, x: 280, y: 250  },
  { id: "B6", zoneName: "Jalan Nuri 3",    capacity: 60, x: 120, y: 250  },
  { id: "B7", zoneName: "Jalan Enggang 1", capacity: 30, x: 120, y: 400  },
  { id: "B8", zoneName: "Jalan Enggang 2", capacity: 95, x: 280, y: 400  },
  { id: "B9", zoneName: "Jalan Enggang 3", capacity: 50, x: 440, y: 400  },
];

const DEPOT = { id: "DEPOT", zoneName: "Truck Depot", capacity: 0, x: 50, y: 50 };

const ROAD_NETWORK = {
  DEPOT: { B1: 2.0, B6: 2.5 },
  B1: { DEPOT: 2.0, B2: 1.5, B6: 1.8 },
  B2: { B1: 1.5, B3: 1.5, B5: 1.8 },
  B3: { B2: 1.5, B4: 2.0 },
  B4: { B3: 2.0, B5: 1.5, B9: 1.8 },
  B5: { B2: 1.8, B4: 1.5, B6: 1.5, B8: 1.8 },
  B6: { DEPOT: 2.5, B1: 1.8, B5: 1.5, B7: 1.8 },
  B7: { B6: 1.8, B8: 1.5 },
  B8: { B5: 1.8, B7: 1.5, B9: 1.5 },
  B9: { B4: 1.8, B8: 1.5 },
};

// ─── State ───
let currentMode = "baseline"; // "baseline" | "optimized"
let bins = SAMPLE_BINS.map(
  (b) => new Bin(b.id, b.zoneName, b.capacity, b.x, b.y)
);

// ─── DOM References ───
const mapContainer     = document.getElementById("bin-nodes-container");
const roadEdgesGroup   = document.getElementById("road-edges");
const inventoryList    = document.getElementById("bin-inventory-list");
const btnBaseline      = document.getElementById("btn-baseline");
const btnOptimized     = document.getElementById("btn-optimized");
const mapModeLabel     = document.getElementById("map-mode-label");
const btnRun           = document.getElementById("btn-run-simulation");
const btnReset         = document.getElementById("btn-reset");
const btnEmptyAll      = document.getElementById("btn-empty-all");

// ═══════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════

/**
 * Determine bin status class from capacity percentage.
 */
function getStatusClass(capacity) {
  if (capacity >= 80) return "status-urgent";
  if (capacity >= 50) return "status-warning";
  return "status-safe";
}

/**
 * Get the dot color for the inventory list.
 */
function getStatusColor(capacity) {
  if (capacity >= 80) return "var(--color-urgent)";
  if (capacity >= 50) return "var(--color-warning)";
  return "var(--color-safe)";
}

/**
 * Get capacity text color for the inventory list.
 */
function getCapacityTextColor(capacity) {
  if (capacity >= 80) return "var(--color-urgent)";
  if (capacity >= 50) return "var(--color-warning)";
  return "var(--color-safe)";
}

/**
 * Render all bin nodes onto the city map.
 */
function renderBinNodes() {
  mapContainer.innerHTML = "";

  // Render depot
  const depotEl = document.createElement("div");
  depotEl.className = "bin-node depot-node";
  depotEl.style.left = `${DEPOT.x}px`;
  depotEl.style.top = `${DEPOT.y}px`;
  depotEl.innerHTML = `
    <span class="bin-icon">🏭</span>
    <span class="bin-label">DEPOT</span>
  `;
  mapContainer.appendChild(depotEl);

  // Render bins
  bins.forEach((bin) => {
    const status = getStatusClass(bin.capacity);
    const el = document.createElement("div");
    el.className = `bin-node ${status}`;
    el.id = `bin-node-${bin.id}`;
    el.style.left = `${bin.coordinates.x}px`;
    el.style.top = `${bin.coordinates.y}px`;
    el.dataset.binId = bin.id;

    el.innerHTML = `
      <span class="bin-capacity-badge">${bin.capacity}%</span>
      <span class="bin-icon">🗑️</span>
      <span class="bin-label">${bin.id}</span>
      <div class="bin-tooltip">
        <p style="font-size:11px; font-weight:700; color:#e5e7eb; margin:0 0 4px;">${bin.id} — ${bin.zoneName}</p>
        <p style="font-size:10px; color:#9ca3af; margin:0;">Capacity: <strong style="color:${getCapacityTextColor(bin.capacity)}">${bin.capacity}%</strong></p>
        <p style="font-size:9px; color:#6b7280; margin:2px 0 0;">Left-Click: +20%  ·  Right-Click: −20%</p>
      </div>
    `;

    // Interactive capacity control
    el.addEventListener("click", () => handleBinFill(bin.id));
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      handleBinEmpty(bin.id);
    });

    mapContainer.appendChild(el);
  });
}

/**
 * Draw road edges as SVG lines on the map.
 */
function renderRoadEdges() {
  roadEdgesGroup.innerHTML = "";

  const allNodes = { DEPOT, ...Object.fromEntries(bins.map((b) => [b.id, b])) };
  const drawnEdges = new Set();

  for (const [fromId, neighbors] of Object.entries(ROAD_NETWORK)) {
    for (const [toId, dist] of Object.entries(neighbors)) {
      const edgeKey = [fromId, toId].sort().join("-");
      if (drawnEdges.has(edgeKey)) continue;
      drawnEdges.add(edgeKey);

      const fromNode = fromId === "DEPOT" ? DEPOT : bins.find((b) => b.id === fromId);
      const toNode   = toId === "DEPOT"   ? DEPOT : bins.find((b) => b.id === toId);

      if (!fromNode || !toNode) continue;

      const x1 = fromId === "DEPOT" ? fromNode.x : fromNode.coordinates.x;
      const y1 = fromId === "DEPOT" ? fromNode.y : fromNode.coordinates.y;
      const x2 = toId === "DEPOT"   ? toNode.x   : toNode.coordinates.x;
      const y2 = toId === "DEPOT"   ? toNode.y   : toNode.coordinates.y;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      roadEdgesGroup.appendChild(line);

      // Distance label (midpoint)
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", mx);
      text.setAttribute("y", my - 6);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#4b5563");
      text.setAttribute("font-size", "9");
      text.setAttribute("font-family", "'JetBrains Mono', monospace");
      text.textContent = `${dist}km`;
      roadEdgesGroup.appendChild(text);
    }
  }
}

/**
 * Render the sidebar inventory list.
 */
function renderInventoryList() {
  inventoryList.innerHTML = "";

  bins.forEach((bin) => {
    const li = document.createElement("li");
    li.className = "bin-inventory-item";
    li.innerHTML = `
      <span class="inv-dot" style="background:${getStatusColor(bin.capacity)}"></span>
      <span class="inv-id">${bin.id}</span>
      <span class="inv-zone">${bin.zoneName}</span>
      <span class="inv-pct" style="color:${getCapacityTextColor(bin.capacity)}">${bin.capacity}%</span>
    `;
    inventoryList.appendChild(li);
  });
}

/**
 * Full re-render of all dynamic UI.
 */
function renderAll() {
  renderBinNodes();
  renderRoadEdges();
  renderInventoryList();
}

// ═══════════════════════════════════════════
// INTERACTIONS
// ═══════════════════════════════════════════

/**
 * Handle Left-Click: increase bin capacity by +20% (max 100%).
 */
function handleBinFill(binId) {
  const bin = bins.find((b) => b.id === binId);
  if (!bin) return;

  bin.capacity = Math.min(100, bin.capacity + 20);
  bin.isUrgent = bin.capacity >= 80;

  renderAll();
}

/**
 * Handle Right-Click: decrease bin capacity by -20% (min 0%).
 */
function handleBinEmpty(binId) {
  const bin = bins.find((b) => b.id === binId);
  if (!bin) return;

  bin.capacity = Math.max(0, bin.capacity - 20);
  bin.isUrgent = bin.capacity >= 80;

  renderAll();
}

/**
 * Switch between Baseline and Optimized modes.
 */
function setMode(mode) {
  currentMode = mode;

  // Update toggle buttons
  btnBaseline.classList.toggle("active", mode === "baseline");
  btnOptimized.classList.toggle("active", mode === "optimized");

  // Update map label
  if (mode === "baseline") {
    mapModeLabel.textContent = "BASELINE MODE";
    mapModeLabel.className = "text-[11px] font-mono text-urgent bg-urgent/10 border border-urgent/20 px-2.5 py-0.5 rounded-full";
  } else {
    mapModeLabel.textContent = "OPTIMIZED MODE";
    mapModeLabel.className = "text-[11px] font-mono text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full";
  }
}

/**
 * Reset all bins to their original sample data.
 */
function resetBins() {
  bins = SAMPLE_BINS.map(
    (b) => new Bin(b.id, b.zoneName, b.capacity, b.x, b.y)
  );
  renderAll();

  // Reset metrics to placeholder
  document.getElementById("metric-baseline-bins").textContent = "—";
  document.getElementById("metric-optimized-bins").textContent = "—";
  document.getElementById("metric-baseline-dist").textContent = "—";
  document.getElementById("metric-optimized-dist").textContent = "—";
  document.getElementById("metric-baseline-cost").textContent = "—";
  document.getElementById("metric-optimized-cost").textContent = "—";
  document.getElementById("savings-badge").classList.add("hidden");
}

/**
 * Empty all bins — set every bin's capacity to 0% and clear urgent status.
 */
function emptyAllBins() {
  bins.forEach((bin) => {
    bin.capacity = 0;
    bin.isUrgent = false;
  });
  renderAll();
}

// ═══════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════

btnBaseline.addEventListener("click", () => setMode("baseline"));
btnOptimized.addEventListener("click", () => setMode("optimized"));
btnReset.addEventListener("click", resetBins);
btnEmptyAll.addEventListener("click", emptyAllBins);

btnRun.addEventListener("click", () => {
  runSimulation(currentMode, bins, ROAD_NETWORK);
});

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

renderAll();
console.log("✅ Smart Waste Management Dashboard initialized.");
