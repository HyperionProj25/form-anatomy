import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { cableRoles, motionSetup } from "../src/data/motion";
import {
  SWING_INDEX,
  SWING_JOINTS,
  changeBetween,
  curveOf,
  frameAt,
  phaseAt,
  roleForSide,
  sideForRole,
  swingRange,
  type SwingFile,
} from "../src/data/swings";
import { decodeSearch, encodeState } from "../src/state/urlCodec";
import { initialState } from "../src/state/store";

const RANGES: Record<string, [number, number]> = {
  knee: [0, 140],
  hip: [-30, 130],
  elbow: [0, 150],
  shoulder: [-90, 180],
  ankle: [-40, 60],
};

function fileOf(id: string): SwingFile {
  return JSON.parse(readFileSync(`public/swings/${id}.json`, "utf8")) as SwingFile;
}

describe("swing files", () => {
  test("the index lists at least the CMU swing and every entry has a file", () => {
    expect(SWING_INDEX.map((s) => s.id)).toContain("cmu-124-swing");
    for (const s of SWING_INDEX) expect(existsSync(`public/swings/${s.id}.json`)).toBe(true);
  });

  test("every file is complete, in range, and its events are in order inside the clip", () => {
    for (const entry of SWING_INDEX) {
      const f = fileOf(entry.id);
      expect(f.schema).toBe("form.swing.v1");
      expect(f.fps).toBe(120);
      expect(f.frames).toBe(entry.frames);
      for (const [key, curve] of Object.entries(f.joints)) {
        expect(curve.length, `${entry.id} ${key}`).toBe(f.frames);
        const base = key.replace(/[LR]$/, "");
        const range = RANGES[base];
        if (range) for (const v of curve) expect(v >= range[0] && v <= range[1], `${entry.id} ${key} ${v}`).toBe(true);
      }
      const { footPlant, contact, maxBatSpeed } = f.events;
      expect(footPlant).toBeDefined();
      expect(contact).toBeDefined();
      expect(footPlant!).toBeLessThan(contact!);
      if (maxBatSpeed !== undefined) expect(footPlant!).toBeLessThan(maxBatSpeed);
      expect(contact!).toBeLessThan(f.frames);
      expect(f.caveats.length).toBeGreaterThan(0);
      expect(f.source.attribution.length).toBeGreaterThan(10);
      // Nothing identifying: no timestamps, ids or sessions.
      const text = JSON.stringify(f);
      expect(text).not.toMatch(/playId|sessionId|timestamp/);
    }
  });
});

describe("swing data helpers", () => {
  const swing = fileOf("cmu-124-swing");

  test("a right-handed hitter leads with the left side", () => {
    expect(sideForRole("lead", "R")).toBe("left");
    expect(sideForRole("back", "R")).toBe("right");
    expect(sideForRole("lead", "L")).toBe("right");
    expect(roleForSide("left", "R")).toBe("lead");
    expect(roleForSide("left", "L")).toBe("back");
  });

  test("frame and phase round-trip, curves match joints, and the range runs foot plant to contact", () => {
    expect(frameAt(swing, 0)).toBe(0);
    expect(frameAt(swing, 1)).toBe(swing.frames - 1);
    expect(frameAt(swing, phaseAt(swing, 37))).toBe(37);
    for (const j of SWING_JOINTS) {
      expect(curveOf(swing, j, "left")).toBe(swing.joints[`${j}L` as keyof SwingFile["joints"]]);
    }
    expect(curveOf(swing, "tmj", "left")).toEqual([]);
    const [a, b] = swingRange(swing, "knee", "left");
    expect(a).toBe(swing.joints.kneeL[swing.events.footPlant!]);
    expect(b).toBe(swing.joints.kneeL[swing.events.contact!]);
    expect(changeBetween(swing.joints.kneeL, swing.events.footPlant!, swing.events.contact!)).toBeCloseTo(b - a, 6);
  });
});

describe("motion with a measured range", () => {
  test("a lead knee going from 68 to 31 degrees shortens the quadriceps and lengthens the hamstrings", () => {
    const s = motionSetup("knee", "left", { range: [68, 31], label: "Lead knee" })!;
    expect(s.label).toBe("Lead knee");
    expect(s.range).toEqual([68, 31]);
    const { shortens, lengthens } = cableRoles(s);
    const keys = (c: typeof shortens) => c.map((x) => x.key);
    expect(keys(shortens)).toEqual(expect.arrayContaining(["rectus-femoris-muscle", "vastus-lateralis-muscle"]));
    expect(keys(lengthens)).toEqual(expect.arrayContaining(["semitendinosus-muscle", "long-head-of-biceps-femoris"]));
  });

  test("the teaching range is unchanged when no options are passed", () => {
    expect(motionSetup("knee", "left")!.range).toEqual([0, 110]);
  });
});

describe("swing url", () => {
  test("round-trips swing, joint, side and phase and ignores an unknown swing", () => {
    const state = {
      ...initialState,
      motion: { joint: "hip" as const, side: "right" as const, phase: 0.412, playing: true, lines: false, frameNonce: 3, swing: { id: "cmu-124-swing", speed: 1, body: true, colour: false, shapes: false } },
    };
    const q = encodeState(state);
    expect(q).toContain("sw=cmu-124-swing");
    expect(q).toContain("sj=hip");
    expect(q).toContain("ss=r");
    expect(q).toContain("sp=0.412");
    const back = decodeSearch(q);
    expect(back.motion).toMatchObject({ joint: "hip", side: "right", phase: 0.412, playing: false, swing: { id: "cmu-124-swing" } });
    expect(back.filters?.joint).toBe("hip");
    expect(decodeSearch("?sw=nope&sj=hip").motion).toBeUndefined();
    expect(decodeSearch("?sw=cmu-124-swing").motion).toMatchObject({ joint: "knee", side: "left", phase: 0 });
  });
});
