import { describe, expect, test } from "vitest";
import { lessons } from "../src/data/lessons";
import { LINE_IDS, lines } from "../src/data/lines";
import { questions } from "../src/data/questions";

describe("fascial line data", () => {
  test("has five lines with hex colors, a camera view, and at least three stops", () => {
    expect(lines.length).toBe(5);
    for (const line of lines) {
      expect(line.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(["front", "back", "side"]).toContain(line.view);
      expect(line.path.length).toBeGreaterThanOrEqual(3);
      expect(line.matches.length).toBeGreaterThan(0);
      for (const stop of line.path) {
        expect(stop.match.length).toBeGreaterThan(0);
        expect(stop.match).toBe(stop.match.toLowerCase());
      }
    }
  });

  test("line ids are unique short slugs", () => {
    expect(LINE_IDS).toEqual(["sbl", "sfl", "ll", "bfl", "ffl"]);
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

describe("quiz questions", () => {
  test("every question has a valid correct index and an explanation", () => {
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });
});
