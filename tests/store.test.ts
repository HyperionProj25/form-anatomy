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

  test("hydrating a fascia link without a view uses the line's preferred view", () => {
    const s = reducer(initialState, { type: "hydrate", state: { mode: "fascia", line: "sbl" } });
    expect(s.view).toBe("back");
    const explicit = reducer(initialState, {
      type: "hydrate",
      state: { mode: "fascia", line: "sbl", view: "front" },
    });
    expect(explicit.view).toBe("front");
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

  test("togglePath flips the cable visibility", () => {
    expect(initialState.showPath).toBe(true);
    expect(reducer(initialState, { type: "togglePath" }).showPath).toBe(false);
  });
});

describe("tours", () => {
  test("startTour focuses the first stop and bumps the camera nonce", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    const nonce = s.cameraNonce;
    s = reducer(s, { type: "startTour" });
    expect(s.tour).toEqual({ step: 0, playing: false });
    expect(s.focus?.flyId).toBe("calcaneus-r"); // SBL stop 1 is anchored to the calcaneus
    expect(s.focus?.ids.length).toBe(0); // the plantar fascia itself is not modelled
    expect(s.cameraNonce).toBe(nonce + 1);
    s = reducer(s, { type: "tourNext" });
    expect(s.focus?.ids).toContain("lateral-head-of-gastrocnemius-r");
    expect(s.focus?.ids).toContain("medial-head-of-gastrocnemius-r");
  });

  test("tourNext advances, stops at the last stop, and tourPrev goes back", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    s = reducer(s, { type: "setLine", line: "ffl" });
    s = reducer(s, { type: "startTour" });
    s = reducer(s, { type: "tourNext" });
    expect(s.tour?.step).toBe(1);
    expect(s.focus?.flyId).toBe("rectus-abdominis-muscle-l"); // crosses to the left
    s = reducer(s, { type: "tourNext" });
    s = reducer(s, { type: "tourPlay", playing: true });
    s = reducer(s, { type: "tourNext" });
    expect(s.tour).toEqual({ step: 2, playing: false });
    s = reducer(s, { type: "tourPrev" });
    expect(s.tour?.step).toBe(1);
  });

  test("selecting a part or leaving fascia mode ends the tour", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    s = reducer(s, { type: "startTour" });
    expect(reducer(s, { type: "select", id: "femur-l" }).tour).toBeNull();
    expect(reducer(s, { type: "setMode", mode: "bones" }).tour).toBeNull();
    expect(reducer(s, { type: "endTour" }).focus).toBeNull();
  });

  test("hydrating with a tour step rebuilds the focus", () => {
    const s = reducer(initialState, {
      type: "hydrate",
      state: { mode: "fascia", line: "bfl", tour: { step: 2, playing: false } },
    });
    expect(s.focus?.flyId).toBe("gluteus-maximus-muscle-l");
  });
});
