import type { Structure } from "./viewer";

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
