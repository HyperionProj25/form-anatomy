/**
 * Builds src/data/geometry.json from public/body.glb by decoding every part's Draco geometry:
 * joint centres from bone landmarks, and the bone-surface point nearest each muscle for every
 * attachment pair. Runs offline; the JSON is committed like the catalog.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import draco3d from "draco3d";
import { attachmentIds } from "../src/data/attachments";
import { catalog, partForSide, parts, partsByKey } from "../src/data/catalog";
import type { CatalogPart, Vec3 } from "../src/data/types";

type Gltf = {
  nodes: { name: string; mesh?: number }[];
  meshes: {
    primitives: {
      extensions?: { KHR_draco_mesh_compression?: { bufferView: number; attributes: { POSITION: number } } };
    }[];
  }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
};

const root = resolve(import.meta.dirname, "..");
const raw = readFileSync(resolve(root, "public/body.glb"));
const jsonLength = raw.readUInt32LE(12);
const gltf = JSON.parse(raw.toString("utf8", 20, 20 + jsonLength)) as Gltf;
const binStart = 20 + jsonLength + 8;
const center = catalog.meta.modelCenter;
const meshByNode = new Map(gltf.nodes.filter((n) => n.mesh !== undefined).map((n) => [n.name, n.mesh!]));

const decoderModule = await draco3d.createDecoderModule({});
const decoder = new decoderModule.Decoder();

/** Vertex positions of a part in catalog space (model centred), x0 y0 z0 x1 y1 z1 ... */
function positionsOf(part: CatalogPart): Float32Array {
  const meshIndex = meshByNode.get(part.node);
  if (meshIndex === undefined) throw new Error(`No mesh for node ${part.node}`);
  const prim = gltf.meshes[meshIndex].primitives[0];
  const ext = prim.extensions?.KHR_draco_mesh_compression;
  if (!ext) throw new Error(`Mesh ${meshIndex} is not Draco compressed`);
  const bv = gltf.bufferViews[ext.bufferView];
  const start = binStart + (bv.byteOffset ?? 0);
  const bytes = new Uint8Array(raw.buffer, raw.byteOffset + start, bv.byteLength);
  const buffer = new decoderModule.DecoderBuffer();
  buffer.Init(bytes, bytes.length);
  const mesh = new decoderModule.Mesh();
  const status = decoder.DecodeBufferToMesh(buffer, mesh);
  if (!status.ok()) throw new Error(`Draco decode failed for ${part.node}: ${status.error_msg()}`);
  const attr = decoder.GetAttributeByUniqueId(mesh, ext.attributes.POSITION);
  const n = mesh.num_points();
  const arr = new decoderModule.DracoFloat32Array();
  decoder.GetAttributeFloatForAllPoints(mesh, attr, arr);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    out[i * 3] = arr.GetValue(i * 3) - center[0];
    out[i * 3 + 1] = arr.GetValue(i * 3 + 1) - center[1];
    out[i * 3 + 2] = arr.GetValue(i * 3 + 2) - center[2];
  }
  decoderModule.destroy(arr);
  decoderModule.destroy(mesh);
  decoderModule.destroy(buffer);
  return out;
}

const cache = new Map<string, Float32Array>();
const verts = (p: CatalogPart) => {
  let v = cache.get(p.id);
  if (!v) {
    v = positionsOf(p);
    cache.set(p.id, v);
  }
  return v;
};

const round = (v: number) => Math.round(v * 10000) / 10000;
const r3 = (v: Vec3): Vec3 => [round(v[0]), round(v[1]), round(v[2])];

/** Indices of vertices within `frac` of the y-range from the top (or bottom). */
function band(v: Float32Array, top: boolean, frac: number): number[] {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 1; i < v.length; i += 3) {
    if (v[i] < min) min = v[i];
    if (v[i] > max) max = v[i];
  }
  const cut = top ? max - (max - min) * frac : min + (max - min) * frac;
  const out: number[] = [];
  for (let i = 0; i < v.length; i += 3) if (top ? v[i + 1] >= cut : v[i + 1] <= cut) out.push(i);
  return out;
}

function centroid(v: Float32Array, idx: number[]): Vec3 {
  const c: Vec3 = [0, 0, 0];
  for (const i of idx) {
    c[0] += v[i];
    c[1] += v[i + 1];
    c[2] += v[i + 2];
  }
  return [c[0] / idx.length, c[1] / idx.length, c[2] / idx.length];
}

function extremeX(v: Float32Array, idx: number[], max: boolean): Vec3 {
  let best = idx[0];
  for (const i of idx) if (max ? v[i] > v[best] : v[i] < v[best]) best = i;
  return [v[best], v[best + 1], v[best + 2]];
}

const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

function bone(key: string, side: "left" | "right"): CatalogPart {
  const p = partForSide(key, side) ?? partsByKey(key)[0];
  if (!p) throw new Error(`Missing bone ${key} ${side}`);
  return p;
}

/** Joint centres from landmarks; see spec 12.1. */
function pivots() {
  const out: Record<string, { left: Vec3; right: Vec3 }> = {};
  for (const side of ["left", "right"] as const) {
    const set = (joint: string, p: Vec3) => {
      out[joint] ??= { left: [0, 0, 0], right: [0, 0, 0] };
      out[joint][side] = r3(p);
    };
    const hum = verts(bone("humerus", side));
    const fem = verts(bone("femur", side));
    const humBottom = band(hum, false, 0.08);
    set("elbow", mid(extremeX(hum, humBottom, true), extremeX(hum, humBottom, false)));
    const femBottom = band(fem, false, 0.08);
    set("knee", mid(extremeX(fem, femBottom, true), extremeX(fem, femBottom, false)));
    set("hip", centroid(fem, band(fem, true, 0.06)));
    set("shoulder", centroid(hum, band(hum, true, 0.06)));
    const tib = verts(bone("tibia", side));
    const fib = verts(bone("fibula", side));
    set("ankle", mid(centroid(tib, band(tib, false, 0.06)), centroid(fib, band(fib, false, 0.06))));
    const rad = verts(bone("radius", side));
    const uln = verts(bone("ulna", side));
    set("wrist", mid(centroid(rad, band(rad, false, 0.05)), centroid(uln, band(uln, false, 0.05))));
    const mand = verts(partsByKey("mandible")[0]);
    const top = band(mand, true, 0.05).filter((i) => (side === "left" ? mand[i] > 0 : mand[i] < 0));
    set("tmj", centroid(mand, top));
  }
  return out;
}

/** Evenly sampled vertex indices, at most `n`. */
function sample(v: Float32Array, n: number): number[] {
  const count = v.length / 3;
  const step = Math.max(1, Math.floor(count / n));
  const out: number[] = [];
  for (let i = 0; i < count; i += step) out.push(i * 3);
  return out;
}

/**
 * Indices of the muscle vertices in the end of the muscle that faces one attachment: the 30% with
 * the lowest projection on `dir` for the origin end, the highest for the insertion end. Using the
 * whole muscle would pick wherever it happens to run alongside the bone.
 */
function endBand(muscle: Float32Array, dir: Vec3, end: "origin" | "insertion"): number[] {
  const idx = sample(muscle, 2500);
  const proj = idx.map((i) => muscle[i] * dir[0] + muscle[i + 1] * dir[1] + muscle[i + 2] * dir[2]);
  const sorted = [...proj].sort((a, b) => a - b);
  const cut = sorted[Math.floor(sorted.length * (end === "origin" ? 0.3 : 0.7))];
  return idx.filter((_, k) => (end === "origin" ? proj[k] <= cut : proj[k] >= cut));
}

const CELL = 0.01;

/** Uniform grid over a bone's vertices for exact nearest-vertex queries without sampling. */
class GridIndex {
  private cells = new Map<string, number[]>();
  constructor(private v: Float32Array) {
    for (let i = 0; i < v.length; i += 3) {
      const key = this.key(v[i], v[i + 1], v[i + 2]);
      const list = this.cells.get(key);
      if (list) list.push(i);
      else this.cells.set(key, [i]);
    }
  }
  private key(x: number, y: number, z: number) {
    return `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  }
  /** Index of the nearest vertex to (x, y, z) and the squared distance. */
  nearest(x: number, y: number, z: number): [number, number] {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    const cz = Math.floor(z / CELL);
    let best = -1;
    let bestD = Infinity;
    for (let ring = 0; ring <= 60; ring++) {
      // Once the best found is closer than the inner edge of this ring, nothing further can beat it.
      if (best >= 0 && bestD <= ((ring - 1) * CELL) ** 2) break;
      for (let ix = cx - ring; ix <= cx + ring; ix++)
        for (let iy = cy - ring; iy <= cy + ring; iy++)
          for (let iz = cz - ring; iz <= cz + ring; iz++) {
            const onShell =
              Math.abs(ix - cx) === ring || Math.abs(iy - cy) === ring || Math.abs(iz - cz) === ring;
            if (!onShell) continue;
            const list = this.cells.get(`${ix},${iy},${iz}`);
            if (!list) continue;
            for (const i of list) {
              const dx = this.v[i] - x;
              const dy = this.v[i + 1] - y;
              const dz = this.v[i + 2] - z;
              const d = dx * dx + dy * dy + dz * dz;
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            }
          }
    }
    return [best, bestD];
  }
}

const grids = new Map<string, GridIndex>();
const gridFor = (p: CatalogPart) => {
  let g = grids.get(p.id);
  if (!g) {
    g = new GridIndex(verts(p));
    grids.set(p.id, g);
  }
  return g;
};

/** The bone vertex nearest to the given muscle vertices, plus that gap in model units. */
function nearestOnBone(muscle: Float32Array, ms: number[], bone: CatalogPart): [Vec3, number] {
  const grid = gridFor(bone);
  const boneV = verts(bone);
  let best = 0;
  let bestD = Infinity;
  for (const m of ms) {
    const [i, d] = grid.nearest(muscle[m], muscle[m + 1], muscle[m + 2]);
    if (i >= 0 && d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return [[boneV[best], boneV[best + 1], boneV[best + 2]], Math.sqrt(bestD)];
}

const byId = new Map(parts.map((p) => [p.id, p]));
const centroidOf = (ids: string[]): Vec3 | null => {
  const ps = ids.map((id) => byId.get(id)).filter((p): p is CatalogPart => !!p);
  if (!ps.length) return null;
  const c: Vec3 = [0, 0, 0];
  for (const p of ps) for (let k = 0; k < 3; k++) c[k] += p.centroid[k] / ps.length;
  return c;
};

/**
 * Keys are "o:<boneId>" for origin contacts and "i:<boneId>" for insertion contacts; values are
 * [x, y, z, gap] where gap is how far the muscle end actually is from the bone. A large gap means
 * the article's attachment belongs to another head of the same muscle, not to this mesh.
 */
const contacts: Record<string, Record<string, [number, number, number, number]>> = {};
let pairs = 0;
const muscles = parts.filter((p) => p.type === "muscle");
for (const [i, m] of muscles.entries()) {
  const ids = attachmentIds(m);
  if (!ids) continue;
  const mv = verts(m);
  // Proximal-to-distal direction of this muscle: origin bones toward insertion bones, else down.
  const o = centroidOf(ids.origin);
  const ins = centroidOf(ids.insertion);
  let dir: Vec3 = [0, -1, 0];
  if (o && ins) {
    const d: Vec3 = [ins[0] - o[0], ins[1] - o[1], ins[2] - o[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len > 0.01) dir = [d[0] / len, d[1] / len, d[2] / len];
  }
  for (const end of ["origin", "insertion"] as const) {
    const bandIdx = endBand(mv, dir, end);
    for (const boneId of new Set(ids[end])) {
      const b = byId.get(boneId);
      if (!b) continue;
      contacts[m.id] ??= {};
      const [point, gap] = nearestOnBone(mv, bandIdx, b);
      const p = r3(point);
      contacts[m.id][`${end[0]}:${boneId}`] = [p[0], p[1], p[2], round(Math.min(gap, 1))];
      pairs++;
    }
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${muscles.length} muscles, ${pairs} contacts`);
}

const geometry = {
  generated: new Date().toISOString().slice(0, 10),
  source: "public/body.glb decoded with draco3d; catalog-space coordinates",
  pivots: pivots(),
  contacts,
};
const outPath = resolve(root, "src/data/geometry.json");
writeFileSync(outPath, JSON.stringify(geometry, null, 1) + "\n");
console.log(`Wrote ${Object.keys(geometry.pivots).length} joints and ${pairs} contacts to ${outPath}`);
for (const [joint, p] of Object.entries(geometry.pivots)) console.log(`  ${joint}: right ${p.right.join(", ")}`);
const gaps = Object.values(contacts).flatMap((m) => Object.values(m).map((e) => e[3]));
gaps.sort((a, b) => a - b);
const q = (f: number) => gaps[Math.floor(gaps.length * f)];
console.log(`gap quartiles: ${q(0.25)} / ${q(0.5)} / ${q(0.75)} / max ${gaps[gaps.length - 1]}`);
for (const [m, b, e] of [
  ["lateral-head-of-gastrocnemius-r", "femur-r", "o"],
  ["lateral-head-of-gastrocnemius-r", "calcaneus-r", "i"],
  ["deep-head-of-pronator-teres-r", "humerus-r", "o"],
  ["deep-head-of-pronator-teres-r", "ulna-r", "o"],
  ["short-head-of-biceps-femoris-r", "hip-bone-r", "o"],
  ["long-head-of-biceps-femoris-r", "hip-bone-r", "o"],
  ["long-head-of-biceps-brachii-r", "scapula-r", "o"],
  ["short-head-of-biceps-brachii-r", "scapula-r", "o"],
])
  console.log(`  gap ${m} ${e}:${b} = ${contacts[m]?.[`${e}:${b}`]?.[3]}`);
