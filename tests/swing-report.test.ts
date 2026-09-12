import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parts } from "../src/data/catalog";
import { MUSCLE_GROUPS } from "../src/data/muscle-groups";
import { describeStat, groupStats, kinematicSequence, reportCsv } from "../src/data/swing-report";
import type { SwingFile } from "../src/data/swings";

const swing = JSON.parse(readFileSync("public/swings/trackman-r-1.json", "utf8")) as SwingFile;

describe("muscle groups", () => {
  test("every key names a catalog muscle and every group has members with paths", () => {
    const keys = new Set(parts.filter((p) => p.type === "muscle").map((p) => p.key));
    for (const g of MUSCLE_GROUPS) for (const k of g.keys) expect(keys.has(k), `${g.id}: ${k}`).toBe(true);
    const stats = groupStats(swing);
    const covered = new Set(stats.map((s) => s.group.id));
    for (const g of MUSCLE_GROUPS) expect(covered.has(g.id), g.id).toBe(true);
  });
});

describe("swing report", () => {
  test("rows are finite, lead precedes back, and the lead knee extensors read as shortening into contact", () => {
    const stats = groupStats(swing);
    expect(stats.length).toBeGreaterThan(20);
    for (const s of stats) {
      expect(Number.isFinite(s.change)).toBe(true);
      expect(s.series.length).toBe(swing.frames);
      expect(Math.abs(s.series[0] - 1)).toBeLessThan(1e-6);
      expect(s.peakShortening).toBeLessThanOrEqual(0);
      expect(s.peakLengthening).toBeGreaterThanOrEqual(0);
    }
    const first = stats.findIndex((s) => s.group.id === "knee-extensors");
    expect(stats[first].role).toBe("lead");
    expect(stats[first + 1].role).toBe("back");
    // Hitter B's lead knee extends 42 degrees into contact.
    expect(stats[first].change).toBeLessThan(-0.02);
    expect(describeStat(stats[first])).toMatch(/^Lead knee extensors .* shortens/);
  });

  test("the kinematic sequence reports four peaks with times relative to contact", () => {
    const seq = kinematicSequence(swing);
    expect(seq.map((s) => s.label)).toEqual(["Pelvis rotation", "Torso rotation", "Lead shoulder", "Lead elbow"]);
    for (const s of seq) {
      expect(Number.isFinite(s.peakDegPerS)).toBe(true);
      expect(Math.abs(s.peakMs)).toBeLessThan(1000);
    }
  });

  test("the csv has a header, one row per group and side, and the sequence block", () => {
    const csv = reportCsv(swing);
    const lines = csv.trim().split("\n");
    expect(lines[0].startsWith("swing,group,side,role")).toBe(true);
    expect(lines.filter((l) => l.startsWith(swing.id + ",")).length).toBe(groupStats(swing).length + 4);
    expect(csv).toContain("peak_ms_before_contact");
  });
});
