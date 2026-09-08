import { attachmentsFor } from "./attachments";
import { parts } from "./catalog";
import type { CatalogPart } from "./types";

export type JointId = "tmj" | "shoulder" | "elbow" | "wrist" | "hip" | "knee" | "ankle";

export const JOINT_IDS: JointId[] = ["tmj", "shoulder", "elbow", "wrist", "hip", "knee", "ankle"];

export const JOINT_LABELS: Record<JointId, string> = {
  tmj: "Jaw (TMJ)",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
};

const boneKeys = [...new Set(parts.filter((p) => p.type === "bone").map((p) => p.key))];
const keysMatching = (re: RegExp) => boneKeys.filter((k) => re.test(k));

const HAND = keysMatching(
  /-of-hand$|-metacarpal-bone$|^(?:scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate)-bone$/,
);
const FOOT = keysMatching(
  /-of-foot$|-metatarsal-bone$|^(?:talus|calcaneus)$|^(?:navicular|cuboid)-bone$|-cuneiform-bone$|^sesamoid-bones-of-foot$/,
);
const VERTEBRAE = keysMatching(/^vertebra-|^atlas-c1$|^axis-c2$/);
const RIBS = keysMatching(/-rib$/);
const TRUNK = [
  ...VERTEBRAE,
  ...RIBS,
  "sacrum",
  "coccyx",
  "hip-bone",
  "manubrium-of-sternum",
  "body-of-sternum",
  "xiphoid-process",
  "occipital-bone",
];
const SKULL = [
  "temporal-bone",
  "sphenoid-bone",
  "zygomatic-bone",
  "maxilla",
  "frontal-bone",
  "parietal-bone",
  "occipital-bone",
  "palatine-bone",
];

/**
 * A muscle crosses a joint when its matched attachments include a bone on the near side and a bone
 * beyond the joint. `distal` lists every bone further along the limb, so two-joint muscles appear at
 * both joints, which is correct.
 */
export const JOINTS: Record<JointId, { proximal: string[]; distal: string[] }> = {
  tmj: { proximal: SKULL, distal: ["mandible"] },
  shoulder: {
    proximal: ["scapula", "clavicle", ...TRUNK],
    distal: ["humerus", "radius", "ulna", ...HAND],
  },
  elbow: { proximal: ["humerus", "scapula", "clavicle"], distal: ["radius", "ulna", ...HAND] },
  wrist: { proximal: ["radius", "ulna", "humerus"], distal: HAND },
  hip: {
    proximal: ["hip-bone", "sacrum", "coccyx", "vertebra-t12", ...keysMatching(/^vertebra-l/)],
    distal: ["femur", "patella", "tibia", "fibula", ...FOOT],
  },
  knee: {
    proximal: ["femur", "hip-bone", "sacrum", "coccyx", ...keysMatching(/^vertebra-l/)],
    distal: ["patella", "tibia", "fibula", ...FOOT],
  },
  ankle: { proximal: ["tibia", "fibula", "femur"], distal: FOOT },
};

const cache = new Map<string, Set<string>>();

/** Every bone key a muscle attaches to, either end, cached by catalog key. */
function boneSet(part: CatalogPart): Set<string> {
  const hit = cache.get(part.key);
  if (hit) return hit;
  const a = attachmentsFor(part);
  const set = new Set(a ? [...a.origin, ...a.insertion] : []);
  cache.set(part.key, set);
  return set;
}

export function crossesJoint(part: CatalogPart, joint: JointId): boolean {
  if (part.type !== "muscle") return false;
  const bones = boneSet(part);
  if (!bones.size) return false;
  const j = JOINTS[joint];
  return j.proximal.some((k) => bones.has(k)) && j.distal.some((k) => bones.has(k));
}

export function jointsCrossed(part: CatalogPart): JointId[] {
  return JOINT_IDS.filter((j) => crossesJoint(part, j));
}

/** Catalog keys (one per bilateral pair) of muscles crossing a joint, sorted by name. */
export function musclesCrossing(joint: JointId): string[] {
  const seen = new Set<string>();
  const out: CatalogPart[] = [];
  for (const p of parts) {
    if (seen.has(p.key) || !crossesJoint(p, joint)) continue;
    seen.add(p.key);
    out.push(p);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name)).map((p) => p.key);
}

/** "Jaw (TMJ)" -> "jaw (TMJ)", for sentences such as "Move the jaw (TMJ)". */
export function jointPhrase(joint: JointId): string {
  return JOINT_LABELS[joint].replace(/^[A-Z]/, (c) => c.toLowerCase());
}
