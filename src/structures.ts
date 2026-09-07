import type { CatalogPart } from "./data/types";

/** Shape the phase 1 UI expects. Removed in Task 5 when panels read the catalog directly. */
export type Structure = { id: string; name: string; detail: string; type: string; wiki?: string };

export function toStructure(p: CatalogPart): Structure {
  return { id: p.id, name: p.name, detail: p.group ?? "", type: p.type, wiki: p.wiki };
}

/** Keep the first structure for each case-insensitive name (left/right pairs collapse to one). */
export function uniqueByName(list: Structure[]): Structure[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
