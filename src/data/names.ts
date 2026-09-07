import { parts } from "./catalog";
import { factsForWiki } from "./facts";
import type { CatalogPart } from "./types";

export type NameLang = "english" | "latin";

const PREF_KEY = "form.names.v1";

/** Catalog groups per Wikipedia article: several heads or parts often share one article and Latin label. */
const groupsPerWiki = new Map<string, Set<string>>();
for (const p of parts) {
  if (!p.wiki) continue;
  const set = groupsPerWiki.get(p.wiki) ?? new Set<string>();
  set.add(p.key);
  groupsPerWiki.set(p.wiki, set);
}

/**
 * English qualifier for a part whose Latin label is shared: "lateral head", "descending part",
 * "T5", or the whole English name when it has no "… of …" shape.
 */
function qualifier(part: CatalogPart): string | undefined {
  if (!part.wiki || (groupsPerWiki.get(part.wiki)?.size ?? 0) < 2) return undefined;
  const ofShape = /^(.+?) [Oo]f /.exec(part.name);
  if (ofShape) return ofShape[1].toLowerCase();
  const vertebra = /^Vertebra (\w+)$/i.exec(part.name);
  if (vertebra) return vertebra[1].toUpperCase();
  return part.name.toLowerCase();
}

/** Latin label for a part's Wikipedia article, if Wikidata has one, qualified when several parts share it. */
export function latinName(part: CatalogPart): string | undefined {
  const latin = factsForWiki(part.wiki)?.latin?.trim();
  if (!latin) return undefined;
  const base = latin[0].toUpperCase() + latin.slice(1);
  const q = qualifier(part);
  return q ? `${base} (${q})` : base;
}

/** Primary label in the chosen language, falling back to English when no Latin label exists. */
export function displayName(part: CatalogPart, lang: NameLang): string {
  if (lang === "latin") return latinName(part) ?? part.name;
  return part.name;
}

/** The other language's name when it differs from the primary label, else undefined. */
export function secondaryName(part: CatalogPart, lang: NameLang): string | undefined {
  const primary = displayName(part, lang);
  const other = lang === "latin" ? part.name : latinName(part);
  return other && other !== primary ? other : undefined;
}

function storageOr(storage?: Storage): Storage | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadNamePref(storage?: Storage): NameLang {
  try {
    return storageOr(storage)?.getItem(PREF_KEY) === "latin" ? "latin" : "english";
  } catch {
    return "english";
  }
}

export function saveNamePref(lang: NameLang, storage?: Storage): void {
  try {
    storageOr(storage)?.setItem(PREF_KEY, lang);
  } catch {
    // Preference is a convenience only.
  }
}
