import { describe, expect, test } from "vitest";
import { parts } from "../src/data/catalog";
import { displayName, latinName, loadNamePref, saveNamePref, secondaryName } from "../src/data/names";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

describe("names", () => {
  const gastro = parts.find((p) => p.key === "lateral-head-of-gastrocnemius")!;
  const femur = parts.find((p) => p.key === "femur")!;
  const noWiki = parts.find((p) => !p.wiki)!;

  test("latin names come from Wikidata labels, capitalised", () => {
    expect(latinName(gastro)).toBe("Musculus gastrocnemius");
    expect(latinName(femur)).toBe("Os femoris");
    expect(latinName(noWiki)).toBeUndefined();
  });

  test("displayName falls back to English and secondaryName shows the other language", () => {
    expect(displayName(gastro, "english")).toBe("Lateral Head Of Gastrocnemius");
    expect(displayName(gastro, "latin")).toBe("Musculus gastrocnemius");
    expect(secondaryName(gastro, "latin")).toBe("Lateral Head Of Gastrocnemius");
    expect(secondaryName(gastro, "english")).toBe("Musculus gastrocnemius");
    expect(displayName(noWiki, "latin")).toBe(noWiki.name);
    expect(secondaryName(noWiki, "latin")).toBeUndefined();
    expect(secondaryName(femur, "latin")).toBe("Femur");
    const same = parts.find((p) => latinName(p) === p.name);
    if (same) expect(secondaryName(same, "latin")).toBeUndefined(); // identical in both languages
  });

  test("preference round-trips and defaults to English", () => {
    const s = fakeStorage();
    expect(loadNamePref(s)).toBe("english");
    saveNamePref("latin", s);
    expect(loadNamePref(s)).toBe("latin");
    s.setItem("form.names.v1", "klingon");
    expect(loadNamePref(s)).toBe("english");
  });
});
