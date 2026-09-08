// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { motionSetup } from "../src/data/motion";
import MotionCard from "../src/features/motion/MotionCard";
import CaveatChip from "../src/features/shared/CaveatChip";
import { prefersReducedMotion } from "../src/features/shared/usePrefersReducedMotion";
import { initialState, StoreProvider } from "../src/state/store";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

const withMotion = {
  ...initialState,
  motion: { joint: "knee" as const, side: "right" as const, phase: 0, playing: true, lines: false, frameNonce: 1 },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("reduced motion", () => {
  test("prefersReducedMotion reads the media query", () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  test("the motion card hides Play and explains why under reduced motion", () => {
    mockMatchMedia(true);
    render(
      <StoreProvider initial={withMotion}>
        <MotionCard setup={motionSetup("knee", "right") ?? null} />
      </StoreProvider>,
    );
    expect(screen.queryByRole("button", { name: /^(Play|Pause)$/ })).toBeNull();
    expect(screen.getByText(/Animation is off because your system prefers reduced motion/)).toBeTruthy();
    expect(screen.getByRole("slider", { name: /angle/ })).toBeTruthy();
  });

  test("the motion card shows Pause while playing when motion is allowed", () => {
    mockMatchMedia(false);
    render(
      <StoreProvider initial={withMotion}>
        <MotionCard setup={motionSetup("knee", "right") ?? null} />
      </StoreProvider>,
    );
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(screen.queryByText(/Animation is off/)).toBeNull();
  });
});

describe("caveat chip", () => {
  test("shows its label and keeps the caveat text behind a disclosure", () => {
    render(<CaveatChip label="Approximate">Matched by name.</CaveatChip>);
    const details = screen.getByText("Approximate").closest("details")!;
    expect(details.open).toBe(false);
    expect(details.textContent).toContain("Matched by name.");
  });
});
