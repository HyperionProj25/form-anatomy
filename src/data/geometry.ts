import raw from "./geometry.json";
import type { JointId } from "./joints";
import type { Vec3 } from "./types";

type Geometry = {
  generated: string;
  /** Joint centres and rig landmarks per side; midline ones repeat the same point for both. */
  pivots: Record<string, { left: Vec3; right: Vec3 } | undefined>;
  /** Per muscle part id: "o:<boneId>" origin and "i:<boneId>" insertion entries as [x, y, z, gap]. */
  contacts: Record<string, Record<string, [number, number, number, number]>>;
};

export const geometry = raw as unknown as Geometry;

/**
 * Sanity bound on the gap between a muscle end and a bone, in model units. Gaps are normal: the
 * gastrocnemius sits 16 cm from the calcaneus because the Achilles tendon is not a mesh. Only a
 * gap this large marks an attachment the build could not place at all.
 */
export const MAX_ATTACHMENT_GAP = 0.3;

/** Joint centre from bone landmarks in the decoded mesh, or undefined if the build lacks it. */
export function jointPivot(joint: JointId, side: "left" | "right"): Vec3 | undefined {
  return geometry.pivots[joint]?.[side];
}

/** Any pivot or rig landmark by name (lumbosacral, sternoclavicular, headTop, handTip, toeTip, …). */
export function pivotOf(name: string, side: "left" | "right"): Vec3 | undefined {
  return geometry.pivots[name]?.[side];
}

function entry(muscleId: string, boneId: string, end: "origin" | "insertion") {
  const m = geometry.contacts[muscleId];
  if (!m) return undefined;
  return m[`${end[0]}:${boneId}`] ?? m[`${end === "origin" ? "i" : "o"}:${boneId}`];
}

/** Gap between the muscle's end and the bone, or undefined when the build has no entry. */
export function attachmentGap(muscleId: string, boneId: string, end: "origin" | "insertion"): number | undefined {
  return entry(muscleId, boneId, end)?.[3];
}

/** True unless the geometry shows this mesh never reaches the bone. */
export function reaches(muscleId: string, boneId: string, end: "origin" | "insertion"): boolean {
  const gap = attachmentGap(muscleId, boneId, end);
  return gap === undefined || gap <= MAX_ATTACHMENT_GAP;
}

/**
 * The bone-surface point nearest the end of a muscle that attaches there, or undefined when the
 * mesh does not reach the bone or the build has no entry.
 */
export function contact(muscleId: string, boneId: string, end: "origin" | "insertion"): Vec3 | undefined {
  const e = entry(muscleId, boneId, end);
  if (!e || e[3] > MAX_ATTACHMENT_GAP) return undefined;
  return [e[0], e[1], e[2]];
}
