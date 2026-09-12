/**
 * Build the measured-swing files (spec 2026-09-10-swing-lab-design.md, section 4).
 *
 *   npx tsx scripts/build-swings.ts
 *
 * Sources (override with env):
 *   SWING_CMU       swing_124.json from the baseline-biomech archive (CMU subject 124, 120 Hz)
 *   SWING_TRACKMAN  trackman-demo-swings.json (the curated TrackMan extract, ~370 Hz)
 *
 * Writes public/swings/<id>.json (form.swing.v1: joint-angle curves, events, bat) and
 * src/data/swings-index.json. Fails when a swing clips more than 2 % of frames or its events are
 * out of order. Nothing identifying leaves the sources: no timestamps, ids or session numbers.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fromCmu, fromTrackmanDemo } from "./swings/adapters";
import { buildSwing, FPS, type Built } from "./swings/finish";
import { faceForward, resample, smooth } from "./swings/kinematics";

const OUT_DIR = resolve("public/swings");
const INDEX_PATH = resolve("src/data/swings-index.json");
const CMU_PATH =
  process.env.SWING_CMU ?? join(tmpdir(), "cmu124", "baseline-biomech", "data", "swing_124.json");
const TRACKMAN_PATH =
  process.env.SWING_TRACKMAN ?? "C:/Users/User/Desktop/baseline-biomech/data/trackman-demo-swings.json";

function buildCmu(): Built | null {
  const raw = JSON.parse(readFileSync(CMU_PATH, "utf8")) as unknown;
  const cloud = faceForward(smooth(fromCmu(raw), 15));
  const hand = cloud.handedness === "R" ? "right" : "left";
  return buildSwing(
    cloud,
    "cmu-124-swing",
    `Hitter A · ${hand}-handed · optical capture`,
    ["optical", "no-bat", "twist-held", "one-axis"],
    console.log,
  );
}

function buildTrackman(): Built[] {
  const raw = JSON.parse(readFileSync(TRACKMAN_PATH, "utf8")) as { sessions: { swings: unknown[] }[] };
  const candidates: { built: Built; handedness: "L" | "R" }[] = [];
  raw.sessions.forEach((session, s) => {
    session.swings.forEach((_, i) => {
      const cloud = fromTrackmanDemo(raw, s, i);
      if (!cloud) {
        console.log(`trackman ${s + 1}/${i + 1}: skipped (events missing or out of order, or not a standing hitter)`);
        return;
      }
      const prepared = faceForward(resample(smooth(cloud, 12), FPS));
      const built = buildSwing(prepared, `trackman-${s + 1}-${i + 1}`, "", ["markerless", "twist-held", "one-axis"], console.log);
      if (built) candidates.push({ built, handedness: cloud.handedness });
    });
  });
  candidates.sort((a, b) => a.built.clippedPct - b.built.clippedPct);
  const chosen: Built[] = [];
  const letters = ["B", "C", "D"];
  for (const hand of ["R", "R", "L"] as const) {
    const pick = candidates.find((c) => c.handedness === hand && !chosen.includes(c.built));
    if (!pick) continue;
    const n = chosen.filter((b) => b.file.handedness === hand).length + 1;
    pick.built.file.id = `trackman-${hand.toLowerCase()}-${n}`;
    pick.built.file.label = `Hitter ${letters[chosen.length]} · ${hand === "R" ? "right" : "left"}-handed · markerless capture`;
    chosen.push(pick.built);
  }
  return chosen;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const built: Built[] = [];
  const cmu = buildCmu();
  if (!cmu) throw new Error("The CMU swing failed quality checks");
  built.push(cmu, ...buildTrackman());
  const index = built.map(({ file }) => ({
    id: file.id,
    label: file.label,
    handedness: file.handedness,
    kind: file.source.kind,
    frames: file.frames,
    fps: file.fps,
    events: file.events,
    eventsEstimated: file.eventsEstimated,
    attribution: file.source.attribution,
    caveats: file.caveats,
  }));
  for (const { file } of built) writeFileSync(join(OUT_DIR, `${file.id}.json`), JSON.stringify(file));
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
  console.log(`Wrote ${built.length} swings to ${OUT_DIR} and the index to ${INDEX_PATH}`);
}

main();
