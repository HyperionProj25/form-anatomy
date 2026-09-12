import { describe, expect, test } from "vitest";
import { measuredBases, rootTrack, segmentQuats } from "../scripts/swings/body";
import type { PointCloud, PointName, Vec3 } from "../scripts/swings/types";
import { pivotOf } from "../src/data/geometry";
import { angleOf, axisAngle, dot, normalize, rotate } from "../src/data/quat";
import { SEGMENT_IDS, segmentPivot } from "../src/data/segments";

type Pose = Record<PointName, Vec3>;

/** A capture standing exactly on the model's own joint centres, facing +Z. */
function onModel(): Pose {
  const p = (name: string, side: "left" | "right") => [...pivotOf(name, side)!] as Vec3;
  return {
    head: p("headTop", "left"),
    neck: p("cervicothoracic", "left"),
    torso: p("thoracolumbar", "left"),
    shoulderL: p("shoulder", "left"),
    shoulderR: p("shoulder", "right"),
    elbowL: p("elbow", "left"),
    elbowR: p("elbow", "right"),
    wristL: p("wrist", "left"),
    wristR: p("wrist", "right"),
    hipL: p("hip", "left"),
    hipR: p("hip", "right"),
    kneeL: p("knee", "left"),
    kneeR: p("knee", "right"),
    ankleL: p("ankle", "left"),
    ankleR: p("ankle", "right"),
    toeL: p("toeTip", "left"),
    toeR: p("toeTip", "right"),
    heelL: [p("ankle", "left")[0], p("ankle", "left")[1] - 0.07, p("ankle", "left")[2] - 0.04],
    heelR: [p("ankle", "right")[0], p("ankle", "right")[1] - 0.07, p("ankle", "right")[2] - 0.04],
  };
}

function cloudOf(poses: Pose[]): PointCloud {
  const points: PointCloud["points"] = {};
  for (const name of Object.keys(poses[0]) as PointName[]) points[name] = poses.map((p) => p[name]);
  return {
    hz: 120,
    times: poses.map((_, i) => i / 120),
    points,
    events: {},
    eventsEstimated: false,
    handedness: "R",
    source: { kind: "cmu", attribution: "test", captureHz: 120 },
    motion: "swing",
  };
}

describe("segment orientations", () => {
  test("a capture standing on the model's pivots gives near-identity everywhere", () => {
    const q = segmentQuats(cloudOf([onModel(), onModel()]));
    for (const s of SEGMENT_IDS) {
      expect(q[s].length).toBe(2);
      expect(angleOf(q[s][0]), s).toBeLessThan(10);
    }
    for (const s of ["thighL", "thighR", "shankL", "shankR", "upperArmL", "forearmR", "footL"] as const)
      expect(angleOf(q[s][0]), s).toBeLessThan(3);
  });

  test("bending the left knee 90 degrees turns the shank about the knee and nothing else", () => {
    const bent = onModel();
    const knee = bent.kneeL;
    const turn = axisAngle([1, 0, 0], 90);
    for (const name of ["ankleL", "toeL", "heelL"] as const) {
      const rel: Vec3 = [bent[name][0] - knee[0], bent[name][1] - knee[1], bent[name][2] - knee[2]];
      const r = rotate(turn, rel);
      bent[name] = [knee[0] + r[0], knee[1] + r[1], knee[2] + r[2]];
    }
    // The ankle now sits behind the knee.
    expect(bent.ankleL[2]).toBeLessThan(knee[2] - 0.3);
    const q = segmentQuats(cloudOf([onModel(), bent]));
    expect(angleOf(q.shankL[1])).toBeGreaterThan(85);
    expect(angleOf(q.shankL[1])).toBeLessThan(95);
    // About the model's mediolateral axis, and the thigh stays put.
    const axis = normalize([q.shankL[1][0], q.shankL[1][1], q.shankL[1][2]]);
    expect(Math.abs(dot(axis, [1, 0, 0]))).toBeGreaterThan(0.95);
    expect(angleOf(q.thighL[1])).toBeLessThan(6);
    expect(angleOf(q.thighR[1])).toBeLessThan(3);
    expect(angleOf(q.footL[1])).toBeGreaterThan(80);
  });

  test("measured bases are orthonormal and the root track is zero at frame 0 and scaled after", () => {
    const b = measuredBases(cloudOf([onModel()]), 0);
    for (const s of SEGMENT_IDS) {
      expect(Math.abs(dot(b[s].long, b[s].second))).toBeLessThan(1e-6);
      expect(Math.abs(dot(b[s].side, b[s].long))).toBeLessThan(1e-6);
    }
    const raised = onModel();
    raised.hipL = [raised.hipL[0], raised.hipL[1] + 0.1, raised.hipL[2]];
    raised.hipR = [raised.hipR[0], raised.hipR[1] + 0.1, raised.hipR[2]];
    const root = rootTrack(cloudOf([onModel(), raised]));
    expect(root[0]).toEqual([0, 0, 0]);
    // The capture is the model itself, so the scale is one and a 10 cm rise stays 10 cm.
    expect(root[1][1]).toBeCloseTo(0.1, 2);
    expect(segmentPivot("pelvis")[1]).toBeGreaterThan(-0.1);
  });
});
