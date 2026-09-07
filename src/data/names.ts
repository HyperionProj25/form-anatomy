import { factsForWiki } from "./facts";
import type { CatalogPart } from "./types";

export type NameLang = "english" | "latin";

const PREF_KEY = "form.names.v1";

/** Latin label for a part's Wikipedia article, if Wikidata has one. */
export function latinName(part: CatalogPart): string | undefined {
  const latin = factsForWiki(part.wiki)?.latin?.trim();
  if (!latin) return undefined;
  return latin[0].toUpperCase() + latin.slice(1);
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
