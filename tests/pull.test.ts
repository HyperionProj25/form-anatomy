import { describe, expect, test } from "vitest";
import { partById } from "../src/data/catalog";
import { contactPoint, pullFor } from "../src/data/pull";

describe("pull direction", () => {
  test("gastrocnemius pulls from the calcaneus up toward the femur", () => {
    const pull = pullFor(partById("lateral-head-of-gastrocnemius-r")!)!;
    expect(pull).toBeDefined();
    expect(pull.paths.length).toBeGreaterThan(0);
    const { from, to, via } = pull.paths[0];
    expect(to[1]).toBeGreaterThan(via[1]); // origin (femur) above the muscle
    expect(from[1]).toBeLessThan(via[1]); // insertion (calcaneus) below it
    expect(pull.origin.length).toBe(1);
    expect(pull.insertion.length).toBe(1);
  });

  test("biceps pulls from the radius up toward the scapula, and bones have no pull", () => {
    const pull = pullFor(partById("long-head-of-biceps-brachii-r")!)!;
    expect(pull.paths[0].to[1]).toBeGreaterThan(pull.paths[0].from[1]);
    expect(pullFor(partById("femur-r")!)).toBeUndefined();
  });

  test("contact points stay inside the bone's box and lean toward its centre", () => {
    const femur = partById("femur-r")!;
    const far: [number, number, number] = [femur.centroid[0], femur.bbox[0][1] - 1, femur.centroid[2]];
    const p = contactPoint(femur, far);
    expect(p[1]).toBeGreaterThanOrEqual(femur.bbox[0][1]);
    expect(p[1]).toBeLessThanOrEqual(femur.bbox[1][1]);
    expect(p[1]).toBeGreaterThan(femur.bbox[0][1]); // pulled up from the bottom face
  });
});
