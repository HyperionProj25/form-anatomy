import { describe, expect, test } from "vitest";
import { lineById } from "../src/data/lines";
import { linePaths, anchorPoint } from "../src/viewer/paths";
import { partForSide } from "../src/data/catalog";

describe("linePaths", () => {
  test("produces one polyline per starting side with a point per stop plus vias", () => {
    const sbl = lineById("sbl")!;
    const paths = linePaths(sbl);
    expect(paths.map((p) => p.side)).toEqual(["right", "left"]);
    // 5 stops + 1 via (sacrotuberous ligament)
    expect(paths[0].points.length).toBe(6);
    expect(paths[1].points.length).toBe(6);
    // right-side path stays on negative x (subject's right), left on positive x
    expect(paths[0].points.every((p) => p[0] <= 0.02)).toBe(true);
    expect(paths[1].points.every((p) => p[0] >= -0.02)).toBe(true);
    // runs from the foot upward
    expect(paths[0].points[0][1]).toBeLessThan(paths[0].points[5][1]);
  });

  test("crossing lines switch body side at the crossing stop", () => {
    const bfl = lineById("bfl")!;
    const right = linePaths(bfl)[0].points; // lat right, TLF midline, glute left, vastus left
    expect(right[0][0]).toBeLessThan(0);
    expect(Math.abs(right[1][0])).toBeLessThan(0.02);
    expect(right[2][0]).toBeGreaterThan(0);
    expect(right[3][0]).toBeGreaterThan(0);
  });

  test("anchors offset laterally away from the midline for the given side", () => {
    const calcR = partForSide("calcaneus", "right")!;
    const p = anchorPoint({ key: "calcaneus", offset: [0.05, 0, 0] }, "right")!;
    expect(p[0]).toBeCloseTo(calcR.centroid[0] - 0.05, 5);
    const q = anchorPoint({ key: "calcaneus", offset: [0.05, 0, 0] }, "left")!;
    expect(q[0]).toBeGreaterThan(calcR.centroid[0]);
  });
});
