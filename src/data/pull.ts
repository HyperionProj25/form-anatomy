import { attachmentIds } from "./attachments";
import { partById } from "./catalog";
import type { CatalogPart, Vec3 } from "./types";

/** One line of action: from the insertion (moving end) through the muscle to an origin (fixed end). */
export type PullPath = { from: Vec3; via: Vec3; to: Vec3 };

export type Pull = {
  muscleId: string;
  /** Insertion end(s), the conventional moving end. */
  insertion: Vec3[];
  /** Origin end(s), the conventional fixed end. */
  origin: Vec3[];
  paths: PullPath[];
};

const MAX_PATHS = 4;

/**
 * Where a muscle meets a bone, approximated without mesh geometry: the point on the bone's bounding
 * box nearest the muscle's centroid, pulled a quarter of the way toward the bone's centre so it sits
 * inside the bone rather than on a box corner.
 */
export function contactPoint(bone: CatalogPart, towards: Vec3): Vec3 {
  const [min, max] = bone.bbox;
  const clamped: Vec3 = [
    Math.min(Math.max(towards[0], min[0]), max[0]),
    Math.min(Math.max(towards[1], min[1]), max[1]),
    Math.min(Math.max(towards[2], min[2]), max[2]),
  ];
  const c = bone.centroid;
  return [
    clamped[0] + (c[0] - clamped[0]) * 0.25,
    clamped[1] + (c[1] - clamped[1]) * 0.25,
    clamped[2] + (c[2] - clamped[2]) * 0.25,
  ];
}

const dist2 = (a: Vec3, b: Vec3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Lines of action for a muscle from its matched attachments, or undefined when an end is missing. */
export function pullFor(muscle: CatalogPart): Pull | undefined {
  if (muscle.type !== "muscle") return undefined;
  const ids = attachmentIds(muscle);
  if (!ids || !ids.origin.length || !ids.insertion.length) return undefined;
  const c = muscle.centroid;
  const points = (list: string[]) =>
    list
      .map((id) => partById(id))
      .filter((p): p is CatalogPart => !!p)
      .map((bone) => contactPoint(bone, c))
      .sort((a, b) => dist2(a, c) - dist2(b, c));
  const origin = points(ids.origin);
  const insertion = points(ids.insertion);
  if (!origin.length || !insertion.length) return undefined;
  const paths: PullPath[] = [];
  for (const from of insertion.slice(0, 2))
    for (const to of origin.slice(0, 2)) {
      if (paths.length >= MAX_PATHS) break;
      paths.push({ from, via: c, to });
    }
  return { muscleId: muscle.id, insertion, origin, paths };
}
