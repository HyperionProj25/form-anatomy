import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { fromCmu } from "../scripts/swings/adapters";
import { buildSwing } from "../scripts/swings/finish";
import { faceForward, smooth } from "../scripts/swings/kinematics";
import { groupStats, kinematicSequence } from "../src/data/swing-report";
import { eventLabel, type SwingFile } from "../src/data/swings";

const PITCH = join(tmpdir(), "cmu124", "baseline-biomech", "data", "pitch_124.json");

describe("pitching through the swing pipeline", () => {
  test("event labels follow the motion", () => {
    expect(eventLabel("footPlant", "pitch")).toBe("Foot strike");
    expect(eventLabel("contact", "pitch", true)).toBe("Release");
    expect(eventLabel("contact", "swing")).toBe("Contact");
    expect(eventLabel("footPlant", undefined, true)).toBe("Plant");
  });

  test("the CMU pitch builds: foot strike from the lead ankle, release from the throwing wrist, a report on both sides", () => {
    if (!existsSync(PITCH)) return;
    const cloud = faceForward(smooth(fromCmu(JSON.parse(readFileSync(PITCH, "utf8"))), 15));
    expect(cloud.motion).toBe("pitch");
    expect(cloud.handedness).toBe("R");
    const built = buildSwing(cloud, "cmu-124-pitch", "test pitch", ["optical", "twist-held"]);
    expect(built).not.toBeNull();
    const file = built!.file as unknown as SwingFile;
    expect(file.motion).toBe("pitch");
    // Foot strike lands about 0.15 s before release in this capture (frames 126 and 144 at 120 Hz).
    const strike = file.events.footPlant!;
    const release = file.events.contact!;
    expect(release - strike).toBeGreaterThan(8);
    expect(release - strike).toBeLessThan(40);
    const stats = groupStats(file);
    expect(stats.length).toBeGreaterThan(20);
    const seq = kinematicSequence(file);
    expect(seq.length).toBe(4);
    for (const s of seq) expect(Math.abs(s.peakMs)).toBeLessThan(600);
  });
});
