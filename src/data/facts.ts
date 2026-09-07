import raw from "./facts.json";

export type FactEntry = {
  title: string;
  url: string;
  template: "muscle" | "bone" | "other";
  origin?: string;
  insertion?: string;
  action?: string;
  nerve?: string;
  antagonist?: string;
  articulations?: string;
  blood?: string;
  /** Latin (Terminologia-style) label from Wikidata, CC0. */
  latin?: string;
  revision: number;
  retrieved: string;
};
/** Keyed by the article title as it appears in the catalog wiki URL (decoded, spaces). */
export type Facts = Record<string, FactEntry>;

export const facts = raw as Facts;

/** "https://en.wikipedia.org/wiki/Gastrocnemius_muscle" -> "Gastrocnemius muscle". */
export function wikiTitle(url: string): string {
  return decodeURIComponent(url.replace("https://en.wikipedia.org/wiki/", "")).replaceAll("_", " ");
}

export function factsForWiki(url: string | undefined): FactEntry | undefined {
  return url ? facts[wikiTitle(url)] : undefined;
}
