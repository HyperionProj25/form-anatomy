import { attachmentIds } from "./attachments";
import { partById, parts } from "./catalog";
import { bonesOf, chainPath, PARENT, segmentOfBone, type SegmentId } from "./segments";
import type { CatalogPart, Vec3 } from "./types";

/**
 * Linear-blend skin weights for the full-body rig (spec section 6.5): a soft part's vertices are
 * shared between the segments its attachments name, blended across each joint plane on the chain
 * between them with the same smooth band the single-joint motion uses.
 */

export type SkinData = { segments: SegmentId[]; index: Uint16Array; weight: Float32Array };

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function depth(s: SegmentId): number {
  let d = 0;
  let p = PARENT[s];
  while (p) {
    d++;
    p = PARENT[p];
  }
  return d;
}

/** Largest bounding-box dimension of a part. */
export function extentOf(part: CatalogPart): number {
  return Math.max(
    part.bbox[1][0] - part.bbox[0][0],
    part.bbox[1][1] - part.bbox[0][1],
    part.bbox[1][2] - part.bbox[0][2],
    0.02,
  );
}

/** Half-width of the blend band across a joint plane for this part: 8 % of its extent, 2 to 6 cm. */
export function bandFor(part: CatalogPart): number {
  return Math.min(0.06, Math.max(0.02, extentOf(part) * 0.08));
}

const bonesBySide = new Map<string, CatalogPart[]>();
function nearestBoneSegment(part: CatalogPart): SegmentId {
  const key = part.side;
  let bones = bonesBySide.get(key);
  if (!bones) {
    bones = parts.filter((p) => p.type === "bone" && (p.side === part.side || p.side === "midline" || part.side === "midline"));
    bonesBySide.set(key, bones);
  }
  let best: CatalogPart | undefined;
  let bestD = Infinity;
  for (const b of bones) {
    const d = dist(b.centroid, part.centroid);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return (best && segmentOfBone(best)) ?? "pelvis";
}

const candidateCache = new Map<string, SegmentId[]>();

function sameSide(a: CatalogPart, b: CatalogPart): boolean {
  return a.side === b.side || a.side === "midline" || b.side === "midline";
}

function boxesOverlap(a: [Vec3, Vec3], b: [Vec3, Vec3], pad: number): boolean {
  for (let k = 0; k < 3; k++) if (a[1][k] + pad < b[0][k] || b[1][k] + pad < a[0][k]) return false;
  return true;
}

/**
 * Segments a soft part may be weighted to: those of the bones it attaches to and of the bones its
 * box overlaps, expanded along the chain between them, ordered from the root outward. A part with
 * neither takes the segment of the nearest bone. Attachment text sometimes names a bone on the
 * wrong limb (toe and finger phalanges share names); the distance weights below make such a
 * segment harmless, since the part's vertices lie nowhere near its bones.
 */
export function candidateSegments(part: CatalogPart): SegmentId[] {
  const hit = candidateCache.get(part.id);
  if (hit) return hit;
  const segs = new Set<SegmentId>();
  const ids = attachmentIds(part);
  if (ids)
    for (const boneId of [...ids.origin, ...ids.insertion]) {
      const b = partById(boneId);
      const s = b && sameSide(part, b) ? segmentOfBone(b) : null;
      if (s) segs.add(s);
    }
  for (const b of parts) {
    if (b.type !== "bone" || !sameSide(part, b) || !boxesOverlap(part.bbox, b.bbox, 0.01)) continue;
    const s = segmentOfBone(b);
    if (s) segs.add(s);
  }
  if (!segs.size) segs.add(nearestBoneSegment(part));
  const list = [...segs];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) for (const s of chainPath(list[i], list[j])) segs.add(s);
  const out = [...segs].sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));
  candidateCache.set(part.id, out);
  return out;
}

function boxDistance(p: Vec3, box: [Vec3, Vec3]): number {
  const dx = Math.max(box[0][0] - p[0], 0, p[0] - box[1][0]);
  const dy = Math.max(box[0][1] - p[1], 0, p[1] - box[1][1]);
  const dz = Math.max(box[0][2] - p[2], 0, p[2] - box[1][2]);
  return Math.hypot(dx, dy, dz);
}

const segmentBoxes = new Map<SegmentId, [Vec3, Vec3][]>();
function boxesOf(seg: SegmentId): [Vec3, Vec3][] {
  let boxes = segmentBoxes.get(seg);
  if (!boxes) {
    boxes = bonesOf(seg).map((b) => b.bbox);
    segmentBoxes.set(seg, boxes);
  }
  return boxes;
}

/** Distance from a point to the nearest bone box of a segment. */
export function segmentDistance(v: Vec3, seg: SegmentId): number {
  let d = Infinity;
  for (const box of boxesOf(seg)) {
    const dd = boxDistance(v, box);
    if (dd < d) d = dd;
  }
  return d;
}

/**
 * Weights of one point over a candidate set: each segment's weight falls off exponentially with
 * the point's distance from that segment's bones (e-folding over `band`), normalised to sum to
 * one. A point on a bone takes that segment; a point between two bones blends; a segment named by
 * mistake, far away, weighs nothing.
 */
export function pointWeights(v: Vec3, segments: SegmentId[], band: number): number[] {
  const raw = segments.map((s) => Math.exp(-((segmentDistance(v, s) / band) ** 2)));
  const total = raw.reduce((a, b) => a + b, 0);
  if (!(total > 0)) {
    let best = 0;
    segments.forEach((s, i) => {
      if (segmentDistance(v, s) < segmentDistance(v, segments[best])) best = i;
    });
    return segments.map((_, i) => (i === best ? 1 : 0));
  }
  return raw.map((w) => w / total);
}

/**
 * Per-vertex skin indices and weights (four slots) for a part whose `positions` are in mesh-local
 * coordinates (catalog coordinates plus `center`). Returns null for a part that sits on one
 * segment, which needs no skinning.
 */
export function skinFor(part: CatalogPart, positions: Float32Array, center: Vec3): SkinData | null {
  const segments = candidateSegments(part);
  if (segments.length < 2) return null;
  const band = bandFor(part);
  const n = positions.length / 3;
  const index = new Uint16Array(n * 4);
  const weight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const v: Vec3 = [positions[i * 3] - center[0], positions[i * 3 + 1] - center[1], positions[i * 3 + 2] - center[2]];
    const w = pointWeights(v, segments, band);
    const order = w.map((value, k) => [value, k] as const).sort((a, b) => b[0] - a[0]).slice(0, 4);
    const sum = order.reduce((a, [value]) => a + value, 0) || 1;
    for (let slot = 0; slot < 4; slot++) {
      const entry = order[slot];
      index[i * 4 + slot] = entry ? entry[1] : 0;
      weight[i * 4 + slot] = entry ? entry[0] / sum : 0;
    }
  }
  return { segments, index, weight };
}
