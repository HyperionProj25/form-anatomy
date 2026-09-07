import { describe, expect, test } from "vitest";
import { computeStyles, type StyleInput } from "../src/viewer/appearance";
import type { CatalogPart } from "../src/data/types";

const part = (id: string, type: CatalogPart["type"], name = id): CatalogPart => ({
  id,
  node: id,
  key: id,
  name,
  type,
  side: "left",
  region: "leg-foot",
  layer: "superficial",
  centroid: [0, 0, 0],
  bbox: [
    [0, 0, 0],
    [0, 0, 0],
  ],
});
const gastro = part("gastro", "muscle", "Lateral Head Of Gastrocnemius");
const soleus = part("soleus", "muscle", "Soleus Muscle");
const femur = part("femur", "bone", "Femur");
const bursa = part("bursa", "connective", "Anserine Bursa");
const base: StyleInput = {
  parts: [gastro, soleus, femur, bursa],
  mode: "muscles",
  selected: null,
  hidden: new Set(),
  isolated: false,
  opacity: 1,
  lineColor: "#bd914b",
  lineKeys: new Set(["gastro"]),
};

describe("computeStyles", () => {
  test("muscles mode shows everything at full opacity with default colors", () => {
    const s = computeStyles(base);
    expect(s.get("gastro")).toEqual({
      visible: true,
      color: "#a35b4c",
      emissive: "#000000",
      emissiveIntensity: 0,
      opacity: 1,
    });
    expect(s.get("femur")?.color).toBe("#e0d3b7");
    expect(s.get("bursa")?.color).toBe("#dbd4bb");
  });

  test("selected part is green and always visible even when isolated hides the rest", () => {
    const s = computeStyles({ ...base, selected: "gastro", isolated: true });
    expect(s.get("gastro")).toMatchObject({ visible: true, color: "#477965", emissive: "#204d3a" });
    expect(s.get("femur")?.visible).toBe(false);
  });

  test("hidden ids are invisible", () => {
    const s = computeStyles({ ...base, hidden: new Set(["femur"]) });
    expect(s.get("femur")?.visible).toBe(false);
    expect(s.get("gastro")?.visible).toBe(true);
  });

  test("bones mode hides non-bone parts unless selected and applies opacity to bones", () => {
    const s = computeStyles({ ...base, mode: "bones", opacity: 0.5 });
    expect(s.get("gastro")?.visible).toBe(false);
    expect(s.get("femur")).toMatchObject({ visible: true, opacity: 0.5 });
    expect(computeStyles({ ...base, mode: "bones", selected: "gastro" }).get("gastro")?.visible).toBe(true);
  });

  test("fascia mode colors line muscles by catalog key and fades others", () => {
    const s = computeStyles({ ...base, mode: "fascia" });
    expect(s.get("gastro")).toMatchObject({ color: "#bd914b", emissive: "#bd914b", opacity: 1 });
    expect(s.get("femur")?.opacity).toBe(1);
    expect(s.get("soleus")?.opacity).toBe(0.1);
    const other = computeStyles({ ...base, mode: "fascia", lineKeys: new Set(["soleus"]) });
    expect(other.get("gastro")?.opacity).toBe(0.1);
    expect(other.get("soleus")?.opacity).toBe(1);
  });

  test("muscle opacity applies to muscles in muscles mode but not to bones", () => {
    const s = computeStyles({ ...base, opacity: 0.4 });
    expect(s.get("gastro")?.opacity).toBe(0.4);
    expect(s.get("femur")?.opacity).toBe(1);
  });

  test("outside fascia mode a focus fades everything else so a deep target shows", () => {
    const s = computeStyles({ ...base, focusIds: new Set(["soleus"]) });
    expect(s.get("soleus")).toMatchObject({ opacity: 1, emissiveIntensity: 0.45, emissive: "#bd914b" });
    expect(s.get("gastro")?.opacity).toBe(0.28);
    expect(s.get("femur")?.opacity).toBe(0.28);
  });

  test("a focused tour part glows and the rest of the chain dims", () => {
    const s = computeStyles({
      ...base,
      mode: "fascia",
      lineKeys: new Set(["gastro", "soleus"]),
      focusIds: new Set(["soleus"]),
    });
    expect(s.get("soleus")).toMatchObject({ emissiveIntensity: 0.45, opacity: 1 });
    expect(s.get("gastro")?.opacity).toBe(0.55);
  });
});
