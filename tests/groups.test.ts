import { describe, expect, test } from "vitest";
import { filterParts, firstMatch, groupParts } from "../src/data/groups";
import { parts } from "../src/data/catalog";
import { initialState } from "../src/state/store";

describe("groupParts", () => {
  test("collapses left and right copies into one group sorted by name", () => {
    const groups = groupParts(parts.filter((p) => p.type === "muscle"));
    const gastro = groups.find((g) => g.key === "lateral-head-of-gastrocnemius");
    expect(gastro?.bilateral).toBe(true);
    expect(gastro?.parts.map((p) => p.side)).toEqual(["left", "right"]);
    expect(groups.length).toBeLessThan(parts.filter((p) => p.type === "muscle").length);
    const names = groups.map((g) => g.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("filterParts", () => {
  const f = initialState.filters;
  test("mode selects the part type", () => {
    expect(filterParts(parts, "muscles", f).every((p) => p.type === "muscle")).toBe(true);
    expect(filterParts(parts, "bones", f).every((p) => p.type === "bone")).toBe(true);
    expect(filterParts(parts, "fascia", f).every((p) => p.type === "muscle")).toBe(true);
  });
  test("region, layer and side filters narrow the list; midline parts survive a side filter", () => {
    const hip = filterParts(parts, "muscles", { ...f, region: "hip-thigh" });
    expect(hip.length).toBeGreaterThan(10);
    expect(hip.every((p) => p.region === "hip-thigh")).toBe(true);
    const deep = filterParts(parts, "muscles", { ...f, layer: "deep" });
    expect(deep.every((p) => p.layer === "deep")).toBe(true);
    const left = filterParts(parts, "bones", { ...f, side: "left" });
    expect(left.some((p) => p.side === "midline")).toBe(true);
    expect(left.some((p) => p.side === "right")).toBe(false);
  });
  test("search matches name or group text case-insensitively", () => {
    const hits = filterParts(parts, "muscles", { ...f, search: "GASTROC" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((p) => /gastrocnemius/i.test(`${p.name} ${p.group ?? ""}`))).toBe(true);
  });
  test("layer filter is ignored in bones mode", () => {
    const bones = filterParts(parts, "bones", { ...f, layer: "deep" });
    expect(bones.length).toBeGreaterThan(100);
  });
});

describe("firstMatch", () => {
  const f = initialState.filters;
  test("prefers a name that starts with the search text, else the first listed; empty search matches nothing", () => {
    const pect = groupParts(filterParts(parts, "muscles", { ...f, search: "pect" }));
    expect(pect[0].name).not.toMatch(/^Pect/);
    expect(firstMatch(pect, "pect")?.name).toMatch(/^Pect/);
    const gastro = groupParts(filterParts(parts, "muscles", { ...f, search: "gastrocnemius" }));
    expect(firstMatch(gastro, "gastrocnemius")?.name).toBe(gastro[0].name);
    expect(firstMatch(gastro, "")).toBeUndefined();
    expect(firstMatch([], "zzz")).toBeUndefined();
  });
});
