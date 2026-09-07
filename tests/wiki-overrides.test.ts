import { describe, expect, test } from "vitest";
import { parts, partsByKey } from "../src/data/catalog";
import { facts, wikiTitle } from "../src/data/facts";
import { WIKI_OVERRIDES, wikiUrl } from "../scripts/wiki-overrides";

describe("wiki overrides", () => {
  test("every override names a real catalog part and is applied to all its sides", () => {
    for (const [key, title] of Object.entries(WIKI_OVERRIDES)) {
      const ps = partsByKey(key);
      expect(ps.length, key).toBeGreaterThan(0);
      for (const p of ps) expect(p.wiki, key).toBe(wikiUrl(title));
    }
  });

  test("overridden articles have facts, so the quadriceps parts no longer share one entry", () => {
    for (const title of new Set(Object.values(WIKI_OVERRIDES))) {
      expect(facts[title], title).toBeDefined();
    }
    const quads = ["rectus-femoris-muscle", "vastus-lateralis-muscle", "vastus-medialis-muscle", "vastus-intermedius-muscle"];
    const origins = new Set(quads.map((k) => facts[wikiTitle(partsByKey(k)[0].wiki!)]?.origin));
    expect(origins.size).toBe(4);
  });

  test("every muscle in the model has a Wikipedia link", () => {
    const unlinked = parts.filter((p) => p.type === "muscle" && !p.wiki).map((p) => p.key);
    expect([...new Set(unlinked)]).toEqual([]);
  });
});
