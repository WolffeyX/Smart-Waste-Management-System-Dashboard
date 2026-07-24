/* ════════════════════════════════════════════════════════════
   datastructures.js — Custom Data Structure Implementations
   ════════════════════════════════════════════════════════════
   Course: TEB1113 - Algorithm and Data Structure
   All data structures are implemented from scratch as required
   by KIRO_SPEC.md. No external libraries used.
   ════════════════════════════════════════════════════════════ */

/**
 * Bin — Data model for a single garbage bin.
 */
class Bin {
  constructor(id, zoneName, capacity = 0, xCoord, yCoord) {
    this.id = id;               // e.g., "B1"
    this.zoneName = zoneName;   // e.g., "Jalan Merak 1"
    this.capacity = capacity;   // 0 – 100
    this.isUrgent = capacity >= 80;
    this.coordinates = { x: xCoord, y: yCoord };
  }
}


/* ════════════════════════════════════════════════════════════
   A. HASH TABLE — O(1) Bin Lookup by ID
   ════════════════════════════════════════════════════════════
   Uses separate chaining (linked-list buckets) for collision
   resolution. A prime-number table size and polynomial rolling
   hash reduce collision probability.
   ════════════════════════════════════════════════════════════ */

class HashTable {
  /**
   * @param {number} size - Number of buckets (prime recommended)
   */
  constructor(size = 53) {
    this.keyMap = new Array(size);
    this.size = size;
    this.count = 0;
  }

  /**
   * Polynomial rolling hash function.
   * Maps a string key to an index in [0, size).
   * @param {string} key
   * @returns {number} bucket index
   */
  _hash(key) {
    let total = 0;
    const PRIME = 31;
    for (let i = 0; i < Math.min(key.length, 100); i++) {
      const charCode = key.charCodeAt(i) - 96;
      total = (total * PRIME + charCode) % this.size;
    }
    return Math.abs(total);
  }

  /**
   * Insert a key-value pair. Updates value if key already exists.
   * Time: O(1) average
   * @param {string} key
   * @param {*} value
   */
  insert(key, value) {
    const index = this._hash(key);
    if (!this.keyMap[index]) {
      this.keyMap[index] = [];
    }
    // Check if key already exists — update in place
    for (let i = 0; i < this.keyMap[index].length; i++) {
      if (this.keyMap[index][i][0] === key) {
        this.keyMap[index][i][1] = value;
        return;
      }
    }
    // New key
    this.keyMap[index].push([key, value]);
    this.count++;
  }

  /**
   * Retrieve value by key.
   * Time: O(1) average
   * @param {string} key
   * @returns {*|null} value or null if not found
   */
  get(key) {
    const index = this._hash(key);
    if (this.keyMap[index]) {
      for (let i = 0; i < this.keyMap[index].length; i++) {
        if (this.keyMap[index][i][0] === key) {
          return this.keyMap[index][i][1];
        }
      }
    }
    return null;
  }

  /**
   * Remove a key-value pair by key.
   * Time: O(1) average
   * @param {string} key
   * @returns {boolean} true if removed, false if not found
   */
  remove(key) {
    const index = this._hash(key);
    if (this.keyMap[index]) {
      for (let i = 0; i < this.keyMap[index].length; i++) {
        if (this.keyMap[index][i][0] === key) {
          this.keyMap[index].splice(i, 1);
          this.count--;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Return all keys stored in the hash table.
   * @returns {string[]}
   */
  keys() {
    const allKeys = [];
    for (let i = 0; i < this.size; i++) {
      if (this.keyMap[i]) {
        for (let j = 0; j < this.keyMap[i].length; j++) {
          allKeys.push(this.keyMap[i][j][0]);
        }
      }
    }
    return allKeys;
  }

  /**
   * Return all values stored in the hash table.
   * @returns {Array}
   */
  values() {
    const allValues = [];
    for (let i = 0; i < this.size; i++) {
      if (this.keyMap[i]) {
        for (let j = 0; j < this.keyMap[i].length; j++) {
          allValues.push(this.keyMap[i][j][1]);
        }
      }
    }
    return allValues;
  }
}


/* ════════════════════════════════════════════════════════════
   B. PRIORITY QUEUE — Max-Heap by Bin Capacity
   ════════════════════════════════════════════════════════════
   A binary Max-Heap where the element with the HIGHEST
   priority (capacity %) is always at the root.
   - enqueue: O(log n)  — insert + bubble up
   - dequeue: O(log n)  — extract max + sink down
   ════════════════════════════════════════════════════════════ */

class PriorityQueue {
  constructor() {
    this.heap = []; // Array of { element, priority }
  }

  /**
   * Insert an element with a given priority.
   * Time: O(log n)
   * @param {*} element - The item (e.g., a Bin object)
   * @param {number} priority - Numeric priority (higher = more urgent)
   */
  enqueue(element, priority) {
    const node = { element, priority };
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the element with the highest priority.
   * Time: O(log n)
   * @returns {*|null} The element, or null if empty
   */
  dequeue() {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return max.element;
  }

  /**
   * View the highest-priority element without removing it.
   * @returns {*|null}
   */
  peek() {
    return this.heap.length > 0 ? this.heap[0].element : null;
  }

  /**
   * Check if the heap is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Return the number of elements in the heap.
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  /**
   * Bubble up: swap the node at `index` with its parent
   * while it has a higher priority than its parent.
   * @param {number} index
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.heap[index].priority <= this.heap[parentIdx].priority) break;
      // Swap
      [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
      index = parentIdx;
    }
  }

  /**
   * Sink down: swap the node at `index` with its largest child
   * while it has a lower priority than that child.
   * @param {number} index
   */
  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      const leftIdx = 2 * index + 1;
      const rightIdx = 2 * index + 2;
      let swapIdx = null;

      if (leftIdx < length) {
        if (this.heap[leftIdx].priority > this.heap[index].priority) {
          swapIdx = leftIdx;
        }
      }
      if (rightIdx < length) {
        if (
          (swapIdx === null && this.heap[rightIdx].priority > this.heap[index].priority) ||
          (swapIdx !== null && this.heap[rightIdx].priority > this.heap[leftIdx].priority)
        ) {
          swapIdx = rightIdx;
        }
      }
      if (swapIdx === null) break;
      [this.heap[index], this.heap[swapIdx]] = [this.heap[swapIdx], this.heap[index]];
      index = swapIdx;
    }
  }
}


/* ════════════════════════════════════════════════════════════
   C. QUEUE — Standard FIFO (Linked-List backed)
   ════════════════════════════════════════════════════════════
   Uses a singly-linked list so that enqueue and dequeue are
   both O(1) — no array shifting required.
   Represents the Baseline Approach: visit ALL bins in order.
   ════════════════════════════════════════════════════════════ */

/** Internal node for the linked-list Queue */
class QueueNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class Queue {
  constructor() {
    this.first = null;  // head (dequeue end)
    this.last = null;   // tail (enqueue end)
    this.length = 0;
  }

  /**
   * Add an element to the back of the queue.
   * Time: O(1)
   * @param {*} element
   */
  enqueue(element) {
    const node = new QueueNode(element);
    if (this.length === 0) {
      this.first = node;
      this.last = node;
    } else {
      this.last.next = node;
      this.last = node;
    }
    this.length++;
  }

  /**
   * Remove and return the element at the front of the queue.
   * Time: O(1)
   * @returns {*|null}
   */
  dequeue() {
    if (this.length === 0) return null;
    const removed = this.first;
    this.first = this.first.next;
    if (this.length === 1) {
      this.last = null;
    }
    this.length--;
    return removed.value;
  }

  /**
   * View the front element without removing it.
   * @returns {*|null}
   */
  peek() {
    return this.first ? this.first.value : null;
  }

  /**
   * Check if the queue is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this.length === 0;
  }

  /**
   * Return the current number of elements.
   * @returns {number}
   */
  size() {
    return this.length;
  }

  /**
   * Convert queue contents to an array (for display/debug).
   * @returns {Array}
   */
  toArray() {
    const arr = [];
    let current = this.first;
    while (current) {
      arr.push(current.value);
      current = current.next;
    }
    return arr;
  }
}


/* ════════════════════════════════════════════════════════════
   D. GRAPH — Weighted Adjacency List + Dijkstra's Algorithm
   ════════════════════════════════════════════════════════════
   Nodes = Garbage Bins / Depot
   Edges = Road distances (km)
   dijkstra() returns the shortest path and total distance.
   ════════════════════════════════════════════════════════════ */

/**
 * A minimal Priority Queue (Min-Heap) used internally by
 * Dijkstra's algorithm. Separate from the Max-Heap PriorityQueue
 * above because Dijkstra needs the SMALLEST distance first.
 */
class MinPriorityQueue {
  constructor() {
    this.heap = [];
  }

  enqueue(element, priority) {
    this.heap.push({ element, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIdx].priority) break;
      [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
      index = parentIdx;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      const leftIdx = 2 * index + 1;
      const rightIdx = 2 * index + 2;
      let swapIdx = null;

      if (leftIdx < length) {
        if (this.heap[leftIdx].priority < this.heap[index].priority) {
          swapIdx = leftIdx;
        }
      }
      if (rightIdx < length) {
        if (
          (swapIdx === null && this.heap[rightIdx].priority < this.heap[index].priority) ||
          (swapIdx !== null && this.heap[rightIdx].priority < this.heap[leftIdx].priority)
        ) {
          swapIdx = rightIdx;
        }
      }
      if (swapIdx === null) break;
      [this.heap[index], this.heap[swapIdx]] = [this.heap[swapIdx], this.heap[index]];
      index = swapIdx;
    }
  }
}

class Graph {
  constructor() {
    this.adjacencyList = {};
  }

  /**
   * Add a vertex (node) to the graph.
   * @param {string} vertex - e.g., "B1", "DEPOT"
   */
  addVertex(vertex) {
    if (!this.adjacencyList[vertex]) {
      this.adjacencyList[vertex] = [];
    }
  }

  /**
   * Add a weighted undirected edge between two vertices.
   * @param {string} v1
   * @param {string} v2
   * @param {number} weight - distance in km
   */
  addEdge(v1, v2, weight) {
    this.addVertex(v1);
    this.addVertex(v2);
    this.adjacencyList[v1].push({ node: v2, weight });
    this.adjacencyList[v2].push({ node: v1, weight });
  }

  /**
   * Get all neighbours of a vertex.
   * @param {string} vertex
   * @returns {Array<{node: string, weight: number}>}
   */
  getNeighbors(vertex) {
    return this.adjacencyList[vertex] || [];
  }

  /**
   * Get all vertices in the graph.
   * @returns {string[]}
   */
  getVertices() {
    return Object.keys(this.adjacencyList);
  }

  /**
   * Dijkstra's shortest-path algorithm.
   * Time: O((V + E) log V) with a binary heap.
   *
   * @param {string} start - Starting vertex ID
   * @param {string} end   - Destination vertex ID
   * @returns {{ path: string[], distance: number }}
   */
  dijkstra(start, end) {
    const distances = {};
    const previous = {};
    const pq = new MinPriorityQueue();

    // Initialise all distances to Infinity
    for (const vertex in this.adjacencyList) {
      if (vertex === start) {
        distances[vertex] = 0;
        pq.enqueue(vertex, 0);
      } else {
        distances[vertex] = Infinity;
        pq.enqueue(vertex, Infinity);
      }
      previous[vertex] = null;
    }

    // Process vertices
    while (!pq.isEmpty()) {
      const current = pq.dequeue().element;

      // Early exit if we reached the destination
      if (current === end) break;

      if (distances[current] === Infinity) continue;

      for (const neighbor of this.adjacencyList[current]) {
        const candidate = distances[current] + neighbor.weight;
        if (candidate < distances[neighbor.node]) {
          distances[neighbor.node] = candidate;
          previous[neighbor.node] = current;
          pq.enqueue(neighbor.node, candidate);
        }
      }
    }

    // Reconstruct path from end → start
    const path = [];
    let current = end;
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }

    // If start isn't reachable, return empty
    if (path[0] !== start) {
      return { path: [], distance: Infinity };
    }

    return {
      path,
      distance: Math.round(distances[end] * 100) / 100,
    };
  }

  /**
   * Build a Graph instance from a ROAD_NETWORK adjacency object.
   * @param {Object} network - e.g., { DEPOT: { B1: 2.0 }, B1: { DEPOT: 2.0, B2: 1.5 }, ... }
   * @returns {Graph}
   */
  static fromNetwork(network) {
    const g = new Graph();
    const addedEdges = new Set();
    for (const from in network) {
      g.addVertex(from);
      for (const to in network[from]) {
        const edgeKey = [from, to].sort().join("-");
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey);
          g.addEdge(from, to, network[from][to]);
        }
      }
    }
    return g;
  }
}


/* ════════════════════════════════════════════════════════════
   UNIT TESTS — Console verification
   ════════════════════════════════════════════════════════════
   These run on file load and print results to the browser
   console. Open DevTools (F12) → Console to view.
   ════════════════════════════════════════════════════════════ */

(function runUnitTests() {
  console.group("🧪 DATA STRUCTURE UNIT TESTS");

  // ──── Hash Table ────
  console.group("📦 HashTable — O(1) Lookup");

  const ht = new HashTable(53);
  const testBin = new Bin("B1", "Jalan Merak 1", 85, 100, 100);
  ht.insert("B1", testBin);
  ht.insert("B2", new Bin("B2", "Jalan Merak 2", 20, 250, 100));
  ht.insert("B3", new Bin("B3", "Jalan Merak 3", 45, 400, 100));

  const lookupResult = ht.get("B1");
  console.assert(lookupResult !== null, "FAIL: get('B1') returned null");
  console.assert(lookupResult.id === "B1", "FAIL: get('B1').id !== 'B1'");
  console.assert(lookupResult.capacity === 85, "FAIL: get('B1').capacity !== 85");
  console.log("✅ insert() + get() — O(1) lookup verified:", lookupResult);

  // Update existing key
  ht.insert("B1", new Bin("B1", "Jalan Merak 1", 95, 100, 100));
  console.assert(ht.get("B1").capacity === 95, "FAIL: update via insert() didn't work");
  console.log("✅ insert() update existing key — capacity updated to 95");

  // Remove
  console.assert(ht.remove("B2") === true, "FAIL: remove('B2') returned false");
  console.assert(ht.get("B2") === null, "FAIL: get('B2') should return null after remove");
  console.log("✅ remove() — key 'B2' deleted, get returns null");

  // Non-existent key
  console.assert(ht.get("B999") === null, "FAIL: get('B999') should return null");
  console.log("✅ get() non-existent key — returns null");

  // Keys
  const keys = ht.keys();
  console.log("✅ keys():", keys);

  console.groupEnd();

  // ──── Priority Queue (Max-Heap) ────
  console.group("⏫ PriorityQueue — O(log n) Max-Heap");

  const pq = new PriorityQueue();
  pq.enqueue("B1", 20);
  pq.enqueue("B2", 85);
  pq.enqueue("B3", 45);
  pq.enqueue("B4", 90);
  pq.enqueue("B8", 95);
  pq.enqueue("B5", 10);

  console.assert(pq.peek() === "B8", "FAIL: peek should return 'B8' (highest priority 95)");
  console.log("✅ peek() — highest priority element is 'B8' (95%)");

  const first = pq.dequeue();
  console.assert(first === "B8", "FAIL: first dequeue should be 'B8'");
  console.log("✅ dequeue() #1 — extracted 'B8' (95%)");

  const second = pq.dequeue();
  console.assert(second === "B4", "FAIL: second dequeue should be 'B4'");
  console.log("✅ dequeue() #2 — extracted 'B4' (90%)");

  const third = pq.dequeue();
  console.assert(third === "B2", "FAIL: third dequeue should be 'B2'");
  console.log("✅ dequeue() #3 — extracted 'B2' (85%)");

  console.log(`✅ Remaining heap size: ${pq.size()} (should be 3)`);
  console.assert(pq.size() === 3, "FAIL: size should be 3");

  console.groupEnd();

  // ──── FIFO Queue ────
  console.group("📋 Queue — O(1) FIFO (Linked List)");

  const q = new Queue();
  q.enqueue("B1");
  q.enqueue("B2");
  q.enqueue("B3");
  q.enqueue("B4");

  console.assert(q.peek() === "B1", "FAIL: peek should be 'B1'");
  console.log("✅ peek() — front is 'B1'");

  console.assert(q.size() === 4, "FAIL: size should be 4");
  console.log("✅ size() — 4 elements");

  const d1 = q.dequeue();
  console.assert(d1 === "B1", "FAIL: first dequeue should be 'B1'");
  console.log("✅ dequeue() #1 — 'B1' (FIFO order)");

  const d2 = q.dequeue();
  console.assert(d2 === "B2", "FAIL: second dequeue should be 'B2'");
  console.log("✅ dequeue() #2 — 'B2' (FIFO order)");

  console.log("✅ toArray():", q.toArray(), "(remaining: B3, B4)");

  console.assert(q.isEmpty() === false, "FAIL: queue should not be empty");
  q.dequeue(); q.dequeue();
  console.assert(q.isEmpty() === true, "FAIL: queue should be empty after draining");
  console.log("✅ isEmpty() — true after draining all elements");

  console.groupEnd();

  // ──── Graph + Dijkstra ────
  console.group("🗺️ Graph — Dijkstra's Shortest Path O((V+E) log V)");

  const ROAD_NETWORK_TEST = {
    DEPOT: { B1: 2.0, B4: 2.5 },
    B1: { DEPOT: 2.0, B2: 1.5, B4: 1.8 },
    B2: { B1: 1.5, B3: 1.5, B5: 1.8 },
    B3: { B2: 1.5, B6: 2.0 },
    B4: { DEPOT: 2.5, B1: 1.8, B5: 1.5, B7: 1.8 },
    B5: { B2: 1.8, B4: 1.5, B6: 1.5, B8: 1.8 },
    B6: { B3: 2.0, B5: 1.5, B9: 1.8 },
    B7: { B4: 1.8, B8: 1.5 },
    B8: { B5: 1.8, B7: 1.5, B9: 1.5 },
    B9: { B6: 1.8, B8: 1.5 },
  };

  const graph = Graph.fromNetwork(ROAD_NETWORK_TEST);

  console.log("✅ Graph vertices:", graph.getVertices());
  console.log("✅ DEPOT neighbors:", graph.getNeighbors("DEPOT"));

  // Shortest path: DEPOT → B8
  const route1 = graph.dijkstra("DEPOT", "B8");
  console.log(`✅ Dijkstra DEPOT → B8: path = [${route1.path}], distance = ${route1.distance} km`);
  console.assert(route1.path[0] === "DEPOT", "FAIL: path should start at DEPOT");
  console.assert(route1.path[route1.path.length - 1] === "B8", "FAIL: path should end at B8");

  // Shortest path: DEPOT → B9
  const route2 = graph.dijkstra("DEPOT", "B9");
  console.log(`✅ Dijkstra DEPOT → B9: path = [${route2.path}], distance = ${route2.distance} km`);

  // Shortest path: DEPOT → B6
  const route3 = graph.dijkstra("DEPOT", "B6");
  console.log(`✅ Dijkstra DEPOT → B6: path = [${route3.path}], distance = ${route3.distance} km`);

  // Edge case: same start and end
  const routeSelf = graph.dijkstra("DEPOT", "DEPOT");
  console.assert(routeSelf.distance === 0, "FAIL: DEPOT→DEPOT distance should be 0");
  console.log(`✅ Dijkstra DEPOT → DEPOT: distance = ${routeSelf.distance} km (self-route)`);

  console.groupEnd();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 All data structure unit tests completed!");
  console.groupEnd();
})();
