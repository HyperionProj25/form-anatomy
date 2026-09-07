import { describe, expect, test } from "vitest";
import { APPLIED_NOTES, appliedNotesFor, unresolvedAppliedKeys } from "../src/data/applied";
import { partsByKey } from "../src/data/catalog";
import { citationById } from "../src/data/research";

describe("applied notes", () => {
  test("every key resolves, every citation exists in the digest, and text has at least two sentences", () => {
    expect(unresolvedAppliedKeys()).toEqual([]);
    expect(APPLIED_NOTES.length).toBeGreaterThanOrEqual(3);
    for (const n of APPLIED_NOTES) {
      expect(n.citations.length, n.id).toBeGreaterThan(0);
      for (const c of n.citations) expect(citationById(c), `${n.id}: ${c}`).toBeDefined();
      expect(n.text.split(/[.!?]\s/).length, n.id).toBeGreaterThanOrEqual(2);
      for (const c of n.citations) expect(citationById(c)?.group, c).toBe("applied");
    }
  });

  test("notes attach to the right structures", () => {
    expect(appliedNotesFor(partsByKey("infraspinatus-muscle")[0]).map((n) => n.id)).toEqual([
      "throwing-posterior-shoulder",
    ]);
    expect(appliedNotesFor(partsByKey("descending-part-of-trapezius-muscle")[0]).map((n) => n.id)).toEqual([
      "upper-trapezius-tendinopathy",
    ]);
    expect(appliedNotesFor(partsByKey("femur")[0])).toEqual([]);
  });
});
