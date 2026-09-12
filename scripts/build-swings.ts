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
import { curves, estimateEvents, faceForward, quality, resample, smooth, trim } from "./swings/kinematics";
import { JOINT_KEYS, type Curves, type PointCloud } from "./swings/types";

const OUT_DIR = resolve("public/swings");
const INDEX_PATH = resolve("src/data/swings-index.json");
const CMU_PATH =
  process.env.SWING_CMU ?? join(tmpdir(), "cmu124", "baseline-biomech", "data", "swing_124.json");
const TRACKMAN_PATH =
  process.env.SWING_TRACKMAN ?? "C:/Users/User/Desktop/baseline-biomech/data/trackman-demo-swings.json";
const FPS = 120;
const BEFORE_S = 0.5;
const AFTER_S = 0.35;

type SwingFile = {
  schema: "form.swing.v1";
  id: string;
  label: string;
  source: PointCloud["source"];
  handedness: "L" | "R";
  fps: number;
  frames: number;
  events: PointCloud["events"];
  eventsEstimated: boolean;
  joints: Curves;
  bat: { knob: number[][]; tip: number[][] } | null;
  caveats: string[];
};

type Built = { file: SwingFile; clippedPct: number };

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

function finish(cloud: PointCloud, id: string, label: string, caveats: string[]): Built | null {
  const c = curves(cloud);
  const withEvents = estimateEvents(cloud);
  const t = trim(withEvents, c, BEFORE_S, AFTER_S);
  const frames = t.cloud.times.length;
  const q = quality(t.curves, t.cloud.events, frames);
  const ranges = JOINT_KEYS.map((k) => `${k} ${round(Math.min(...t.curves[k]), 0)}..${round(Math.max(...t.curves[k]), 0)}`);
  console.log(
    `${id}: ${frames} frames, events ${JSON.stringify(t.cloud.events)}${t.cloud.eventsEstimated ? " (estimated)" : ""}, clipped ${q.clippedPct.toFixed(2)} %${q.ok ? "" : " REJECTED"}`,
  );
  console.log(`  ${ranges.join(" · ")}`);
  if (!q.ok) return null;
  const joints = Object.fromEntries(JOINT_KEYS.map((k) => [k, t.curves[k].map((v) => round(v, 2))])) as Curves;
  const bat = t.cloud.bat
    ? {
        knob: t.cloud.bat.knob.map((p) => p.map((v) => round(v, 3))),
        tip: t.cloud.bat.tip.map((p) => p.map((v) => round(v, 3))),
      }
    : null;
  const allCaveats = [...caveats];
  if (t.cloud.eventsEstimated && !allCaveats.includes("events-estimated")) allCaveats.push("events-estimated");
  return {
    file: {
      schema: "form.swing.v1",
      id,
      label,
      source: cloud.source,
      handedness: cloud.handedness,
      fps: FPS,
      frames,
      events: t.cloud.events,
      eventsEstimated: t.cloud.eventsEstimated,
      joints,
      bat,
      caveats: allCaveats,
    },
    clippedPct: q.clippedPct,
  };
}

function buildCmu(): Built | null {
  const raw = JSON.parse(readFileSync(CMU_PATH, "utf8")) as unknown;
  const cloud = faceForward(smooth(fromCmu(raw), 15));
  const hand = cloud.handedness === "R" ? "right" : "left";
  return finish(cloud, "cmu-124-swing", `Hitter A · ${hand}-handed · optical capture`, [
    "optical",
    "no-bat",
    "twist-held",
    "one-axis",
  ]);
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
      const built = finish(prepared, `trackman-${s + 1}-${i + 1}`, "", ["markerless", "twist-held", "one-axis"]);
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
