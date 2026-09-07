/**
 * Builds src/data/catalog.json from public/body.glb.
 * Reads only the glTF JSON header: node names, extras, and POSITION accessor bounds.
 * No Draco decoding is needed because every accessor declares min/max and no node has a transform.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyLayer, classifyRegion, slugify } from "../src/data/regions";
import type { Catalog, CatalogPart, PartType, Side, Vec3 } from "../src/data/types";

type GltfNode = {
  name: string;
  mesh?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  matrix?: number[];
  extras?: Record<string, unknown>;
};
type Gltf = {
  nodes: GltfNode[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
};

const root = resolve(import.meta.dirname, "..");
const glbPath = resolve(root, "public/body.glb");
const outPath = resolve(root, "src/data/catalog.json");
const SIDE_THRESHOLD = 0.008;

const bytes = readFileSync(glbPath);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) as Gltf;
const nodes = gltf.nodes.filter((n) => n.mesh !== undefined);

for (const n of nodes) {
  if (n.translation || n.rotation || n.scale || n.matrix)
    throw new Error(`Node ${n.name} has a transform; the header-only catalog assumes none.`);
}
if (new Set(nodes.map((n) => n.name)).size !== nodes.length)
  throw new Error("GLB node names are not unique.");

type Raw = { node: GltfNode; min: Vec3; max: Vec3 };
const raws: Raw[] = nodes.map((node) => {
  const prims = gltf.meshes[node.mesh!].primitives;
  if (prims.length !== 1) throw new Error(`Mesh for ${node.name} has ${prims.length} primitives.`);
  const acc = gltf.accessors[prims[0].attributes.POSITION];
  if (!acc.min || !acc.max) throw new Error(`POSITION accessor for ${node.name} lacks bounds.`);
  return { node, min: acc.min as Vec3, max: acc.max as Vec3 };
});

const overallMin: Vec3 = [Infinity, Infinity, Infinity];
const overallMax: Vec3 = [-Infinity, -Infinity, -Infinity];
for (const r of raws)
  for (let i = 0; i < 3; i++) {
    overallMin[i] = Math.min(overallMin[i], r.min[i]);
    overallMax[i] = Math.max(overallMax[i], r.max[i]);
  }
const modelCenter = overallMin.map((v, i) => (v + overallMax[i]) / 2) as Vec3;
const modelSize = overallMax.map((v, i) => v - overallMin[i]) as Vec3;
const extents = { minY: overallMin[1] - modelCenter[1], maxY: overallMax[1] - modelCenter[1] };

const round = (v: number) => Math.round(v * 10000) / 10000;
const shift = (v: Vec3): Vec3 => [
  round(v[0] - modelCenter[0]),
  round(v[1] - modelCenter[1]),
  round(v[2] - modelCenter[2]),
];

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function displayName(node: GltfNode): string {
  const extras = node.extras ?? {};
  const rawName = str(extras.nameDetail) ?? str(extras.name) ?? node.name.replaceAll("_", " ");
  return rawName.replace(/^\((.*)\)$/, "$1").trim();
}

// Bilateral pairs: two nodes with the same display name whose centers sit on opposite sides of x.
// Their sides come from the sign of x even when they hug the midline (arytenoids, interspinales).
const xByName = new Map<string, number[]>();
for (const r of raws) {
  const x = (r.min[0] + r.max[0]) / 2 - modelCenter[0];
  const list = xByName.get(displayName(r.node));
  if (list) list.push(x);
  else xByName.set(displayName(r.node), [x]);
}
function sideOf(name: string, x: number): Side {
  const xs = xByName.get(name) ?? [];
  const paired = xs.length === 2 && xs[0] * xs[1] < 0 && Math.abs(xs[0] - xs[1]) > 0.002;
  if (paired) return x > 0 ? "left" : "right";
  return x > SIDE_THRESHOLD ? "left" : x < -SIDE_THRESHOLD ? "right" : "midline";
}

const parts: CatalogPart[] = raws.map(({ node, min, max }) => {
  const extras = node.extras ?? {};
  const name = displayName(node);
  const groupName = str(extras.name)?.replace(/#.*$/, "").replace(/\s*\([^)]*$/, "").trim() || undefined;
  const group = groupName && groupName !== name && groupName !== `(${name})` ? groupName : undefined;
  const typeRaw = str(extras.type);
  const type: PartType = typeRaw === "muscle" || typeRaw === "bone" ? typeRaw : "connective";
  const bmin = shift(min);
  const bmax = shift(max);
  const centroid: Vec3 = [
    round((bmin[0] + bmax[0]) / 2),
    round((bmin[1] + bmax[1]) / 2),
    round((bmin[2] + bmax[2]) / 2),
  ];
  const side: Side = sideOf(name, centroid[0]);
  const wikiRaw = str(extras.wikiLink);
  const wiki = wikiRaw?.startsWith("https://en.wikipedia.org/wiki/") ? wikiRaw.split("#")[0] : undefined;
  const key = slugify(name);
  return {
    id: key + (side === "left" ? "-l" : side === "right" ? "-r" : ""),
    node: node.name,
    key,
    name,
    ...(group ? { group } : {}),
    type,
    side,
    region: classifyRegion(name, group, centroid, extents),
    layer: classifyLayer(name, type),
    centroid,
    bbox: [bmin, bmax],
    ...(wiki ? { wiki } : {}),
  };
});

// Disambiguate id collisions deterministically (same name and side more than once).
const seen = new Map<string, number>();
for (const p of parts) {
  const n = (seen.get(p.id) ?? 0) + 1;
  seen.set(p.id, n);
  if (n > 1) p.id = `${p.id}-${n}`;
}
if (new Set(parts.map((p) => p.id)).size !== parts.length) throw new Error("Catalog ids are not unique.");

parts.sort(
  (a, b) => a.name.localeCompare(b.name) || a.side.localeCompare(b.side) || a.id.localeCompare(b.id),
);

const catalog: Catalog = {
  meta: {
    source: "public/body.glb (Z-Anatomy via hpfrei, CC BY-SA 4.0)",
    generated: new Date().toISOString().slice(0, 10),
    modelCenter: modelCenter.map(round) as Vec3,
    modelSize: modelSize.map(round) as Vec3,
    partCount: parts.length,
  },
  parts,
};
writeFileSync(outPath, JSON.stringify(catalog, null, 1) + "\n");

const count = (f: (p: CatalogPart) => boolean) => parts.filter(f).length;
console.log(`Wrote ${parts.length} parts to ${outPath}`);
console.log(
  `sides: left ${count((p) => p.side === "left")}, right ${count((p) => p.side === "right")}, midline ${count((p) => p.side === "midline")}`,
);
for (const region of [
  "head-neck",
  "back",
  "thorax",
  "abdomen-pelvis",
  "shoulder-arm",
  "forearm-hand",
  "hip-thigh",
  "leg-foot",
] as const)
  console.log(`  ${region}: ${count((p) => p.region === region)}`);
console.log(`deep muscles: ${count((p) => p.layer === "deep")}, with wiki: ${count((p) => !!p.wiki)}`);
console.log("midline parts:", parts.filter((p) => p.side === "midline").map((p) => p.name).join(", "));
