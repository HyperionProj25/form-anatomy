import raw from "./catalog.json";
import type { Catalog, CatalogPart, Side } from "./types";

export const catalog = raw as Catalog;
export const parts: CatalogPart[] = catalog.parts;

const byId = new Map(parts.map((p) => [p.id, p]));
const byNode = new Map(parts.map((p) => [p.node, p]));
const byKey = new Map<string, CatalogPart[]>();
for (const p of parts) {
  const list = byKey.get(p.key);
  if (list) list.push(p);
  else byKey.set(p.key, [p]);
}

/** GLB node name -> catalog id, used by the engine to label meshes. */
export const nodeToId = new Map(parts.map((p) => [p.node, p.id]));

export function partById(id: string): CatalogPart | undefined {
  return byId.get(id);
}
export function partByNode(node: string): CatalogPart | undefined {
  return byNode.get(node);
}
export function partsByKey(key: string): CatalogPart[] {
  return byKey.get(key) ?? [];
}
export function isPartId(id: string): boolean {
  return byId.has(id);
}
/** Pick one side of a key: the requested side, else right, else whatever exists. */
export function partForSide(key: string, side: Side | "both"): CatalogPart | undefined {
  const list = partsByKey(key);
  if (!list.length) return undefined;
  if (side !== "both") {
    const exact = list.find((p) => p.side === side);
    if (exact) return exact;
  }
  return list.find((p) => p.side === "right") ?? list[0];
}
/** Search "name group" text for a case-insensitive substring. */
export function partMatches(p: CatalogPart, needle: string): boolean {
  const n = needle.toLowerCase();
  return p.name.toLowerCase().includes(n) || (p.group?.toLowerCase().includes(n) ?? false);
}
