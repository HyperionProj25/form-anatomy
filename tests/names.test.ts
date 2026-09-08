import { describe, expect, test } from "vitest";
import { parts } from "../src/data/catalog";
import {
  displayName,
  latinName,
  loadNamePref,
  prettyName,
  saveNamePref,
  secondaryName,
} from "../src/data/names";

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

describe("prettyName", () => {
  test("drops the Muscle suffix and title case; tokens with digits keep their case", () => {
    expect(prettyName("Soleus Muscle")).toBe("Soleus");
    expect(prettyName("Lateral Head Of Gastrocnemius")).toBe("Lateral head of gastrocnemius");
    expect(prettyName("Opponens Digiti Minimi Muscle Of Hand")).toBe("Opponens digiti minimi of hand");
    expect(prettyName("Vertebra T5")).toBe("Vertebra T5");
    expect(prettyName("Rectus Capitis Posterior Major (C1)")).toBe("Rectus capitis posterior major (C1)");
    expect(prettyName("Thyro-Arytenoid Muscle")).toBe("Thyro-arytenoid");
    expect(prettyName("Femur")).toBe("Femur");
  });

  test("every catalog name keeps something to show", () => {
    for (const p of parts) expect(prettyName(p.name).length).toBeGreaterThan(0);
  });
});

describe("names", () => {
  const gastro = parts.find((p) => p.key === "lateral-head-of-gastrocnemius")!;
  const femur = parts.find((p) => p.key === "femur")!;
  const noWiki = parts.find((p) => !p.wiki)!;

  test("latin names come from Wikidata labels, capitalised", () => {
    expect(latinName(gastro)).toBe("Musculus gastrocnemius (lateral head)");
    expect(latinName(femur)).toBe("Os femoris");
    expect(latinName(noWiki)).toBeUndefined();
  });

  test("displayName reads in sentence case and secondaryName shows the other language", () => {
    expect(displayName(gastro, "english")).toBe("Lateral head of gastrocnemius");
    expect(displayName(gastro, "latin")).toBe("Musculus gastrocnemius (lateral head)");
    expect(secondaryName(gastro, "latin")).toBe("Lateral head of gastrocnemius");
    expect(secondaryName(gastro, "english")).toBe("Musculus gastrocnemius (lateral head)");
    expect(displayName(noWiki, "latin")).toBe(prettyName(noWiki.name));
    expect(secondaryName(noWiki, "latin")).toBeUndefined();
    expect(secondaryName(femur, "latin")).toBe("Femur");
    const same = parts.find((p) => latinName(p) === prettyName(p.name));
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

describe("shared Latin labels", () => {
  test("parts that share an article get an English qualifier; unshared labels stay plain", () => {
    const byKey = (k: string) => parts.find((p) => p.key === k)!;
    expect(latinName(byKey("medial-head-of-gastrocnemius"))).toBe("Musculus gastrocnemius (medial head)");
    expect(latinName(byKey("descending-part-of-trapezius-muscle"))).toBe("Musculus trapezius (descending part)");
    expect(latinName(byKey("clavicular-head-of-pectoralis-major-muscle"))).toBe("Musculus pectoralis major (clavicular head)");
    expect(latinName(byKey("deep-part-of-masseter"))).toBe("Musculus masseter (deep part)");
    const t5 = latinName(byKey("vertebra-t5"));
    if (t5) expect(t5).toMatch(/\(T5\)$/);
    expect(latinName(byKey("soleus-muscle"))).toBe("Musculus soleus");
    expect(latinName(byKey("femur"))).toBe("Os femoris");
  });
});
