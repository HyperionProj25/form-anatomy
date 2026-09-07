import { describe, expect, test } from "vitest";
import { JOINT_IDS } from "../src/data/joints";
import { angleAt, cableRoles, motionSetup, rotatePoint, type Cable } from "../src/data/motion";

const keys = (c: Cable[]) => c.map((x) => x.key);

describe("joint motion geometry", () => {
  test("rotatePoint turns about an axis through the pivot", () => {
    const p = rotatePoint([0, -1, 0], [0, 0, 0], [1, 0, 0], Math.PI / 2);
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(0);
    expect(p[2]).toBeCloseTo(-1);
    const q = rotatePoint([1, 2, 3], [1, 2, 3], [0, 1, 0], 1);
    expect(q).toEqual([1, 2, 3]);
  });

  test("elbow: forearm and hand move, humerus stays, flexors shorten and triceps lengthens", () => {
    const s = motionSetup("elbow", "right")!;
    expect(s.movingIds).toContain("radius-r");
    expect(s.movingIds).toContain("ulna-r");
    expect(s.movingIds).not.toContain("humerus-r");
    expect(s.movingIds.some((id) => id.startsWith("third-metacarpal"))).toBe(true);
    expect(s.hiddenIds).toContain("brachialis-muscle-r");
    expect(s.movingIds).not.toContain("brachialis-muscle-r");
    const { shortens, lengthens } = cableRoles(s);
    expect(keys(shortens)).toEqual(
      expect.arrayContaining(["long-head-of-biceps-brachii", "brachialis-muscle", "brachioradialis-muscle"]),
    );
    expect(keys(lengthens)).toContain("long-head-of-triceps-brachii");
    expect(angleAt(s, 1)).toBeCloseTo((120 * Math.PI) / 180);
  });

  test("knee: hamstrings and gastrocnemius shorten, quadriceps lengthen, soleus rides with the leg", () => {
    const s = motionSetup("knee", "right")!;
    const { shortens, lengthens } = cableRoles(s);
    expect(keys(shortens)).toEqual(
      expect.arrayContaining(["semitendinosus-muscle", "lateral-head-of-gastrocnemius"]),
    );
    expect(keys(lengthens)).toEqual(expect.arrayContaining(["vastus-lateralis-muscle", "rectus-femoris-muscle"]));
    expect(s.movingIds).toContain("soleus-muscle-r");
    expect(s.movingIds).toContain("tibia-r");
    expect(s.movingIds).not.toContain("femur-r");
  });

  test("ankle plantarflexion: calf shortens, tibialis anterior lengthens", () => {
    const s = motionSetup("ankle", "right")!;
    const { shortens, lengthens } = cableRoles(s);
    expect(keys(shortens)).toEqual(expect.arrayContaining(["soleus-muscle", "lateral-head-of-gastrocnemius"]));
    expect(keys(lengthens)).toContain("tibialis-anterior-muscle");
    expect(s.movingIds).toContain("calcaneus-r");
  });

  test("hip flexion: iliacus shortens, gluteus maximus lengthens", () => {
    const s = motionSetup("hip", "right")!;
    const { shortens, lengthens } = cableRoles(s);
    expect(keys(shortens)).toContain("iliacus-muscle");
    expect(keys(lengthens)).toContain("gluteus-maximus-muscle");
    expect(s.movingIds).toContain("femur-r");
    expect(s.movingIds).not.toContain("hip-bone-r");
  });

  test("jaw: masseter and temporalis become cables and the mandible with its teeth moves", () => {
    const s = motionSetup("tmj", "right")!;
    expect(s.hiddenIds).toContain("superficial-part-of-masseter-r");
    expect(s.hiddenIds).toContain("temporalis-muscle-r");
    expect(s.movingIds).toContain("mandible");
    expect(s.movingIds.some((id) => id.startsWith("lower-first-molar"))).toBe(true);
    expect(keys(cableRoles(s).lengthens)).toContain("superficial-part-of-masseter");
  });

  test("every joint sets up on both sides with a sensible radius and view", () => {
    for (const j of JOINT_IDS)
      for (const side of ["left", "right"] as const) {
        const s = motionSetup(j, side)!;
        expect(s, j).toBeDefined();
        expect(s.radius).toBeGreaterThan(0.1);
        expect(s.radius).toBeLessThan(1.2);
        expect(s.movingIds.length).toBeGreaterThan(2);
        expect(s.cables.length).toBeGreaterThan(1);
        expect(Math.sign(s.view[0])).toBe(side === "left" ? 1 : -1);
      }
  });
});
