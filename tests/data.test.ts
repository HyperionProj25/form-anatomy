import { describe, expect, test } from "vitest";
import { lessons } from "../src/data/lessons";
import { LINE_IDS, lines } from "../src/data/lines";

describe("fascial line data", () => {
  test("has six lines with hex colors, a camera view, and at least three stops", () => {
    expect(lines.length).toBe(6);
    for (const line of lines) {
      expect(line.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(["front", "back", "side"]).toContain(line.view);
      expect(line.path.length).toBeGreaterThanOrEqual(3);
      expect(line.description.length).toBeGreaterThan(30);
      expect(line.movement.length).toBeGreaterThan(30);
      expect(line.evidence.summary.length).toBeGreaterThan(30);
    }
  });

  test("line ids are unique short slugs", () => {
    expect(LINE_IDS).toEqual(["sbl", "sfl", "ll", "sl", "bfl", "ffl"]);
  });

  test("line names are unique", () => {
    expect(new Set(lines.map((l) => l.name)).size).toBe(lines.length);
  });
});

describe("lessons", () => {
  test("every lesson has lowercase match text and all five teaching fields", () => {
    for (const lesson of lessons) {
      expect(lesson.match).toBe(lesson.match.toLowerCase());
      for (const field of ["description", "attachments", "action", "observe", "connection"] as const) {
        expect(lesson[field].length, `${lesson.match}.${field}`).toBeGreaterThan(10);
      }
    }
  });
});
