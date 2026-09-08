import { describe, expect, test } from "vitest";
import { foldedAfter, newestCard } from "../src/features/shared/Dock";

describe("dock", () => {
  test("the newest card opens and the others fold", () => {
    expect(newestCard([], ["playlist"])).toBe("playlist");
    expect(newestCard(["playlist"], ["playlist", "motion"])).toBe("motion");
    expect(newestCard(["playlist", "motion"], ["playlist"])).toBeUndefined();
    expect(foldedAfter([], ["playlist"], [])).toEqual([]);
    expect(foldedAfter(["playlist"], ["playlist", "motion"], [])).toEqual(["playlist"]);
    expect(foldedAfter(["quiz", "playlist"], ["quiz", "playlist", "motion"], ["playlist"])).toEqual([
      "quiz",
      "playlist",
    ]);
  });

  test("a card the user folded stays folded until it leaves", () => {
    expect(foldedAfter(["playlist", "motion"], ["playlist", "motion"], ["playlist"])).toEqual([
      "playlist",
    ]);
    expect(foldedAfter(["playlist", "motion"], ["motion"], ["playlist"])).toEqual([]);
  });
});
