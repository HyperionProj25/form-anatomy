import { describe, expect, test } from "vitest";
import {
  decideGraphics,
  DOWNGRADE_MS,
  FrameMeter,
  initialGraphics,
  loadGraphicsPref,
  saveGraphicsPref,
  shouldDowngrade,
  type DeviceSignals,
} from "../src/viewer/quality";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

const laptop: DeviceSignals = {
  reducedMotion: false,
  coarsePointer: false,
  narrow: false,
  cores: 8,
  memoryGb: 8,
  gpu: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
};

describe("graphics preference", () => {
  test("defaults to auto, round-trips, and a ?gfx= override wins for testing", () => {
    const s = fakeStorage();
    expect(loadGraphicsPref(s)).toBe("auto");
    saveGraphicsPref("high", s);
    expect(loadGraphicsPref(s)).toBe("high");
    s.setItem("form.graphics.v1", "ultra");
    expect(loadGraphicsPref(s)).toBe("auto");
    saveGraphicsPref("low", s);
    expect(initialGraphics("", s)).toBe("low");
    expect(initialGraphics("?gfx=high&s=femur-l", s)).toBe("high");
    expect(initialGraphics("?gfx=ultra", s)).toBe("low");
  });
});

describe("decideGraphics", () => {
  test("a capable laptop gets High", () => {
    expect(decideGraphics(laptop)).toBe("high");
  });
  test("reduced motion, phones, software GPUs and small machines get Low", () => {
    expect(decideGraphics({ ...laptop, reducedMotion: true })).toBe("low");
    expect(decideGraphics({ ...laptop, coarsePointer: true, narrow: true })).toBe("low");
    expect(decideGraphics({ ...laptop, coarsePointer: true, narrow: false })).toBe("high"); // a touch laptop
    expect(decideGraphics({ ...laptop, gpu: "Google SwiftShader" })).toBe("low");
    expect(decideGraphics({ ...laptop, cores: 2 })).toBe("low");
    expect(decideGraphics({ ...laptop, memoryGb: 2 })).toBe("low");
    expect(decideGraphics({ ...laptop, memoryGb: undefined })).toBe("high");
  });
});

describe("frame meter", () => {
  test("ignores the warm-up and stalls, then reports an average", () => {
    const m = new FrameMeter();
    for (let i = 0; i < 24; i++) m.push(16); // warm-up, 384 ms, not counted
    for (let i = 0; i < 30; i++) m.push(40);
    m.push(500); // a stall, not counted
    for (let i = 0; i < 30; i++) m.push(40);
    expect(m.finished).toBe(true);
    expect(m.average()).toBeCloseTo(40, 5);
    expect(shouldDowngrade(m.average(), m.frames)).toBe(true);
  });
  test("a smooth machine keeps High and a handful of frames proves nothing", () => {
    expect(shouldDowngrade(16, 150)).toBe(false);
    expect(shouldDowngrade(DOWNGRADE_MS + 1, 5)).toBe(false);
    expect(shouldDowngrade(DOWNGRADE_MS + 1, 20)).toBe(true);
  });
});
