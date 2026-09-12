import { attachmentIds } from "./attachments";
import { partById, partForSide, parts, partsByKey } from "./catalog";
import { contact, jointPivot, reaches } from "./geometry";
import { JOINTS, type JointId } from "./joints";
import { contactPoint } from "./pull";
import type { CatalogPart, Region, Vec3 } from "./types";

export type MotionSide = "left" | "right";
export type CableRole = "shortens" | "lengthens" | "neutral";

/**
 * A crossing muscle drawn as a line of action that bends through the muscle belly: origin to belly
 * is fixed, belly to insertion moves with the segment. The role comes from the moving segment, which
 * is what a muscle that wraps around a joint (gluteus maximus, gracilis) actually does at the joint.
 */
export type Cable = {
  key: string;
  id: string;
  name: string;
  from: Vec3;
  via: Vec3;
  to: Vec3;
  role: CableRole;
  /**
   * How much of the joint rotation the belly follows, 0 (fixed) to 1 (rides with the segment). A
   * smooth band across the joint plane, biased by which bones the muscle sits on, so a belly that
   * straddles the joint moves part way. Vertex weights in the deformed mesh use the same band.
   */
  viaWeight: number;
  /** Path length change over the full range as a fraction of the muscle's extent; negative shortens. */
  change: number;
};

export type MotionSetup = {
  joint: JointId;
  side: MotionSide;
  label: string;
  /** Joint centre estimate, model space. */
  pivot: Vec3;
  /** Proximal-to-distal direction of the limb at this joint, unit length. */
  dir: Vec3;
  /** Half-width of the blend band across the joint plane, model units. */
  band: number;
  /** Unit axis; positive rotation moves the segment through the motion named in label. */
  axis: Vec3;
  /** Degrees at phase 0 and phase 1. */
  range: [number, number];
  movingIds: string[];
  hiddenIds: string[];
  cables: Cable[];
  /** Camera direction for a lateral look at the joint. */
  view: Vec3;
  radius: number;
};

type Config = {
  proximal: string;
  distal: string;
  motion: string;
  range: [number, number];
  sign: 1 | -1;
  /** Regions whose unmatched muscles may move with the segment (decided by position). */
  regions: Region[];
};

/**
 * Per joint: the bone pair whose meeting point estimates the joint centre, the motion shown, its
 * range, and the rotation sign about the mediolateral (x) axis that produces it in this model
 * (front is +z, up is +y).
 */
const CONFIG: Record<JointId, Config> = {
  tmj: { proximal: "temporal-bone", distal: "mandible", motion: "Jaw opening", range: [0, 25], sign: 1, regions: [] },
  shoulder: {
    proximal: "scapula",
    distal: "humerus",
    motion: "Shoulder flexion",
    range: [0, 90],
    sign: -1,
    regions: ["shoulder-arm", "forearm-hand"],
  },
  // The radial head sits at the joint line; the ulna's olecranon rises above it.
  elbow: { proximal: "humerus", distal: "radius", motion: "Elbow flexion", range: [0, 120], sign: -1, regions: ["forearm-hand"] },
  wrist: { proximal: "radius", distal: "lunate-bone", motion: "Wrist flexion", range: [0, 60], sign: -1, regions: ["forearm-hand"] },
  hip: { proximal: "hip-bone", distal: "femur", motion: "Hip flexion", range: [0, 80], sign: -1, regions: ["hip-thigh", "leg-foot"] },
  knee: { proximal: "femur", distal: "tibia", motion: "Knee flexion", range: [0, 110], sign: 1, regions: ["leg-foot"] },
  ankle: { proximal: "tibia", distal: "talus", motion: "Ankle plantarflexion", range: [0, 35], sign: 1, regions: ["leg-foot"] },
};

/** Path length change, as a fraction of the muscle's extent, below which a cable reads as neutral. */
const ROLE_THRESHOLD = 0.03;

/** Smooth 0..1 ramp of a signed distance from the joint plane across a band of half-width `band`. */
export function bandWeight(signedDistance: number, band: number): number {
  const x = Math.min(1, Math.max(0, (signedDistance + band) / (2 * band)));
  return x * x * (3 - 2 * x);
}

/** Rodrigues rotation of a point about an axis through a pivot. */
export function rotatePoint(p: Vec3, pivot: Vec3, axis: Vec3, angle: number): Vec3 {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const kx = axis[0] / len;
  const ky = axis[1] / len;
  const kz = axis[2] / len;
  const v: Vec3 = [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = kx * v[0] + ky * v[1] + kz * v[2];
  const cross: Vec3 = [ky * v[2] - kz * v[1], kz * v[0] - kx * v[2], kx * v[1] - ky * v[0]];
  return [
    pivot[0] + v[0] * c + cross[0] * s + kx * dot * (1 - c),
    pivot[1] + v[1] * c + cross[1] * s + ky * dot * (1 - c),
    pivot[2] + v[2] * c + cross[2] * s + kz * dot * (1 - c),
  ];
}

/** Rotation angle in radians for a phase in 0..1. */
export function angleAt(setup: MotionSetup, phase: number): number {
  const deg = setup.range[0] + (setup.range[1] - setup.range[0]) * Math.min(1, Math.max(0, phase));
  return (deg * Math.PI) / 180;
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function clampToBox(box: [Vec3, Vec3], p: Vec3): Vec3 {
  return [
    Math.min(Math.max(p[0], box[0][0]), box[1][0]),
    Math.min(Math.max(p[1], box[0][1]), box[1][1]),
    Math.min(Math.max(p[2], box[0][2]), box[1][2]),
  ];
}

function boneFor(key: string, side: MotionSide): CatalogPart | undefined {
  return partForSide(key, side) ?? partsByKey(key)[0];
}

/**
 * The muscle's own end nearest the joint side asked for: walk from the centroid along the limb
 * direction (or against it) until the muscle's bounding box stops. This puts a brachialis insertion
 * at the front of the elbow and a triceps insertion at the back, which a centroid cannot do.
 */
function endPoint(muscle: CatalogPart, dir: Vec3, distal: boolean): Vec3 {
  const s = distal ? 10 : -10;
  return clampToBox(muscle.bbox, [
    muscle.centroid[0] + dir[0] * s,
    muscle.centroid[1] + dir[1] * s,
    muscle.centroid[2] + dir[2] * s,
  ]);
}

/** Volume shared by two axis-aligned boxes. */
function overlapVolume(a: [Vec3, Vec3], b: [Vec3, Vec3]): number {
  let v = 1;
  for (let i = 0; i < 3; i++) {
    const w = Math.min(a[1][i], b[1][i]) - Math.max(a[0][i], b[0][i]);
    if (w <= 0) return 0;
    v *= w;
  }
  return v;
}

/**
 * Does the muscle belly ride on the moving segment? Decided by how much of the muscle's box sits
 * inside the moving bones versus the fixed bones: the gluteal belly sits on the pelvis even though
 * it hangs below the hip line, while the gastrocnemius belly sits on the leg although its heads
 * start above the knee.
 */
function bellyMoves(muscle: CatalogPart, moving: CatalogPart[], fixed: CatalogPart[]): boolean {
  const sum = (bones: CatalogPart[]) => bones.reduce((t, b) => t + overlapVolume(muscle.bbox, b.bbox), 0);
  return sum(moving) > sum(fixed);
}

function nearestBone(ids: string[], allowed: Set<string>, towards: Vec3): CatalogPart | undefined {
  return ids
    .map((id) => partById(id))
    .filter((p): p is CatalogPart => !!p && allowed.has(p.key))
    .sort((a, b) => dist(a.centroid, towards) - dist(b.centroid, towards))[0];
}

export type MotionOptions = {
  /** Degrees at phase 0 and 1 instead of the joint's teaching range; a measured swing passes foot plant and contact. */
  range?: [number, number];
  label?: string;
};

/** Everything needed to animate one joint on one side, or undefined when the bones are missing. */
export function motionSetup(joint: JointId, side: MotionSide, opts: MotionOptions = {}): MotionSetup | undefined {
  const cfg = CONFIG[joint];
  const proximal = boneFor(cfg.proximal, side);
  const distal = boneFor(cfg.distal, side);
  if (!proximal || !distal) return undefined;
  // Joint centre from decoded mesh landmarks when the geometry build has it, else from boxes.
  const measured = jointPivot(joint, side);
  const pivot: Vec3 = measured
    ? joint === "tmj"
      ? [0, measured[1], measured[2]]
      : measured
    : joint === "tmj"
      ? [0, distal.bbox[1][1] - 0.006, distal.bbox[0][2] + 0.012]
      : clampToBox(proximal.bbox, [distal.centroid[0], distal.bbox[1][1], distal.centroid[2]]);
  const axis: Vec3 = [cfg.sign, 0, 0];
  const range = opts.range ?? cfg.range;
  const startAngle = (range[0] * Math.PI) / 180;
  const endAngle = (range[1] * Math.PI) / 180;
  const base = joint === "tmj" ? pivot : proximal.centroid;
  const dirRaw: Vec3 = [
    distal.centroid[0] - base[0],
    distal.centroid[1] - base[1],
    distal.centroid[2] - base[2],
  ];
  const dl = Math.hypot(dirRaw[0], dirRaw[1], dirRaw[2]) || 1;
  const dir: Vec3 = [dirRaw[0] / dl, dirRaw[1] / dl, dirRaw[2] / dl];
  const proximalSet = new Set(JOINTS[joint].proximal);
  const distalSet = new Set(JOINTS[joint].distal);
  const onSide = (p: CatalogPart) => joint === "tmj" || p.side === side || p.side === "midline";
  const band = Math.min(0.06, Math.max(0.025, (distal.bbox[1][1] - distal.bbox[0][1]) * 0.12));

  const movingIds: string[] = [];
  const hiddenIds: string[] = [];
  const cables: Cable[] = [];
  const movingBones: CatalogPart[] = [];
  const fixedBones: CatalogPart[] = [];
  for (const p of parts) {
    if (!onSide(p) || p.type !== "bone") continue;
    if (distalSet.has(p.key) || (joint === "tmj" && p.key.startsWith("lower-"))) {
      movingIds.push(p.id);
      movingBones.push(p);
    } else if (proximalSet.has(p.key)) fixedBones.push(p);
  }
  for (const p of parts) {
    if (!onSide(p) || p.type === "bone") continue;
    if (p.type !== "muscle") continue;
    const all = attachmentIds(p);
    // Keep only the bones this mesh actually reaches; the article covers every head of the muscle.
    const a = all && {
      origin: all.origin.filter((id) => reaches(p.id, id, "origin")),
      insertion: all.insertion.filter((id) => reaches(p.id, id, "insertion")),
    };
    const keys = new Set<string>();
    if (a) for (const id of [...a.origin, ...a.insertion]) keys.add(partById(id)?.key ?? "");
    keys.delete("");
    if (keys.size && a) {
      const touchesProximal = [...keys].some((k) => proximalSet.has(k));
      const touchesDistal = [...keys].some((k) => distalSet.has(k));
      if (touchesProximal && touchesDistal) {
        const all = [...a.origin, ...a.insertion];
        const originBone =
          nearestBone(a.origin, proximalSet, p.centroid) ?? nearestBone(all, proximalSet, p.centroid);
        const insertionBone =
          nearestBone(a.insertion, distalSet, p.centroid) ?? nearestBone(all, distalSet, p.centroid);
        if (!originBone || !insertionBone) continue;
        const from =
          contact(p.id, originBone.id, "origin") ?? contactPoint(originBone, endPoint(p, dir, false));
        const via = p.centroid;
        const to =
          contact(p.id, insertionBone.id, "insertion") ?? contactPoint(insertionBone, endPoint(p, dir, true));
        // The belly follows the segment by a smooth weight across the joint plane, biased by which
        // bones the muscle sits on. The path origin -> belly -> insertion is then measured at both
        // ends of the range, against the muscle's own size, so a short muscle with a tiny lever arm
        // reads as neutral rather than as a huge percentage of a few millimetres.
        const plane = (via[0] - pivot[0]) * dir[0] + (via[1] - pivot[1]) * dir[1] + (via[2] - pivot[2]) * dir[2];
        const raw = bandWeight(plane, band);
        const viaWeight = bellyMoves(p, movingBones, fixedBones) ? Math.max(raw, 0.7) : Math.min(raw, 0.3);
        const via0 = rotatePoint(via, pivot, axis, startAngle * viaWeight);
        const to0 = rotatePoint(to, pivot, axis, startAngle);
        const via1 = rotatePoint(via, pivot, axis, endAngle * viaWeight);
        const to1 = rotatePoint(to, pivot, axis, endAngle);
        const len0 = dist(from, via0) + dist(via0, to0);
        const len1 = dist(from, via1) + dist(via1, to1);
        const extent = Math.max(
          p.bbox[1][0] - p.bbox[0][0],
          p.bbox[1][1] - p.bbox[0][1],
          p.bbox[1][2] - p.bbox[0][2],
          0.02,
        );
        const change = (len1 - len0) / extent;
        const role: CableRole =
          change < -ROLE_THRESHOLD ? "shortens" : change > ROLE_THRESHOLD ? "lengthens" : "neutral";
        cables.push({ key: p.key, id: p.id, name: p.name, from, via, to, role, viaWeight, change });
        hiddenIds.push(p.id);
      } else if (touchesDistal) movingIds.push(p.id);
      continue;
    }
    if (cfg.regions.includes(p.region)) {
      const rel: Vec3 = [p.centroid[0] - pivot[0], p.centroid[1] - pivot[1], p.centroid[2] - pivot[2]];
      if (rel[0] * dir[0] + rel[1] * dir[1] + rel[2] * dir[2] > 0.01) movingIds.push(p.id);
    }
  }
  cables.sort((x, y) => x.name.localeCompare(y.name));

  const sideSign = side === "left" ? 1 : -1;
  const view: Vec3 = joint === "tmj" ? [sideSign * 0.9, 0.15, 0.55] : [sideSign * 0.95, 0.18, 0.32];
  const radius = Math.max(
    0.16,
    movingIds
      .map((id) => partById(id))
      .filter((p): p is CatalogPart => !!p && p.type === "bone")
      .reduce((r, p) => Math.max(r, dist(p.centroid, pivot)), 0) * 0.75,
  );
  return {
    joint,
    side,
    label: opts.label ?? cfg.motion,
    pivot,
    dir,
    band,
    axis,
    range,
    movingIds,
    hiddenIds,
    cables,
    view,
    radius,
  };
}

export function cableRoles(setup: MotionSetup): { shortens: Cable[]; lengthens: Cable[]; neutral: Cable[] } {
  return {
    shortens: setup.cables.filter((c) => c.role === "shortens"),
    lengthens: setup.cables.filter((c) => c.role === "lengthens"),
    neutral: setup.cables.filter((c) => c.role === "neutral"),
  };
}
