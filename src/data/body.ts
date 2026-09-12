import { attachmentIds } from "./attachments";
import { partById, parts } from "./catalog";
import { contact, pivotOf } from "./geometry";
import { add, IDENTITY, normalize, rotate, scale, sub, type Quat } from "./quat";
import { PARENT, SEGMENT_IDS, segmentOfBone, segmentPivot, type SegmentId } from "./segments";
import { bandFor, candidateSegments, pointWeights, skinFor, type SkinData } from "./skin";
import type { SwingFile } from "./swings";
import type { CatalogPart, Vec3 } from "./types";

/**
 * The posed body for a swing frame (spec section 6.4 to 6.6): rigid segment transforms composed
 * along the chain, every muscle's path length, and what the engine needs to draw it all.
 */
export type SegmentTransform = { q: Quat; pivot: Vec3; posed: Vec3 };
export type Transforms = Record<SegmentId, SegmentTransform>;

const ratioCache = new Map<string, Map<string, Float32Array>>();

/** v' = rotate(q, v − pivot) + posed. */
export function applyTransform(t: SegmentTransform, v: Vec3): Vec3 {
  return add(rotate(t.q, sub(v, t.pivot)), t.posed);
}

const transformCache = new Map<string, Map<number, Transforms>>();

/** Forget cached transforms and length ratios for a swing whose data changed (the build edits root). */
export function resetBodyCache(id: string): void {
  transformCache.delete(id);
  ratioCache.delete(id);
}

/** Every segment's transform at a frame: the pelvis takes the root offset, children hang off parents. */
export function transformsAt(swing: SwingFile, frame: number): Transforms {
  const f = Math.min(swing.frames - 1, Math.max(0, Math.round(frame)));
  let perSwing = transformCache.get(swing.id);
  if (!perSwing) {
    perSwing = new Map();
    transformCache.set(swing.id, perSwing);
  }
  const hit = perSwing.get(f);
  if (hit) return hit;
  const out = {} as Transforms;
  for (const s of SEGMENT_IDS) {
    const q = swing.segments?.[s]?.[f] ?? IDENTITY;
    const pivot = segmentPivot(s);
    const parent = PARENT[s];
    const posed = parent ? applyTransform(out[parent], pivot) : add(pivot, swing.root?.[f] ?? [0, 0, 0]);
    out[s] = { q, pivot, posed };
  }
  perSwing.set(f, out);
  return out;
}

export type MusclePath = {
  id: string;
  key: string;
  name: string;
  from: Vec3;
  via: Vec3;
  to: Vec3;
  fromSeg: SegmentId;
  toSeg: SegmentId;
  viaSegments: SegmentId[];
  viaWeights: number[];
};

let pathCache: MusclePath[] | null = null;

/** Origin → belly → insertion paths for every muscle with measured contacts on both ends. */
export function musclePaths(): MusclePath[] {
  if (pathCache) return pathCache;
  const out: MusclePath[] = [];
  for (const p of parts) {
    if (p.type !== "muscle") continue;
    const ids = attachmentIds(p);
    if (!ids) continue;
    let from: Vec3 | undefined;
    let fromSeg: SegmentId | null = null;
    for (const boneId of ids.origin) {
      const c = contact(p.id, boneId, "origin");
      const seg = segmentOfBone(partById(boneId)!);
      if (c && seg) {
        from = c;
        fromSeg = seg;
        break;
      }
    }
    let to: Vec3 | undefined;
    let toSeg: SegmentId | null = null;
    for (const boneId of ids.insertion) {
      const c = contact(p.id, boneId, "insertion");
      const seg = segmentOfBone(partById(boneId)!);
      if (c && seg) {
        to = c;
        toSeg = seg;
        break;
      }
    }
    if (!from || !to || !fromSeg || !toSeg) continue;
    // Both ends on one rigid segment (hand intrinsics, jaw, larynx, abdominal wall): the rig cannot
    // change that path's length, so it is neither drawn nor counted in a group's mean.
    if (fromSeg === toSeg) continue;
    const viaSegments = candidateSegments(p);
    const viaWeights = pointWeights(p.centroid, viaSegments, bandFor(p));
    out.push({ id: p.id, key: p.key, name: p.name, from, via: p.centroid, to, fromSeg, toSeg, viaSegments, viaWeights });
  }
  pathCache = out;
  return out;
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The belly point under a blend of segment transforms. */
export function posedVia(path: MusclePath, t: Transforms): Vec3 {
  let v: Vec3 = [0, 0, 0];
  path.viaSegments.forEach((s, i) => {
    v = add(v, scale(applyTransform(t[s], path.via), path.viaWeights[i]));
  });
  return v;
}

export function pathLength(path: MusclePath, t: Transforms): number {
  const from = applyTransform(t[path.fromSeg], path.from);
  const to = applyTransform(t[path.toSeg], path.to);
  const via = posedVia(path, t);
  return dist(from, via) + dist(via, to);
}

/** Per muscle id: path length at each frame over its length at frame 0. */
export function lengthRatios(swing: SwingFile): Map<string, Float32Array> {
  const hit = ratioCache.get(swing.id);
  if (hit) return hit;
  const out = new Map<string, Float32Array>();
  const paths = musclePaths();
  const base = new Map<string, number>();
  const t0 = transformsAt(swing, 0);
  for (const p of paths) base.set(p.id, pathLength(p, t0) || 1e-6);
  for (const p of paths) out.set(p.id, new Float32Array(swing.frames));
  for (let f = 0; f < swing.frames; f++) {
    const t = transformsAt(swing, f);
    for (const p of paths) out.get(p.id)![f] = pathLength(p, t) / base.get(p.id)!;
  }
  ratioCache.set(swing.id, out);
  return out;
}

export type Ranked = { id: string; key: string; name: string; change: number };

/** Muscles that shorten or lengthen most between foot plant and contact, as a fraction of path length. */
export function changeRanking(swing: SwingFile, count = 8): { shortening: Ranked[]; lengthening: Ranked[] } {
  const ratios = lengthRatios(swing);
  const a = swing.events.footPlant ?? 0;
  const b = swing.events.contact ?? swing.frames - 1;
  const all: Ranked[] = [];
  for (const p of musclePaths()) {
    // The head is one rigid block here, so neck muscles would rank on an artefact.
    if (partById(p.id)?.region === "head-neck") continue;
    const r = ratios.get(p.id)!;
    const change = r[b] / (r[a] || 1) - 1;
    if (Number.isFinite(change)) all.push({ id: p.id, key: p.key, name: p.name, change });
  }
  const shortening = all.filter((x) => x.change < -0.005).sort((x, y) => x.change - y.change).slice(0, count);
  const lengthening = all.filter((x) => x.change > 0.005).sort((x, y) => y.change - x.change).slice(0, count);
  return { shortening, lengthening };
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Muscle colour for a length change: amber as it shortens, blue as it lengthens, saturating at 15 %. */
export function changeTint(change: number): string | undefined {
  if (!Number.isFinite(change) || Math.abs(change) < 0.01) return undefined;
  const k = Math.min(1, Math.abs(change) / 0.15);
  return mixHex("#a35b4c", change < 0 ? "#f2a531" : "#3d8bff", 0.25 + 0.75 * k);
}

/** What the engine needs to pose the whole body for a swing. */
export type BodyDrawing = {
  frames: number;
  fps: number;
  /** "lines": skeleton plus muscle lines of action (default); "shapes": skinned muscle meshes (approximate). */
  mode: "lines" | "shapes";
  /** Every muscle path, for the lines view; posed through `transformsAt`. */
  paths: MusclePath[];
  transformsAt(frame: number): Transforms;
  /** The rigid segment a part follows, or null for a soft part. */
  segmentOf(partId: string): SegmentId | null;
  /** Skin weights for a soft part from its mesh-local positions; null when one segment carries it whole. */
  skinOf(partId: string, positions: Float32Array, center: Vec3): SkinData | null;
  /** The one segment that carries an unskinned soft part. */
  carrierOf(partId: string): SegmentId;
  bulgeOf(partId: string): { axisFrom: Vec3; axisTo: Vec3; belly: Vec3 } | null;
  ratioAt(partId: string, frame: number): number;
  /**
   * The bat: measured direction per frame (unit, knob to tip), the two posed hand tips it is gripped
   * between, its length, and how far the knob sits below the hands (the capture's "knob" point is the
   * bottom of the lead hand, so the grip offset is what the measured reach leaves of the bat).
   */
  bat: { dirs: Vec3[]; anchors: [Vec3, Vec3]; hands: [SegmentId, SegmentId]; length: number; gripOffset: number } | null;
};

/** A 34-inch bat, the common adult length. */
export const BAT_LENGTH = 0.864;

/** Direction per frame plus a grip offset from the measured hand-to-tip reach, clamped to a plausible grip. */
export function batOf(bat: NonNullable<SwingFile["bat"]>): NonNullable<BodyDrawing["bat"]> {
  const reach = bat.tip.map((tip, i) => dist(tip as Vec3, bat.knob[i] as Vec3)).sort((a, b) => a - b);
  const median = reach.length ? reach[Math.floor(reach.length / 2)] : BAT_LENGTH - 0.14;
  return {
    dirs: bat.tip.map((tip, i) => normalize(sub(tip as Vec3, bat.knob[i] as Vec3))),
    anchors: [pivotOf("handTip", "left")!, pivotOf("handTip", "right")!],
    hands: ["handL", "handR"],
    length: BAT_LENGTH,
    gripOffset: Math.min(0.25, Math.max(0.05, BAT_LENGTH - median)),
  };
}

export function bodyDrawing(swing: SwingFile, mode: BodyDrawing["mode"] = "lines"): BodyDrawing {
  const ratios = lengthRatios(swing);
  const paths = musclePaths();
  const pathById = new Map(paths.map((p) => [p.id, p]));
  const part = (id: string): CatalogPart | undefined => partById(id);
  return {
    frames: swing.frames,
    fps: swing.fps,
    mode,
    paths,
    transformsAt: (f) => transformsAt(swing, f),
    segmentOf: (id) => {
      const p = part(id);
      return p ? segmentOfBone(p) : null;
    },
    skinOf: (id, positions, center) => {
      const p = part(id);
      return p ? skinFor(p, positions, center) : null;
    },
    carrierOf: (id) => {
      const p = part(id);
      return p ? candidateSegments(p)[0] : "pelvis";
    },
    bulgeOf: (id) => {
      const p = pathById.get(id);
      return p ? { axisFrom: p.from, axisTo: p.to, belly: p.via } : null;
    },
    ratioAt: (id, f) => ratios.get(id)?.[Math.min(swing.frames - 1, Math.max(0, Math.round(f)))] ?? 1,
    bat: swing.bat ? batOf(swing.bat) : null,
  };
}
