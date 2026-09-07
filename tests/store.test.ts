import { describe, expect, test } from "vitest";
import { initialState, reducer } from "../src/state/store";

describe("store reducer", () => {
  test("selecting a part clears isolation and unhides it", () => {
    let s = reducer(initialState, { type: "hide", id: "femur-l" });
    expect(s.hidden).toEqual(["femur-l"]);
    s = reducer(s, { type: "toggleIsolate" });
    s = reducer(s, { type: "select", id: "femur-l" });
    expect(s.selected).toBe("femur-l");
    expect(s.hidden).toEqual([]);
    expect(s.isolated).toBe(false);
  });

  test("changing mode resets selection and hidden parts; fascia mode adopts the line view", () => {
    let s = reducer(initialState, { type: "select", id: "femur-l" });
    s = reducer(s, { type: "setMode", mode: "fascia" });
    expect(s.selected).toBeNull();
    expect(s.view).toBe("back");
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("setView bumps the camera nonce and clears a custom pose", () => {
    let s = reducer(initialState, {
      type: "cameraMoved",
      pose: { position: [1, 2, 3], target: [0, 0, 0] },
    });
    expect(s.view).toBe("custom");
    expect(s.camera).not.toBeNull();
    s = reducer(s, { type: "setView", view: "side" });
    expect(s.view).toBe("side");
    expect(s.camera).toBeNull();
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("setLine switches line, clears selection and moves to the line view", () => {
    const s = reducer(initialState, { type: "setLine", line: "ffl" });
    expect(s.line).toBe("ffl");
    expect(s.view).toBe("front");
  });

  test("hydrate merges a partial state and bumps the nonce", () => {
    const s = reducer(initialState, {
      type: "hydrate",
      state: {
        mode: "bones",
        selected: "femur-l",
        filters: { ...initialState.filters, region: "hip-thigh" },
      },
    });
    expect(s.mode).toBe("bones");
    expect(s.selected).toBe("femur-l");
    expect(s.filters.region).toBe("hip-thigh");
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("reset restores view and hidden state but keeps mode and filters", () => {
    let s = reducer(initialState, { type: "setMode", mode: "bones" });
    s = reducer(s, { type: "hide", id: "femur-l" });
    s = reducer(s, { type: "setOpacity", opacity: 40 });
    s = reducer(s, { type: "reset" });
    expect(s.mode).toBe("bones");
    expect(s.hidden).toEqual([]);
    expect(s.opacity).toBe(100);
    expect(s.view).toBe("front");
  });
});
