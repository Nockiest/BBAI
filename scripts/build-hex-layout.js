// scripts/build-hex-layout.js
// Runs at build time, after scripts/fetch-data.js:
//   reads data.json (sitting deputies per region) + scripts/data/cz-kraje.json
//   (simplified region boundaries) and writes hex-layout.json — one hex per
//   sitting deputy, arranged in the shape of Czechia, with each region's hexes
//   placed where that region really is.
//
// How the layout is made:
//   1. Pick a hex size so that about as many hex centres fall inside Czechia
//      as there are deputies (N), then take every hex inside the border plus a
//      thin ring just outside it as candidate cells.
//   2. Give region R exactly as many slots as it has deputies, and solve an
//      optimal assignment (Hungarian algorithm) of slots → cells, where a cell's
//      cost for region R grows with its distance from R's real boundary and,
//      mildly, from R's centre; cells outside the border carry a penalty. Leftover
//      candidate cells simply stay empty. Small but populous regions (Praha) grow
//      outwards and push their neighbours along, which keeps everything roughly
//      in place.
//
// The front end (overview.html) puts each region's deputies into that region's
// cells. Rerun whenever the number of sitting deputies per region changes —
// `npm run build` / `bun run dev` do this automatically.
//
// Hexes are pointy-top in axial coordinates (q, r): pixel x = √3·(q + r/2),
// y = 1.5·r (unit hex radius, y pointing south).

import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('data.json', 'utf8'));
const geo  = JSON.parse(readFileSync(new URL('./data/cz-kraje.json', import.meta.url), 'utf8'));

// ── Projection: lon/lat → roughly equal-distance plane (x east, y south) ────────
const K = Math.cos(49.8 * Math.PI / 180);
const proj = ([lon, lat]) => [lon * K, -lat];

const regions = geo.regions.map(r => {
  const rings = r.rings.map(ring => ring.map(proj));
  // Area-weighted centroid of the outer ring.
  const o = rings[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < o.length - 1; i++) {
    const [x1, y1] = o[i], [x2, y2] = o[i + 1];
    const c = x1 * y2 - x2 * y1;
    a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
  }
  return { name: r.name, rings, centroid: [cx / (3 * a), cy / (3 * a)] };
});

// Even-odd point-in-polygon over all rings (so Středočeský's Praha hole works).
function inside(pt, rings) {
  let inn = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > pt[1]) !== (yj > pt[1]) &&
          pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inn = !inn;
    }
  }
  return inn;
}
function distToRings(pt, rings) {
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, ay] = ring[i], [bx, by] = ring[i + 1];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      let t = L ? ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / L : 0;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(pt[0] - ax - t * dx, pt[1] - ay - t * dy));
    }
  }
  return best;
}
const regionDist = (pt, reg) => (inside(pt, reg.rings) ? 0 : distToRings(pt, reg.rings));
const inCountry  = pt => regions.some(reg => inside(pt, reg.rings));

// ── Seats per region (sitting deputies only) ───────────────────────────────────
const seats = regions.map(reg =>
  (data.candidates[reg.name] || []).filter(c => c.current_mp).length);
const N = seats.reduce((a, b) => a + b, 0);
const unknown = Object.keys(data.candidates).filter(n => !regions.some(r => r.name === n));
if (unknown.length) console.warn(`hex layout: ignoring unknown region name(s): ${unknown.join(', ')}`);
if (!N) {
  console.warn('hex layout: no sitting deputies in data.json — writing an empty layout');
  writeFileSync('hex-layout.json', JSON.stringify({ size: 0, regions: {} }));
  process.exit(0);
}

// ── Hex grid over the country's bounding box ───────────────────────────────────
const all = regions.flatMap(r => r.rings[0]);
const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]));
const minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]));

function grid(s) {
  const cells = [];
  const rMin = Math.floor(minY / (1.5 * s)) - 2, rMax = Math.ceil(maxY / (1.5 * s)) + 2;
  for (let r = rMin; r <= rMax; r++) {
    const qMin = Math.floor(minX / (Math.sqrt(3) * s) - r / 2) - 2;
    const qMax = Math.ceil(maxX / (Math.sqrt(3) * s) - r / 2) + 2;
    for (let q = qMin; q <= qMax; q++) {
      const pt = [s * Math.sqrt(3) * (q + r / 2), s * 1.5 * r];
      cells.push({ q, r, pt, in: inCountry(pt) });
    }
  }
  return cells;
}

// Binary-search the hex size so the inside count is just at or above N.
let lo = 0.005, hi = 0.2, cells;
for (let i = 0; i < 40; i++) {
  const mid = (lo + hi) / 2;
  const n = grid(mid).filter(c => c.in).length;
  if (n >= N) lo = mid; else hi = mid;
}
const S = lo;
cells = grid(S);
// Candidates: inside cells + outside cells within ~one hex of the border.
const cand = cells.filter(c => c.in || Math.min(...regions.map(reg => distToRings(c.pt, reg.rings))) < S * 1.2);

// ── Cost: how badly a candidate cell fits region R ─────────────────────────────
// d = distance from R's real boundary (0 inside R), cd = distance from R's centre,
// both in hex sizes. See solve() for how they are weighted.
const slotRegion = [];
seats.forEach((n, ri) => { for (let k = 0; k < n; k++) slotRegion.push(ri); });
const baseCost = regions.map(reg => cand.map(c => ({
  d:   regionDist(c.pt, reg) / S,
  cd:  Math.hypot(c.pt[0] - reg.centroid[0], c.pt[1] - reg.centroid[1]) / S,
  out: !c.in,
})));

// Hungarian algorithm, n rows ≤ m columns (e-maxx formulation, 1-indexed).
function hungarian(n, m, a) {
  const u = new Float64Array(n + 1), v = new Float64Array(m + 1);
  const p = new Int32Array(m + 1), way = new Int32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(m + 1).fill(Infinity);
    const used = new Uint8Array(m + 1);
    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = a(i0 - 1, j - 1) - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const rowToCol = new Int32Array(n);
  for (let j = 1; j <= m; j++) if (p[j]) rowToCol[p[j] - 1] = j - 1;
  return rowToCol;
}

// ── Solve ──────────────────────────────────────────────────────────────────────
const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

// Names of regions whose cells form more than one connected piece.
function splitRegions(out) {
  const split = [];
  for (const [name, list] of Object.entries(out)) {
    if (!list.length) continue;
    const set = new Set(list.map(c => c.join(',')));
    const seen = new Set([list[0].join(',')]);
    const stack = [list[0]];
    while (stack.length) {
      const [q, r] = stack.pop();
      for (const [dq, dr] of NB) {
        const key = `${q + dq},${r + dr}`;
        if (set.has(key) && !seen.has(key)) { seen.add(key); stack.push([q + dq, r + dr]); }
      }
    }
    if (seen.size !== set.size) split.push(name);
  }
  return split;
}

// centreWeight: mild pull towards each region's centre (keeps regions compact).
// outsidePenalty: cost of using a cell outside the border (keeps the outline
// faithful), in hex-size² units.
function solve(centreWeight, outsidePenalty) {
  const cost = baseCost.map(row => row.map(x =>
    x.d * x.d + centreWeight * x.cd * x.cd + (x.out ? outsidePenalty : 0)));
  const assign = hungarian(slotRegion.length, cand.length, (i, j) => cost[slotRegion[i]][j]);
  const out = {};
  regions.forEach(r => { out[r.name] = []; });
  assign.forEach((j, i) => out[regions[slotRegion[i]].name].push([cand[j].q, cand[j].r]));
  // Reading order (north→south, west→east) so the front end fills hexes predictably.
  for (const k of Object.keys(out)) out[k].sort((a, b) => a[1] - b[1] || (a[0] + a[1] / 2) - (b[0] + b[1] / 2));
  return { out, split: splitRegions(out) };
}

// Which settings keep every region in one piece depends on the exact seat
// counts, so try a few (most faithful first) and keep the first clean result —
// or, if none is clean, the one with the fewest split regions.
const SETTINGS = [[0.06, 4], [0.06, 8], [0.08, 2], [0.1, 8], [0.04, 4], [0.12, 2], [0.05, 8], [0.1, 2]];
let best = null;
for (const [w, p] of SETTINGS) {
  const res = solve(w, p);
  if (!best || res.split.length < best.split.length) best = res;
  if (!res.split.length) break;
}
const out = best.out;
for (const name of best.split) console.warn(`hex layout: "${name}" is split into several pieces`);

writeFileSync('hex-layout.json', JSON.stringify({ regions: out }));
console.log(`hex-layout.json written: ${N} hexes across ${regions.filter((_, i) => seats[i]).length} regions`);
