import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { assembleSession, joinPlays, swingRow, type Row } from "../scripts/swings/session-metrics";
import { playsFromRequest } from "../src/features/session/ingest-plays";

const DEMO = "C:/Users/User/Desktop/baseline-biomech/data/trackman-demo-swings.json";

describe("session metrics", () => {
  test("joinPlays matches by first timestamp, never by position", () => {
    const poses = [{ timestamps: [5, 6], a: 1 }, { timestamps: [9, 10], a: 2 }];
    const metrics = [{ timestamps: [9, 10], b: 2 }, { timestamps: [5, 6], b: 1 }, { timestamps: [7], b: 3 }];
    const joined = joinPlays(poses, metrics);
    expect(joined.map((j) => [j.pose.a, j.metrics.b])).toEqual([[1, 1], [2, 2]]);
  });

  test("the curated extract runs through playsFromRequest, swingRow and assembleSession", () => {
    if (!existsSync(DEMO)) return;
    const text = readFileSync(DEMO, "utf8");
    const plays = playsFromRequest({ kind: "demo", text, label: "Extract" });
    expect(plays.length).toBe(20);
    const rows: Row[] = [];
    plays.slice(0, 8).forEach((p, i) => {
      const row = swingRow(p.pose, p.metrics, `t-${i}`);
      if (row) rows.push(row);
    });
    expect(rows.length).toBeGreaterThan(3);
    for (const r of rows) {
      expect(r.swing.batSpeedMph).toBeGreaterThan(30);
      expect(r.swing.groups.length).toBeGreaterThan(20);
      expect(r.swing.sequence.length).toBe(4);
      // The extract has no segment angles, so agreement is unknown, not a number.
      expect(Number.isFinite(r.swing.agreement.pelvisRms)).toBe(false);
    }
    const { file, exemplarFiles } = assembleSession(rows, "test-session", "Test", "test");
    expect(file.schema).toBe("form.session.v1");
    expect(file.swings.length).toBe(rows.length);
    expect(exemplarFiles.length).toBeGreaterThanOrEqual(2);
    for (const e of file.exemplars) expect(exemplarFiles.some((f) => f.id === e.fileId)).toBe(true);
    const hand = file.byHand.R ?? file.byHand.L!;
    expect(hand.count).toBeGreaterThan(0);
    expect(Number.isFinite(hand.batSpeedMph.mean)).toBe(true);
    expect(JSON.stringify(file)).not.toMatch(/playId|timestamp/);
  });
});
