/* ════════════════════════════════════════════════════════════
   simulation.js — Simulation Logic & Truck Animation
   ════════════════════════════════════════════════════════════
   Contains:
   1. animateTruck()   — 2D truck movement along route path
   2. runSimulation()  — Core simulation orchestrator for both
                         Baseline (FIFO Queue) and Optimized
                         (PriorityQueue + Dijkstra) modes
   ════════════════════════════════════════════════════════════ */

// ─── Fuel cost constant (RM per km) ───
const FUEL_COST_PER_KM = 1.20;

// ─── Simulation lock to prevent overlapping runs ───
let isSimulationRunning = false;

/**
 * Animate the truck element along a route path.
 * Uses HashTable O(1) lookups to get coordinates for each stop.
 *
 * @param {string[]} routePath - Ordered array of node IDs (e.g., ["DEPOT", "B4", "B8", ...])
 * @param {HashTable} hashTable - HashTable instance containing all nodes with coordinates
 */
async function animateTruck(routePath, hashTable) {
  const truck = document.querySelector('#truck');

  if (!truck) {
    console.error("❌ Truck element #truck not found in DOM!");
    return;
  }

  // Move truck through each waypoint
  for (let binId of routePath) {
    const targetNode = hashTable.get(binId); // O(1) lookup

    if (targetNode && targetNode.coordinates) {
      truck.style.left = `${targetNode.coordinates.x}px`;
      truck.style.top = `${targetNode.coordinates.y}px`;

      // Wait 1.5s (1s CSS transition + 0.5s dwell time)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}


/* ════════════════════════════════════════════════════════════
   runSimulation() — Main Simulation Orchestrator
   ════════════════════════════════════════════════════════════ */

/**
 * Run the waste collection simulation for the given mode.
 *
 * @param {"baseline"|"optimized"} mode - Which algorithm to use
 * @param {Bin[]} binsArray - Array of current Bin objects
 * @param {Object} roadNetwork - Adjacency list object (ROAD_NETWORK)
 */
async function runSimulation(mode, binsArray, roadNetwork) {
  // Prevent overlapping runs
  if (isSimulationRunning) {
    console.warn("⚠️ Simulation already running. Please wait.");
    return;
  }
  isSimulationRunning = true;

  console.group(`🚛 Running ${mode.toUpperCase()} Simulation`);

  // ─── 1. Build Graph from road network ───
  const graph = Graph.fromNetwork(roadNetwork);
  console.log("✅ Graph built:", graph.getVertices().length, "vertices");

  // ─── 2. Build HashTable for O(1) coordinate lookups ───
  const hashTable = new HashTable(53);

  // Insert all bins
  for (const bin of binsArray) {
    hashTable.insert(bin.id, bin);
  }

  // Insert DEPOT with normalized coordinates property
  hashTable.insert("DEPOT", {
    id: "DEPOT",
    zoneName: "Truck Depot",
    capacity: 0,
    coordinates: { x: 50, y: 50 },
  });
  console.log("✅ HashTable populated:", hashTable.count, "entries (incl. DEPOT)");

  // ─── 3. Compute route based on mode ───
  let fullRouteArray = [];
  let totalDistance = 0;
  let binsVisited = 0;

  if (mode === "baseline") {
    // ═══ BASELINE MODE: FIFO Queue — visit ALL bins ═══
    const fifoQueue = new Queue();

    // Enqueue all bins in fixed order (B1 → B9)
    const sortedBins = [...binsArray].sort((a, b) => {
      const numA = parseInt(a.id.replace("B", ""));
      const numB = parseInt(b.id.replace("B", ""));
      return numA - numB;
    });
    for (const bin of sortedBins) {
      fifoQueue.enqueue(bin.id);
    }

    console.log("📋 Baseline Queue (FIFO):", fifoQueue.toArray());

    // Build route: DEPOT → B1 → B2 → ... → B9 → DEPOT
    fullRouteArray.push("DEPOT");
    let currentNode = "DEPOT";

    while (!fifoQueue.isEmpty()) {
      const nextBinId = fifoQueue.dequeue();
      const segment = graph.dijkstra(currentNode, nextBinId);

      if (segment.path.length > 0) {
        totalDistance += segment.distance;
        // Append path, skip the first node to avoid duplicate with current position
        for (let i = 1; i < segment.path.length; i++) {
          fullRouteArray.push(segment.path[i]);
        }
      }
      currentNode = nextBinId;
    }

    // Return to DEPOT
    const returnSegment = graph.dijkstra(currentNode, "DEPOT");
    if (returnSegment.path.length > 0) {
      totalDistance += returnSegment.distance;
      for (let i = 1; i < returnSegment.path.length; i++) {
        fullRouteArray.push(returnSegment.path[i]);
      }
    }

    binsVisited = binsArray.length; // Baseline visits ALL bins
    console.log(`📊 Baseline: ${binsVisited} bins, ${totalDistance.toFixed(2)} km`);

  } else {
    // ═══ OPTIMIZED MODE: Priority Queue — visit ONLY urgent bins (≥80%) ═══
    const pq = new PriorityQueue();

    // Enqueue only urgent bins (capacity >= 80%), priority = capacity
    for (const bin of binsArray) {
      if (bin.capacity >= 80) {
        pq.enqueue(bin.id, bin.capacity);
      }
    }

    if (pq.isEmpty()) {
      console.warn("⚠️ No urgent bins (≥80%) to collect! Simulation skipped.");
      isSimulationRunning = false;
      console.groupEnd();
      return;
    }

    console.log(`⏫ Optimized PQ: ${pq.size()} urgent bins queued`);

    // Build route: DEPOT → highest priority → next → ... → DEPOT
    fullRouteArray.push("DEPOT");
    let currentNode = "DEPOT";

    while (!pq.isEmpty()) {
      const nextBinId = pq.dequeue(); // Extracts highest capacity first
      const segment = graph.dijkstra(currentNode, nextBinId);

      if (segment.path.length > 0) {
        totalDistance += segment.distance;
        for (let i = 1; i < segment.path.length; i++) {
          fullRouteArray.push(segment.path[i]);
        }
      }
      binsVisited++;
      currentNode = nextBinId;
    }

    // Return to DEPOT
    const returnSegment = graph.dijkstra(currentNode, "DEPOT");
    if (returnSegment.path.length > 0) {
      totalDistance += returnSegment.distance;
      for (let i = 1; i < returnSegment.path.length; i++) {
        fullRouteArray.push(returnSegment.path[i]);
      }
    }

    console.log(`📊 Optimized: ${binsVisited} bins, ${totalDistance.toFixed(2)} km`);
  }

  // Round distance for display
  totalDistance = Math.round(totalDistance * 100) / 100;
  const fuelCost = Math.round(totalDistance * FUEL_COST_PER_KM * 100) / 100;

  console.log("🛣️ Full route:", fullRouteArray.join(" → "));
  console.log(`💰 Fuel cost: RM ${fuelCost}`);

  // ─── 4. Render Route SVG ───
  renderRouteSVG(fullRouteArray, hashTable, mode);

  // ─── 5. Update Live Metrics ───
  updateMetrics(mode, binsVisited, totalDistance, fuelCost, binsArray);

  // ─── 6. Animate Truck ───
  console.log("🚛 Starting truck animation...");
  await animateTruck(fullRouteArray, hashTable);
  console.log("✅ Simulation complete!");

  console.groupEnd();
  isSimulationRunning = false;
}


/* ════════════════════════════════════════════════════════════
   renderRouteSVG() — Draw the active route path on the map
   ════════════════════════════════════════════════════════════ */

/**
 * Draw SVG lines connecting consecutive nodes in the route.
 *
 * @param {string[]} routeArray - Ordered node IDs
 * @param {HashTable} hashTable - For coordinate lookups
 * @param {"baseline"|"optimized"} mode - Determines styling
 */
function renderRouteSVG(routeArray, hashTable, mode) {
  const routePathGroup = document.getElementById("route-path");
  const routeSvg = document.getElementById("route-svg");

  // Clear previous route
  routePathGroup.innerHTML = "";

  // Apply or remove baseline class for red styling
  if (mode === "baseline") {
    routeSvg.classList.add("route-baseline");
  } else {
    routeSvg.classList.remove("route-baseline");
  }

  // Draw lines between consecutive waypoints
  for (let i = 0; i < routeArray.length - 1; i++) {
    const fromNode = hashTable.get(routeArray[i]);
    const toNode = hashTable.get(routeArray[i + 1]);

    if (!fromNode || !toNode) continue;
    if (!fromNode.coordinates || !toNode.coordinates) continue;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fromNode.coordinates.x);
    line.setAttribute("y1", fromNode.coordinates.y);
    line.setAttribute("x2", toNode.coordinates.x);
    line.setAttribute("y2", toNode.coordinates.y);
    routePathGroup.appendChild(line);
  }

  console.log(`🗺️ Route SVG rendered (${routeArray.length - 1} segments, mode: ${mode})`);
}


/* ════════════════════════════════════════════════════════════
   updateMetrics() — Populate the Live Metrics panel
   ════════════════════════════════════════════════════════════ */

/**
 * Update the metrics panel DOM elements for the current mode.
 * Stores results persistently so both columns can display.
 *
 * @param {"baseline"|"optimized"} mode
 * @param {number} binsVisited
 * @param {number} totalDistance
 * @param {number} fuelCost
 * @param {Bin[]} binsArray - For calculating potential savings
 */

// Persistent storage for cross-mode comparison
const simulationResults = {
  baseline: null,
  optimized: null,
};

function updateMetrics(mode, binsVisited, totalDistance, fuelCost, binsArray) {
  // Store this run's results
  simulationResults[mode] = { binsVisited, totalDistance, fuelCost };

  // Update the correct column
  if (mode === "baseline") {
    document.getElementById("metric-baseline-bins").textContent = binsVisited;
    document.getElementById("metric-baseline-dist").textContent = totalDistance.toFixed(2);
    document.getElementById("metric-baseline-cost").textContent = fuelCost.toFixed(2);
  } else {
    document.getElementById("metric-optimized-bins").textContent = binsVisited;
    document.getElementById("metric-optimized-dist").textContent = totalDistance.toFixed(2);
    document.getElementById("metric-optimized-cost").textContent = fuelCost.toFixed(2);
  }

  // Calculate and show savings when both modes have results
  const savingsBadge = document.getElementById("savings-badge");
  const savingsPercent = document.getElementById("savings-percent");

  if (simulationResults.baseline && simulationResults.optimized) {
    const baselineCost = simulationResults.baseline.fuelCost;
    const optimizedCost = simulationResults.optimized.fuelCost;

    if (baselineCost > 0) {
      const savings = ((baselineCost - optimizedCost) / baselineCost) * 100;
      savingsPercent.textContent = `${Math.round(savings)}%`;
      savingsBadge.classList.remove("hidden");
    }
  } else if (mode === "optimized" && simulationResults.baseline === null) {
    // Show savings badge using an estimate if only optimized has run
    // Use total bins as a rough proxy for baseline distance
    savingsBadge.classList.add("hidden");
  }
}