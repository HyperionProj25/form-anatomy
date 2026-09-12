import { parts, partForSide, partsByKey } from "./catalog";
import { pivotOf } from "./geometry";
import { basisFrom, mid, normalize, sub, type Basis } from "./quat";
import type { CatalogPart, Vec3 } from "./types";

/**
 * The full-body rig (spec 2026-09-10-swing-lab-design.md, section 6): eighteen rigid segments,
 * each with a pivot (its proximal joint), a distal end for its long axis, and a parent.
 */
export type SegmentId =
  | "pelvis"
  | "lumbar"
  | "thorax"
  | "head"
  | "girdleL"
  | "girdleR"
  | "upperArmL"
  | "upperArmR"
  | "forearmL"
  | "forearmR"
  | "handL"
  | "handR"
  | "thighL"
  | "thighR"
  | "shankL"
  | "shankR"
  | "footL"
  | "footR";

export const SEGMENT_IDS: SegmentId[] = [
  "pelvis",
  "lumbar",
  "thorax",
  "head",
  "girdleL",
  "girdleR",
  "upperArmL",
  "upperArmR",
  "forearmL",
  "forearmR",
  "handL",
  "handR",
  "thighL",
  "thighR",
  "shankL",
  "shankR",
  "footL",
  "footR",
];

export const PARENT: Record<SegmentId, SegmentId | null> = {
  pelvis: null,
  lumbar: "pelvis",
  thorax: "lumbar",
  head: "thorax",
  girdleL: "thorax",
  girdleR: "thorax",
  upperArmL: "girdleL",
  upperArmR: "girdleR",
  forearmL: "upperArmL",
  forearmR: "upperArmR",
  handL: "forearmL",
  handR: "forearmR",
  thighL: "pelvis",
  thighR: "pelvis",
  shankL: "thighL",
  shankR: "thighR",
  footL: "shankL",
  footR: "shankR",
};

export type Side = "left" | "right";

export function sideOfSegment(seg: SegmentId): Side | null {
  return seg.endsWith("L") ? "left" : seg.endsWith("R") ? "right" : null;
}

const HAND = /-of-hand$|-metacarpal-bone$|^(?:scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate)-bone$/;
const FOOT = /-of-foot$|-metatarsal-bone$|^(?:talus|calcaneus)$|^(?:navicular|cuboid)-bone$|-cuneiform-bone$|^sesamoid-bones-of-foot$/;

/** Which segment a bone belongs to; every bone in the catalog maps to one. */
export function segmentOfBone(part: CatalogPart): SegmentId | null {
  if (part.type !== "bone") return null;
  const k = part.key;
  const s = part.side === "left" ? "L" : part.side === "right" ? "R" : null;
  if (/^(hip-bone|sacrum|coccyx)$/.test(k)) return "pelvis";
  if (/^vertebra-l\d$/.test(k)) return "lumbar";
  if (/^vertebra-t\d+$/.test(k) || /-rib$/.test(k) || /costal-cartilage/.test(k) || /sternum|xiphoid/.test(k)) return "thorax";
  if (s) {
    if (/^(clavicle|scapula)$/.test(k)) return `girdle${s}`;
    if (k === "humerus") return `upperArm${s}`;
    if (/^(radius|ulna)$/.test(k)) return `forearm${s}`;
    if (HAND.test(k)) return `hand${s}`;
    if (k === "femur") return `thigh${s}`;
    // The patella rides with the tibia through the patellar ligament, so the quadriceps lengthen as the knee bends.
    if (/^(tibia|fibula|patella)$/.test(k)) return `shank${s}`;
    if (FOOT.test(k)) return `foot${s}`;
  }
  // Skull, cervical spine, mandible, hyoid, teeth, ossicles and laryngeal cartilages ride with the head.
  return part.region === "head-neck" ? "head" : null;
}

const segmentBones = new Map<SegmentId, CatalogPart[]>();
/** Bones of a segment, cached. */
export function bonesOf(seg: SegmentId): CatalogPart[] {
  let list = segmentBones.get(seg);
  if (!list) {
    list = parts.filter((p) => segmentOfBone(p) === seg);
    segmentBones.set(seg, list);
  }
  return list;
}

function pivot(name: string, side: Side = "left"): Vec3 {
  const p = pivotOf(name, side);
  if (!p) throw new Error(`geometry.json has no pivot ${name}; run scripts/build-geometry.ts`);
  return p;
}

function boneCentroid(key: string, side: Side): Vec3 {
  const p = partForSide(key, side) ?? partsByKey(key)[0];
  if (!p) throw new Error(`Missing bone ${key}`);
  return p.centroid;
}

/** The joint a segment rotates about, model space. */
export function segmentPivot(seg: SegmentId): Vec3 {
  const side = sideOfSegment(seg) ?? "left";
  switch (seg) {
    case "pelvis":
      return mid(pivot("hip", "left"), pivot("hip", "right"));
    case "lumbar":
      return pivot("lumbosacral");
    case "thorax":
      return pivot("thoracolumbar");
    case "head":
      return pivot("cervicothoracic");
    case "girdleL":
    case "girdleR":
      return pivot("sternoclavicular", side);
    case "upperArmL":
    case "upperArmR":
      return pivot("shoulder", side);
    case "forearmL":
    case "forearmR":
      return pivot("elbow", side);
    case "handL":
    case "handR":
      return pivot("wrist", side);
    case "thighL":
    case "thighR":
      return pivot("hip", side);
    case "shankL":
    case "shankR":
      return pivot("knee", side);
    case "footL":
    case "footR":
      return pivot("ankle", side);
  }
}

/** The far end of a segment's long axis, model space. */
export function segmentEnd(seg: SegmentId): Vec3 {
  const side = sideOfSegment(seg) ?? "left";
  switch (seg) {
    case "pelvis":
      return pivot("lumbosacral");
    case "lumbar":
      return pivot("thoracolumbar");
    case "thorax":
      return pivot("cervicothoracic");
    case "head":
      return pivot("headTop");
    case "girdleL":
    case "girdleR":
      return pivot("shoulder", side);
    case "upperArmL":
    case "upperArmR":
      return pivot("elbow", side);
    case "forearmL":
    case "forearmR":
      return pivot("wrist", side);
    case "handL":
    case "handR":
      return boneCentroid("distal-phalanx-of-third-finger-of-hand", side);
    case "thighL":
    case "thighR":
      return pivot("knee", side);
    case "shankL":
    case "shankR":
      return pivot("ankle", side);
    case "footL":
    case "footR":
      return boneCentroid("distal-phalanx-of-first-finger-of-foot", side);
  }
}

/** Proximal-to-distal unit direction of a segment at rest. */
export function segmentDir(seg: SegmentId): Vec3 {
  return normalize(sub(segmentEnd(seg), segmentPivot(seg)));
}

/**
 * The segment's basis in anatomical position: long axis from pivot to end, second axis the model's
 * anterior (+Z) projected, or up (+Y) for the feet; side completes the right-handed set.
 */
export function restBasis(seg: SegmentId): Basis {
  const ref: Vec3 = seg.startsWith("foot") ? [0, 1, 0] : [0, 0, 1];
  return basisFrom(sub(segmentEnd(seg), segmentPivot(seg)), ref);
}

function ancestors(seg: SegmentId): SegmentId[] {
  const out: SegmentId[] = [];
  let s: SegmentId | null = seg;
  while (s) {
    out.push(s);
    s = PARENT[s];
  }
  return out;
}

/** Segments from `a` to `b` through their lowest common ancestor, inclusive. */
export function chainPath(a: SegmentId, b: SegmentId): SegmentId[] {
  if (a === b) return [a];
  const up = ancestors(a);
  const down = ancestors(b);
  const common = up.find((s) => down.includes(s))!;
  const left = up.slice(0, up.indexOf(common) + 1);
  const right = down.slice(0, down.indexOf(common)).reverse();
  return [...left, ...right];
}
