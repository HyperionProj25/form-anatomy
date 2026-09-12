import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { applyTransform, changeRanking, lengthRatios, musclePaths, transformsAt } from "../src/data/body";
import { partById, parts } from "../src/data/catalog";
import { axisAngle, IDENTITY, type Quat } from "../src/data/quat";
import { SEGMENT_IDS, segmentPivot, type SegmentId } from "../src/data/segments";
import { bandFor, candidateSegments, pointWeights, skinFor } from "../src/data/skin";
import type { SwingFile } from "../src/data/swings";

function synthetic(frames: number, edit?: (segments: Record<SegmentId, Quat[]>, root: [number, number, number][]) => void): SwingFile {
  const segments = Object.fromEntries(SEGMENT_IDS.map((s) => [s, Array.from({ length: frames }, () => IDENTITY)])) as Record<SegmentId, Quat[]>;
  const root = Array.from({ length: frames }, () => [0, 0, 0] as [number, number, number]);
  edit?.(segments, root);
  return {
    schema: "form.swing.v1",
    id: `synthetic-${Math.random()}`,
    label: "test",
    source: { kind: "cmu", attribution: "test", captureHz: 120 },
    handedness: "R",
    fps: 120,
    frames,
    events: { footPlant: 0, contact: frames - 1 },
    eventsEstimated: true,
    joints: {} as SwingFile["joints"],
    segments,
    root,
    bat: null,
    caveats: [],
  };
}

describe("body transforms", () => {
  test("identity everywhere leaves every pivot where it is; a root offset moves the whole chain", () => {
    const t = transformsAt(synthetic(2, (_, root) => (root[1] = [0.1, 0.2, 0.3])), 0);
    for (const s of SEGMENT_IDS) for (let k = 0; k < 3; k++) expect(t[s].posed[k]).toBeCloseTo(segmentPivot(s)[k], 9);
    const moved = transformsAt(synthetic(2, (_, root) => (root[1] = [0.1, 0.2, 0.3])), 1);
    for (const s of SEGMENT_IDS) {
      expect(moved[s].posed[0]).toBeCloseTo(segmentPivot(s)[0] + 0.1, 6);
      expect(moved[s].posed[1]).toBeCloseTo(segmentPivot(s)[1] + 0.2, 6);
    }
  });

  test("turning the left thigh carries the shank and foot with it", () => {
    const swing = synthetic(2, (segments) => {
      segments.thighL[1] = axisAngle([1, 0, 0], -90); // knee forward and up
    });
    const t = transformsAt(swing, 1);
    const hip = segmentPivot("thighL");
    const knee = t.shankL.posed;
    // The knee is now level with the hip and in front of it.
    expect(knee[1]).toBeCloseTo(hip[1], 1);
    expect(knee[2]).toBeGreaterThan(hip[2] + 0.3);
    const ankleRest = segmentPivot("footL");
    const ankle = applyTransform(t.shankL, ankleRest);
    // The shank kept its own orientation (identity), so the ankle hangs below the moved knee.
    expect(ankle[1]).toBeLessThan(knee[1] - 0.3);
  });
});

describe("skin weights", () => {
  test("a point deep in a segment weighs one there; across a joint the weight moves over; sums stay one", () => {
    const chain: SegmentId[] = ["pelvis", "thighL", "shankL"];
    const hip = segmentPivot("thighL");
    const knee = segmentPivot("shankL");
    const band = 0.03;
    const w = (p: [number, number, number]) => pointWeights(p, chain, band);
    const high = w([hip[0], hip[1] + 0.1, hip[2]]);
    expect(high[0]).toBeGreaterThan(0.9);
    const midThigh = w([hip[0], (hip[1] + knee[1]) / 2, hip[2]]);
    expect(midThigh[1]).toBeGreaterThan(0.9);
    const low = w([knee[0], knee[1] - 0.3, knee[2]]);
    expect(low[2]).toBeGreaterThan(0.9);
    for (const v of [high, midThigh, low, w([knee[0], knee[1], knee[2]])]) {
      expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      for (const x of v) expect(x).toBeGreaterThanOrEqual(0);
    }
    const atKnee = w([knee[0], knee[1], knee[2]]);
    expect(atKnee[1]).toBeGreaterThan(0.3);
    expect(atKnee[2]).toBeGreaterThan(0.3);
  });

  test("candidate segments follow the attachments and the chain between them", () => {
    const rf = partById("rectus-femoris-muscle-l")!;
    expect(candidateSegments(rf)).toEqual(expect.arrayContaining(["pelvis", "thighL"]));
    const gm = partById("gluteus-maximus-muscle-r")!;
    expect(candidateSegments(gm)).toEqual(expect.arrayContaining(["pelvis", "thighR"]));
    expect(candidateSegments(gm)).not.toContain("thighL");
    const gastro = partById("lateral-head-of-gastrocnemius-l")!;
    expect(candidateSegments(gastro)).toEqual(expect.arrayContaining(["thighL", "shankL", "footL"]));
    for (const p of parts) {
      if (p.type === "bone") continue;
      const c = candidateSegments(p);
      expect(c.length, p.id).toBeGreaterThan(0);
    }
    expect(bandFor(rf)).toBeGreaterThanOrEqual(0.02);
    expect(bandFor(rf)).toBeLessThanOrEqual(0.06);
  });

  test("skinFor writes four normalised slots per vertex in mesh-local coordinates", () => {
    const rf = partById("rectus-femoris-muscle-l")!;
    const center: [number, number, number] = [0.5, 0.5, 0.5];
    const hip = segmentPivot("thighL");
    const knee = segmentPivot("shankL");
    const positions = new Float32Array([
      hip[0] + 0.5, hip[1] + 0.2 + 0.5, hip[2] + 0.5,
      (hip[0] + knee[0]) / 2 + 0.5, (hip[1] + knee[1]) / 2 + 0.5, (hip[2] + knee[2]) / 2 + 0.5,
    ]);
    const skin = skinFor(rf, positions, center)!;
    expect(skin.segments.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 2; i++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += skin.weight[i * 4 + k];
      expect(sum).toBeCloseTo(1, 5);
    }
    expect(skin.segments[skin.index[0]]).toBe("pelvis");
    expect(skin.segments[skin.index[4]]).toBe("thighL");
  });
});

describe("muscle paths and ranking", () => {
  test("paths exist for most muscles and ratios are one at frame 0", () => {
    const paths = musclePaths();
    expect(paths.length).toBeGreaterThan(250);
    const swing = synthetic(3);
    const ratios = lengthRatios(swing);
    for (const [, r] of ratios) {
      expect(r[0]).toBeCloseTo(1, 6);
      expect(r[2]).toBeCloseTo(1, 6);
    }
  });

  test("bending the left knee lengthens the quadriceps and shortens the calf muscles that cross it", () => {
    const swing = synthetic(2, (segments) => {
      segments.shankL[1] = axisAngle([1, 0, 0], 90); // ankle swings back
      segments.footL[1] = axisAngle([1, 0, 0], 90);
    });
    const ranking = changeRanking(swing, 40);
    const short = ranking.shortening.map((r) => r.key);
    const long = ranking.lengthening.map((r) => r.key);
    // Straight-line paths: the vasti whose patellar contact sits ahead of the knee lengthen; the
    // hamstrings and the calf muscles that cross the knee shorten.
    expect(long).toEqual(expect.arrayContaining(["vastus-intermedius-muscle", "vastus-medialis-muscle"]));
    expect(short).toEqual(expect.arrayContaining(["semitendinosus-muscle", "semimembranosus-muscle"]));
    expect(short.some((k) => /gastrocnemius/.test(k))).toBe(true);
    expect(ranking.shortening.every((r) => r.id.endsWith("-l"))).toBe(true);
    expect(ranking.lengthening.every((r) => r.id.endsWith("-l"))).toBe(true);
  });

  test("a real swing file, once built with segments, ranks something both ways", () => {
    const file = JSON.parse(readFileSync("public/swings/cmu-124-swing.json", "utf8")) as SwingFile;
    if (!file.segments) return;
    const ranking = changeRanking(file);
    expect(ranking.shortening.length).toBeGreaterThan(0);
    expect(ranking.lengthening.length).toBeGreaterThan(0);
  });
});
