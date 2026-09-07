import { partForSide } from "../data/catalog";
import { stopSides, type Anchor, type Line } from "../data/lines";
import type { Side, Vec3 } from "../data/types";

export type LinePath = { side: "left" | "right"; points: Vec3[] };

/** Anchor position for a side: the anchor part's centroid plus a side-relative offset. */
export function anchorPoint(anchor: Anchor, side: Side): Vec3 | null {
  const part = partForSide(anchor.key, side);
  if (!part) return null;
  const sign = side === "left" ? 1 : side === "right" ? -1 : part.centroid[0] >= 0 ? 1 : -1;
  const [lateral, up, forward] = anchor.offset;
  return [part.centroid[0] + sign * lateral, part.centroid[1] + up, part.centroid[2] + forward];
}

function stopPoint(line: Line, index: number, side: Side): Vec3 | null {
  const stop = line.path[index];
  if (stop.key) return partForSide(stop.key, side)?.centroid ?? null;
  return stop.anchor ? anchorPoint(stop.anchor, side) : null;
}

/** Ordered centroid polylines for a line, one starting on each body side. Vias are inserted between stops. */
export function linePaths(line: Line): LinePath[] {
  return (["right", "left"] as const).map((start) => {
    const sides = stopSides(line, start);
    const points: Vec3[] = [];
    line.path.forEach((stop, i) => {
      const p = stopPoint(line, i, sides[i]);
      if (p) points.push(p);
      const via = stop.transition?.via;
      if (via && i < line.path.length - 1) {
        // A via sits between this stop and the next; for a crossing it belongs to the next side.
        const v = anchorPoint(via.anchor, sides[i + 1]);
        if (v) points.push(v);
      }
    });
    return { side: start, points };
  });
}
