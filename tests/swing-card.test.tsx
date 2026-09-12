// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { motionSetup } from "../src/data/motion";
import { swingRange, type SwingFile } from "../src/data/swings";
import SwingCard from "../src/features/motion/SwingCard";
import { initialState, reducer, StoreProvider, type AppState } from "../src/state/store";

const swing = JSON.parse(readFileSync("public/swings/cmu-124-swing.json", "utf8")) as SwingFile;

function started(): AppState {
  return reducer(initialState, { type: "swingStart", id: swing.id, joint: "knee", side: "left" });
}

describe("swing reducer", () => {
  test("starting a swing sets the motion with the swing, the joint filter and half speed", () => {
    const s = started();
    expect(s.motion).toMatchObject({ joint: "knee", side: "left", phase: 0, playing: true, swing: { id: swing.id, speed: 0.5 } });
    expect(s.filters.joint).toBe("knee");
    expect(s.selected).toBeNull();
  });

  test("changing the joint keeps the frame and the swing; speed changes; stop clears everything", () => {
    let s = started();
    s = reducer(s, { type: "motionScrub", phase: 0.6 });
    s = reducer(s, { type: "swingJoint", joint: "hip", side: "right" });
    expect(s.motion).toMatchObject({ joint: "hip", side: "right", phase: 0.6, swing: { id: swing.id } });
    expect(s.filters.joint).toBe("hip");
    s = reducer(s, { type: "swingSpeed", speed: 1 });
    expect(s.motion?.swing?.speed).toBe(1);
    s = reducer(s, { type: "motionStop" });
    expect(s.motion).toBeNull();
    expect(reducer(initialState, { type: "swingSpeed", speed: 1 }).motion).toBeNull();
  });
});

describe("swing card accessibility", () => {
  test("the card has labelled controls and no axe violations", async () => {
    const setup = motionSetup("knee", "left", { range: swingRange(swing, "knee", "left"), label: "Lead knee" })!;
    const { container, getByLabelText, getByText } = render(
      <StoreProvider initial={started()}>
        <SwingCard swing={swing} setup={setup} />
      </StoreProvider>,
    );
    expect(getByLabelText("Swing frame")).toBeTruthy();
    expect(getByLabelText("Playback speed")).toBeTruthy();
    expect(getByLabelText("Lead side joint")).toBeTruthy();
    expect(getByText(/Lead knee: \d+° now\./)).toBeTruthy();
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`)).toEqual([]);
  }, 30000);
});
