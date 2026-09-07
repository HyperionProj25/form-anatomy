import { PropertyBinding } from "three";
import { describe, expect, test } from "vitest";
import { catalog, parts, partById, partForSide, partsByKey } from "../src/data/catalog";
import { REGION_ORDER } from "../src/data/regions";

describe("catalog.json", () => {
  test("has 826 parts with unique ids and node names", () => {
    expect(parts.length).toBe(826);
    expect(catalog.meta.partCount).toBe(826);
    expect(new Set(parts.map((p) => p.id)).size).toBe(826);
    expect(new Set(parts.map((p) => p.node)).size).toBe(826);
  });

  test("every part has a valid type, side, region and layer", () => {
    for (const p of parts) {
      expect(["muscle", "bone", "connective"]).toContain(p.type);
      expect(["left", "right", "midline"]).toContain(p.side);
      expect(REGION_ORDER).toContain(p.region);
      expect(["superficial", "deep"]).toContain(p.layer);
      expect(p.centroid.length).toBe(3);
      expect(p.bbox[0][1]).toBeLessThanOrEqual(p.bbox[1][1]);
    }
  });

  test("ids end in -l or -r for bilateral parts and sides are balanced", () => {
    const left = parts.filter((p) => p.side === "left");
    const right = parts.filter((p) => p.side === "right");
    expect(Math.abs(left.length - right.length)).toBeLessThan(6);
    for (const p of left) expect(p.id.endsWith("-l") || /-l-\d+$/.test(p.id)).toBe(true);
    for (const p of right) expect(p.id.endsWith("-r") || /-r-\d+$/.test(p.id)).toBe(true);
    expect(parts.filter((p) => p.side === "midline").length).toBeLessThan(60);
  });

  test("midline parts are true midline structures, not duplicated bilateral pairs", () => {
    const midlineNames = parts.filter((p) => p.side === "midline").map((p) => p.name);
    expect(new Set(midlineNames).size).toBe(midlineNames.length);
  });

  test("model is recentered so the overall bounds straddle the origin", () => {
    const minY = Math.min(...parts.map((p) => p.bbox[0][1]));
    const maxY = Math.max(...parts.map((p) => p.bbox[1][1]));
    expect(minY).toBeLessThan(-0.8);
    expect(maxY).toBeGreaterThan(0.8);
    expect(Math.abs(minY + maxY)).toBeLessThan(0.01);
  });

  test("spot checks match textbook regions", () => {
    const expectRegion = (namePart: string, region: string) => {
      const hits = parts.filter((p) => p.name.toLowerCase().includes(namePart));
      expect(hits.length, namePart).toBeGreaterThan(0);
      for (const h of hits) expect(h.region, h.name).toBe(region);
    };
    expectRegion("gastrocnemius", "leg-foot");
    expectRegion("latissimus dorsi", "back");
    expectRegion("deltoid", "shoulder-arm");
    expectRegion("gluteus", "hip-thigh");
    expectRegion("rectus abdominis", "abdomen-pelvis");
    expectRegion("intercostal", "thorax");
    expectRegion("masseter", "head-neck");
    expectRegion("flexor carpi", "forearm-hand");
    expectRegion("vertebra t", "back");
    expectRegion("femur", "hip-thigh");
    expectRegion("humerus", "shoulder-arm");
  });

  test("layer spot checks", () => {
    const layerOf = (name: string) => parts.find((p) => p.name === name)?.layer;
    expect(layerOf("Soleus Muscle")).toBe("deep");
    expect(layerOf("Gluteus Maximus Muscle")).toBe("superficial");
    expect(layerOf("Subscapularis Muscle")).toBe("deep");
  });

  test("lookups work", () => {
    const gastro = partsByKey("lateral-head-of-gastrocnemius");
    expect(gastro.map((p) => p.side).sort()).toEqual(["left", "right"]);
    expect(partForSide("lateral-head-of-gastrocnemius", "both")?.side).toBe("right");
    expect(partForSide("lateral-head-of-gastrocnemius", "left")?.side).toBe("left");
    expect(partById("lateral-head-of-gastrocnemius-l")?.name).toBe("Lateral Head Of Gastrocnemius");
    expect(partById("nope")).toBeUndefined();
  });

  test("node names stay unique after Three's glTF name sanitizing", () => {
    // GLTFLoader turns "Parietal bone.001" into "Parietal_bone001"; the engine matches on that form.
    const sanitized = parts.map((p) => PropertyBinding.sanitizeNodeName(p.node));
    expect(new Set(sanitized).size).toBe(826);
  });

  test("wiki links are english wikipedia without anchors", () => {
    for (const p of parts)
      if (p.wiki) {
        expect(p.wiki.startsWith("https://en.wikipedia.org/wiki/")).toBe(true);
        expect(p.wiki).not.toContain("#");
      }
    expect(parts.filter((p) => p.wiki).length).toBeGreaterThan(600);
  });
});
