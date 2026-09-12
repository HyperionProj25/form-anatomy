import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { fromTrackmanPlay } from "../scripts/swings/adapters";
import { agreementRms, batTipSpeed, meanSd, median, theirRotation } from "../scripts/swings/session";
import type { SessionFile } from "../src/data/sessions";

describe("session helpers", () => {
  test("bat tip speed peaks where the tip moves fastest, in mph", () => {
    const times = Array.from({ length: 40 }, (_, i) => i / 370);
    // 30 m/s for the middle stretch, still before and after.
    const tip = times.map((t, i) => [i >= 10 && i < 30 ? (i - 10) * (30 / 370) : i >= 30 ? 20 * (30 / 370) : 0, 1, 0] as [number, number, number]);
    const s = batTipSpeed(tip, times);
    expect(s.peakMph).toBeGreaterThan(60);
    expect(s.peakMph).toBeLessThan(70);
    expect(s.peakFrame).toBeGreaterThan(10);
    expect(s.peakFrame).toBeLessThan(30);
  });

  test("their rotation is re-based and resampled; agreement is zero against itself and tolerates a sign flip", () => {
    const series = Array.from({ length: 370 }, (_, i) => [50 + i * 0.1, 0, 0]);
    const theirs = theirRotation(series, 370, 37, 100, 120)!;
    expect(theirs[0]).toBeCloseTo(0, 6);
    expect(theirs[99]).toBeCloseTo(0.1 * (Math.round(37 + (99 / 120) * 370) - 37), 6);
    expect(agreementRms(theirs, theirs).rms).toBeCloseTo(0, 6);
    const flipped = theirs.map((v) => -v);
    const a = agreementRms(theirs, flipped);
    expect(a.rms).toBeCloseTo(0, 6);
    expect(a.sign).toBe(-1);
    expect(theirRotation(undefined, 370, 0, 10, 120)).toBeNull();
  });

  test("mean, sd and median", () => {
    const s = meanSd([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.mean).toBeCloseTo(5, 6);
    expect(s.sd).toBeCloseTo(2.138, 3);
    expect(s.min).toBe(2);
    expect(s.max).toBe(9);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(meanSd([]).n).toBe(0);
  });

  test("a full-export play adapts with relative seconds", () => {
    const n = 12;
    const point = (x: number, y: number, z: number) => Array.from({ length: n }, () => [x, y, z] as [number, number, number]);
    const hitter: Record<string, [number, number, number][]> = {
      headTip: point(0, 1.75, 0), neck: point(0, 1.6, 0), centerTorso: point(0, 1.3, 0),
      leftShoulder: point(0.2, 1.5, 0), rightShoulder: point(-0.2, 1.5, 0),
      leftElbow: point(0.2, 1.2, 0), rightElbow: point(-0.2, 1.2, 0),
      leftWrist: point(0.2, 0.95, 0), rightWrist: point(-0.2, 0.95, 0),
      leftHip: point(0.1, 1, 0), rightHip: point(-0.1, 1, 0),
      leftKnee: point(0.1, 0.5, 0), rightKnee: point(-0.1, 0.5, 0),
      leftAnkle: point(0.1, 0.08, 0), rightAnkle: point(-0.1, 0.08, 0),
      leftHeel: point(0.1, 0.02, -0.05), rightHeel: point(-0.1, 0.02, -0.05),
      leftShoeTip: point(0.1, 0.02, 0.2), rightShoeTip: point(-0.1, 0.02, 0.2),
      leftEar: point(0.07, 1.7, 0), rightEar: point(-0.07, 1.7, 0),
    };
    const t0 = 1782871669328742656;
    const cloud = fromTrackmanPlay({
      pose: { timestamps: Array.from({ length: n }, (_, i) => t0 + i * 2702702), hitter, bat: { tip: point(0, 1, 0.8), leadHandTop: point(0.2, 0.9, 0), leadHandBottom: point(0.2, 0.85, 0) } },
      metrics: { handedness: "r", numSamples: n, swingEvents: { frontFootPlant: 3, batInStrikeZone: 8, maxBatSpeed: 7, batHorizEnd: 10 } },
    })!;
    expect(cloud).not.toBeNull();
    expect(cloud.times[0]).toBe(0);
    expect(cloud.times[1]).toBeCloseTo(0.0027, 3);
    expect(cloud.hz).toBeGreaterThan(360);
    expect(cloud.events).toEqual({ footPlant: 3, contact: 8, maxBatSpeed: 7, followThrough: 10 });
    expect(cloud.handedness).toBe("R");
  });
});

describe("built session", () => {
  test("session 1, when built, has swings, both hands, exemplars with files, and sane aggregates", () => {
    if (!existsSync("public/sessions/trackman-session-1.json")) return;
    const s = JSON.parse(readFileSync("public/sessions/trackman-session-1.json", "utf8")) as SessionFile;
    expect(s.schema).toBe("form.session.v1");
    expect(s.swings.length).toBeGreaterThan(50);
    for (const e of s.exemplars) expect(existsSync(`public/swings/${e.fileId}.json`)).toBe(true);
    for (const hand of ["R", "L"] as const) {
      const a = s.byHand[hand];
      if (!a) continue;
      expect(a.count).toBeGreaterThan(5);
      expect(a.batSpeedMph.mean).toBeGreaterThan(40);
      expect(a.batSpeedMph.mean).toBeLessThan(110);
      expect(a.groups.length).toBeGreaterThan(20);
      expect(a.agreement.pelvisRms.mean).toBeLessThan(25);
    }
    expect(JSON.stringify(s)).not.toMatch(/playId|sessionId|timestamp/);
  });
});
