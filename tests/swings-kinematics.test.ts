import { describe, expect, test } from "vitest";
import {
  butterworth,
  curves,
  estimateEvents,
  faceForward,
  heading,
  pelvisFrame,
  quality,
  resample,
  trim,
} from "../scripts/swings/kinematics";
import type { PointCloud, PointName, Vec3 } from "../scripts/swings/types";

type Pose = Partial<Record<PointName, Vec3>>;

/** A standing figure facing +Z, left on +X, straight limbs. */
function standing(): Pose {
  return {
    head: [0, 1.75, 0],
    neck: [0, 1.6, 0],
    torso: [0, 1.3, 0],
    shoulderL: [0.2, 1.5, 0],
    shoulderR: [-0.2, 1.5, 0],
    elbowL: [0.2, 1.2, 0],
    elbowR: [-0.2, 1.2, 0],
    wristL: [0.2, 0.95, 0],
    wristR: [-0.2, 0.95, 0],
    hipL: [0.1, 1, 0],
    hipR: [-0.1, 1, 0],
    kneeL: [0.1, 0.5, 0],
    kneeR: [-0.1, 0.5, 0],
    ankleL: [0.1, 0, 0],
    ankleR: [-0.1, 0, 0],
    toeL: [0.1, 0, 0.2],
    toeR: [-0.1, 0, 0.2],
  };
}

function cloudOf(poses: Pose[], hz = 120): PointCloud {
  const points: PointCloud["points"] = {};
  for (const name of Object.keys(poses[0]) as PointName[]) points[name] = poses.map((p) => p[name]!);
  return {
    hz,
    times: poses.map((_, i) => i / hz),
    points,
    events: {},
    eventsEstimated: false,
    handedness: "R",
    source: { kind: "cmu", attribution: "test", captureHz: hz },
  };
}

function rotY(p: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  return [p[0] * Math.cos(r) + p[2] * Math.sin(r), p[1], -p[0] * Math.sin(r) + p[2] * Math.cos(r)];
}

describe("butterworth", () => {
  test("keeps a constant, keeps a slow sine and removes a fast one", () => {
    const flat = butterworth(new Array(200).fill(3), 120, 12);
    expect(Math.max(...flat.map((v) => Math.abs(v - 3)))).toBeLessThan(1e-9);
    const slow = Array.from({ length: 600 }, (_, i) => Math.sin((2 * Math.PI * 1 * i) / 120));
    const s = butterworth(slow, 120, 12);
    const mid = s.slice(120, 480);
    expect(Math.max(...mid.map(Math.abs))).toBeGreaterThan(0.98);
    const fast = Array.from({ length: 600 }, (_, i) => Math.sin((2 * Math.PI * 50 * i) / 120));
    const f = butterworth(fast, 120, 12);
    expect(Math.max(...f.slice(120, 480).map(Math.abs))).toBeLessThan(0.1);
  });
});

describe("curves", () => {
  test("a straight leg reads knee 0 and a right angle reads 90", () => {
    const bent = standing();
    bent.ankleL = [0.1, 0.5, -0.5];
    const c = curves(cloudOf([standing(), bent]));
    expect(c.kneeL[0]).toBeCloseTo(0, 5);
    expect(c.kneeL[1]).toBeCloseTo(90, 5);
    expect(c.kneeR[1]).toBeCloseTo(0, 5);
    expect(c.elbowL[0]).toBeCloseTo(0, 5);
  });

  test("a thigh swung 30 degrees forward reads hip flexion 30", () => {
    const flexed = standing();
    flexed.kneeL = [0.1, 1 - 0.5 * Math.cos(Math.PI / 6), 0.5 * Math.sin(Math.PI / 6)];
    const c = curves(cloudOf([standing(), flexed]));
    expect(c.hipL[1]).toBeCloseTo(30, 4);
    expect(c.hipL[0]).toBeCloseTo(0, 4);
  });

  test("an arm raised 45 degrees forward reads shoulder flexion 45", () => {
    const raised = standing();
    raised.elbowR = [-0.2, 1.5 - 0.3 * Math.cos(Math.PI / 4), 0.3 * Math.sin(Math.PI / 4)];
    const c = curves(cloudOf([standing(), raised]));
    expect(c.shoulderR[1]).toBeCloseTo(45, 4);
  });

  test("toes pointed down read plantarflexion, toes up read negative", () => {
    const down = standing();
    down.toeL = [0.1, -0.1, 0.17];
    const up = standing();
    up.toeL = [0.1, 0.1, 0.17];
    const c = curves(cloudOf([standing(), down, up]));
    expect(c.ankleL[0]).toBeCloseTo(0, 4);
    expect(c.ankleL[1]).toBeGreaterThan(20);
    expect(c.ankleL[2]).toBeLessThan(-20);
  });

  test("a 40 degree pelvis and torso turn reads 40 and 40 with no separation; pelvis alone separates", () => {
    const turned = standing();
    for (const k of ["hipL", "hipR", "shoulderL", "shoulderR"] as const) turned[k] = rotY(turned[k]!, 40);
    const pelvisOnly = standing();
    for (const k of ["hipL", "hipR"] as const) pelvisOnly[k] = rotY(pelvisOnly[k]!, 40);
    const c = curves(cloudOf([standing(), turned, pelvisOnly]));
    expect(c.pelvisRotation[1]).toBeCloseTo(40, 4);
    expect(c.torsoRotation[1]).toBeCloseTo(40, 4);
    expect(c.separation[1]).toBeCloseTo(0, 4);
    expect(c.separation[2]).toBeCloseTo(-40, 4);
  });
});

describe("faceForward", () => {
  test("turns a hitter facing +X to face +Z", () => {
    const sideways = standing();
    for (const k of Object.keys(sideways) as PointName[]) sideways[k] = rotY(sideways[k]!, 90);
    const cloud = cloudOf([sideways, sideways]);
    expect(heading(pelvisFrame(cloud, 0).anterior)).toBeCloseTo(90, 4);
    const faced = faceForward(cloud);
    expect(heading(pelvisFrame(faced, 0).anterior)).toBeCloseTo(0, 4);
    expect(faced.points.hipL![0][0]).toBeCloseTo(0.1, 6);
    expect(faced.points.toeL![0][2]).toBeCloseTo(0.2, 6);
  });
});

describe("resample and trim", () => {
  test("370 Hz to 120 Hz keeps an event at the same time within a frame", () => {
    const poses = Array.from({ length: 111 }, () => standing());
    const cloud = { ...cloudOf(poses, 370), events: { footPlant: 74 } };
    const r = resample(cloud, 120);
    expect(r.hz).toBe(120);
    expect(r.times.length).toBe(Math.floor((110 / 370) * 120) + 1);
    expect(Math.abs(r.events.footPlant! - (74 / 370) * 120)).toBeLessThanOrEqual(1);
    expect(r.points.hipL![10]).toEqual([0.1, 1, 0]);
  });

  test("trim keeps 0.5 s before foot plant and re-indexes events", () => {
    const poses = Array.from({ length: 240 }, () => standing());
    const cloud = { ...cloudOf(poses), events: { footPlant: 100, contact: 150 } };
    const c = curves(cloud);
    const t = trim(cloud, c, 0.5, 0.35);
    expect(t.cloud.events.footPlant).toBe(60);
    expect(t.cloud.events.contact).toBe(110);
    expect(t.cloud.times.length).toBe(60 + 50 + 42 + 1);
    expect(t.curves.kneeL.length).toBe(t.cloud.times.length);
    expect(t.cloud.times[0]).toBe(0);
  });
});

describe("estimateEvents and quality", () => {
  test("foot plant is where the lead toe returns to the floor; contact is peak wrist speed", () => {
    const poses: Pose[] = [];
    for (let i = 0; i < 120; i++) {
      const p = standing();
      // The left toe lifts 8 cm between frames 20 and 50 and lands by frame 60.
      const lift = i > 20 && i < 60 ? 0.08 * Math.sin((Math.PI * (i - 20)) / 40) : 0;
      p.toeL = [0.1, lift, 0.2];
      p.ankleL = [0.1, lift, 0];
      // The left wrist speeds up toward frame 90.
      p.wristL = [0.2 + 0.02 * Math.max(0, Math.min(i, 94) - 70), 0.95, 0];
      poses.push(p);
    }
    const e = estimateEvents(cloudOf(poses));
    expect(e.eventsEstimated).toBe(true);
    expect(e.events.footPlant).toBeGreaterThanOrEqual(56);
    expect(e.events.footPlant).toBeLessThanOrEqual(60);
    expect(e.events.contact).toBeGreaterThanOrEqual(71);
    expect(e.events.contact).toBeLessThanOrEqual(94);
  });

  test("quality clips out-of-range frames and rejects events out of order", () => {
    const c = curves(cloudOf([standing(), standing()]));
    c.kneeL[0] = 170;
    const q = quality(c, { footPlant: 1, contact: 0 }, 2);
    expect(c.kneeL[0]).toBe(140);
    expect(q.clipped.kneeL).toBe(1);
    expect(q.ordered).toBe(false);
    expect(q.ok).toBe(false);
    const good = quality(curves(cloudOf([standing(), standing()])), { footPlant: 0, contact: 1 }, 2);
    expect(good.ok).toBe(true);
    expect(good.clippedPct).toBe(0);
  });
});
