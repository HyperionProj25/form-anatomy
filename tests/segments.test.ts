import { describe, expect, test } from "vitest";
import { parts } from "../src/data/catalog";
import { dot, length } from "../src/data/quat";
import {
  bonesOf,
  chainPath,
  restBasis,
  SEGMENT_IDS,
  segmentDir,
  segmentOfBone,
  segmentPivot,
} from "../src/data/segments";

describe("segments", () => {
  test("every bone belongs to exactly one segment and the big ones are where they should be", () => {
    const bones = parts.filter((p) => p.type === "bone");
    for (const b of bones) expect(segmentOfBone(b), b.id).not.toBeNull();
    expect(segmentOfBone(parts.find((p) => p.id === "femur-l")!)).toBe("thighL");
    expect(segmentOfBone(parts.find((p) => p.id === "patella-r")!)).toBe("shankR");
    expect(segmentOfBone(parts.find((p) => p.key === "vertebra-l3")!)).toBe("lumbar");
    expect(segmentOfBone(parts.find((p) => p.key === "vertebra-t7")!)).toBe("thorax");
    expect(segmentOfBone(parts.find((p) => p.key === "vertebra-c5")!)).toBe("head");
    expect(segmentOfBone(parts.find((p) => p.key === "mandible")!)).toBe("head");
    expect(segmentOfBone(parts.find((p) => p.id === "scapula-l")!)).toBe("girdleL");
    expect(segmentOfBone(parts.find((p) => p.id === "third-metacarpal-bone-r")!)).toBe("handR");
    expect(segmentOfBone(parts.find((p) => p.id === "calcaneus-l")!)).toBe("footL");
    expect(segmentOfBone(parts.find((p) => p.key === "first-rib")!)).toBe("thorax");
    const total = SEGMENT_IDS.reduce((n, s) => n + bonesOf(s).length, 0);
    expect(total).toBe(bones.length);
  });

  test("rest bases are orthonormal; limbs point down, the trunk up, the feet forward", () => {
    for (const s of SEGMENT_IDS) {
      const b = restBasis(s);
      expect(length(b.side)).toBeCloseTo(1, 6);
      expect(length(b.long)).toBeCloseTo(1, 6);
      expect(length(b.second)).toBeCloseTo(1, 6);
      expect(Math.abs(dot(b.side, b.long))).toBeLessThan(1e-6);
      expect(Math.abs(dot(b.long, b.second))).toBeLessThan(1e-6);
    }
    expect(segmentDir("thighL")[1]).toBeLessThan(-0.9);
    expect(segmentDir("forearmR")[1]).toBeLessThan(-0.9);
    expect(segmentDir("lumbar")[1]).toBeGreaterThan(0.9);
    expect(segmentDir("thorax")[1]).toBeGreaterThan(0.9);
    expect(segmentDir("head")[1]).toBeGreaterThan(0.9);
    expect(segmentDir("footL")[2]).toBeGreaterThan(0.7);
    expect(restBasis("footL").second[1]).toBeGreaterThan(0.7);
    // The left hip pivot lies at +x, the right at -x; the knee is below the hip.
    expect(segmentPivot("thighL")[0]).toBeGreaterThan(0);
    expect(segmentPivot("thighR")[0]).toBeLessThan(0);
    expect(segmentPivot("shankL")[1]).toBeLessThan(segmentPivot("thighL")[1]);
    expect(segmentPivot("lumbar")[1]).toBeGreaterThan(segmentPivot("pelvis")[1] - 0.05);
    expect(segmentPivot("thorax")[1]).toBeGreaterThan(segmentPivot("lumbar")[1]);
    expect(segmentPivot("head")[1]).toBeGreaterThan(segmentPivot("thorax")[1]);
  });

  test("chain paths run through the lowest common ancestor", () => {
    expect(chainPath("pelvis", "shankL")).toEqual(["pelvis", "thighL", "shankL"]);
    expect(chainPath("thorax", "upperArmL")).toEqual(["thorax", "girdleL", "upperArmL"]);
    expect(chainPath("shankR", "pelvis")).toEqual(["shankR", "thighR", "pelvis"]);
    expect(chainPath("thighL", "thighR")).toEqual(["thighL", "pelvis", "thighR"]);
    expect(chainPath("handL", "handL")).toEqual(["handL"]);
  });
});
