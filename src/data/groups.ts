import { partMatches } from "./catalog";
import { crossesJoint } from "./joints";
import { latinName } from "./names";
import type { CatalogPart, Layer, PartType, Region } from "./types";
import type { Filters, Mode } from "../state/store";

export type PartGroup = {
  key: string;
  name: string;
  type: PartType;
  region: Region;
  layer: Layer;
  /** Ordered left, right, midline. */
  parts: CatalogPart[];
  bilateral: boolean;
};

const SIDE_ORDER = { left: 0, right: 1, midline: 2 } as const;

/** One entry per side-agnostic key, sorted by display name. */
export function groupParts(list: CatalogPart[]): PartGroup[] {
  const byKey = new Map<string, PartGroup>();
  for (const p of list) {
    const g = byKey.get(p.key);
    if (g) g.parts.push(p);
    else
      byKey.set(p.key, {
        key: p.key,
        name: p.name,
        type: p.type,
        region: p.region,
        layer: p.layer,
        parts: [p],
        bilateral: false,
      });
  }
  const groups = [...byKey.values()];
  for (const g of groups) {
    g.parts.sort((a, b) => SIDE_ORDER[a.side] - SIDE_ORDER[b.side]);
    g.bilateral = g.parts.some((p) => p.side === "left") && g.parts.some((p) => p.side === "right");
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

/** Parts visible in the library for a mode and filter set. */
export function filterParts(all: CatalogPart[], mode: Mode, filters: Filters): CatalogPart[] {
  const type: PartType = mode === "bones" ? "bone" : "muscle";
  const needle = filters.search.trim();
  return all.filter(
    (p) =>
      p.type === type &&
      (filters.region === "all" || p.region === filters.region) &&
      (mode === "bones" || filters.layer === "all" || p.layer === filters.layer) &&
      (filters.side === "both" || p.side === "midline" || p.side === filters.side) &&
      (filters.joint === "all" || p.type !== "muscle" || crossesJoint(p, filters.joint)) &&
      (!needle || partMatches(p, needle) || matchesLatin(p, needle)),
  );
}

function matchesLatin(p: CatalogPart, needle: string): boolean {
  return latinName(p)?.toLowerCase().includes(needle.toLowerCase()) ?? false;
}
