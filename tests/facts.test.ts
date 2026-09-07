import { describe, expect, test } from "vitest";
import { parts } from "../src/data/catalog";
import { facts, factsForWiki, wikiTitle } from "../src/data/facts";

describe("facts.json", () => {
  test("every entry is clean plain text with provenance", () => {
    const entries = Object.entries(facts);
    expect(entries.length).toBeGreaterThan(150);
    for (const [title, e] of entries) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.url.startsWith("https://en.wikipedia.org/wiki/")).toBe(true);
      expect(e.revision).toBeGreaterThan(0);
      expect(e.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const field of ["origin", "insertion", "action", "nerve", "antagonist", "articulations", "blood"] as const) {
        const v = e[field];
        if (v === undefined) continue;
        expect(v, `${title}.${field}`).not.toMatch(/\[\[|\{\{|<\/?\w|&\w+;|\]\]/);
        expect(v.length, `${title}.${field}`).toBeGreaterThan(1);
      }
    }
  });

  test("keys are catalog wiki titles and most muscles have origin and action", () => {
    const titles = new Set(parts.filter((p) => p.wiki).map((p) => wikiTitle(p.wiki!)));
    for (const key of Object.keys(facts)) expect(titles.has(key), key).toBe(true);
    const muscleTitles = [...new Set(parts.filter((p) => p.type === "muscle" && p.wiki).map((p) => wikiTitle(p.wiki!)))];
    const covered = muscleTitles.filter((t) => facts[t]?.origin && facts[t]?.action);
    expect(covered.length / muscleTitles.length).toBeGreaterThan(0.7);
  });

  test("most entries carry a clean Latin label from Wikidata", () => {
    const withLatin = Object.values(facts).filter((e) => e.latin);
    expect(withLatin.length).toBeGreaterThan(150);
    for (const e of withLatin) {
      expect(e.latin, e.title).not.toMatch(/\[\[|\{\{|</);
      expect(e.latin!.length).toBeGreaterThan(2);
    }
    expect(facts["Gastrocnemius muscle"]?.latin).toBe("Musculus gastrocnemius");
  });

  test("lookup by catalog wiki url", () => {
    const gastro = parts.find((p) => p.name === "Lateral Head Of Gastrocnemius");
    expect(factsForWiki(gastro?.wiki)?.origin).toContain("condyle");
    expect(factsForWiki(undefined)).toBeUndefined();
  });
});
