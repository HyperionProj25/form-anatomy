/**
 * Build a TrackMan session (spec section 18): every full swing through the swing pipeline, its
 * metrics, the spread across the session, and two exemplar swings per hand written as swing files.
 *
 *   npx tsx scripts/build-session.ts 1 [2 3 4]
 *
 * Env: SWING_TRACKMAN_DIR (folder with trackman-index.json and the hpepose3d / hittermetrics files).
 * Nothing identifying leaves the sources: swings are numbered, no timestamps or play ids.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { TrackmanPlay } from "./swings/adapters";
import { readRange, type IndexSwing, type SessionIndex } from "./swings/session";
import { assembleSession, swingRow, type MetricsPlay, type Row } from "./swings/session-metrics";

const DIR = process.env.SWING_TRACKMAN_DIR ?? "C:/Users/User/Desktop/baseline-biomech/DataSampleBaseline";
const OUT_DIR = resolve("public/sessions");
const SWINGS_DIR = resolve("public/swings");
const SESSION_INDEX_PATH = resolve("src/data/sessions-index.json");
const SWINGS_INDEX_PATH = resolve("src/data/swings-index.json");

function processSwing(entry: IndexSwing, n: number, sessionNo: number): Row | null {
  const pose = readRange<TrackmanPlay["pose"]>(join(DIR, entry.pose.file), entry.pose.offset, entry.pose.length);
  const metrics = readRange<MetricsPlay>(join(DIR, entry.metrics.file), entry.metrics.offset, entry.metrics.length);
  return swingRow(pose, metrics, `s${sessionNo}-${String(n).padStart(3, "0")}`);
}

function buildSession(sessionNo: number, index: SessionIndex) {
  const session = index.sessions.find((s) => s.session === sessionNo);
  if (!session) throw new Error(`No session ${sessionNo} in the index`);
  const full = session.swings.filter((w) => w.hasSwingPlane);
  console.log(`Session ${sessionNo}: ${session.swings.length} swings, ${full.length} full`);
  const rows: Row[] = [];
  full.forEach((entry, i) => {
    try {
      const row = processSwing(entry, i + 1, sessionNo);
      if (row) rows.push(row);
    } catch (e) {
      console.log(`  swing ${i + 1}: failed (${(e as Error).message})`);
    }
  });
  console.log(`  ${rows.length} swings passed quality checks`);
  const { file, exemplarFiles } = assembleSession(rows, `trackman-session-${sessionNo}`, `TrackMan session ${sessionNo}`, `session${sessionNo}`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${file.id}.json`), JSON.stringify(file));
  for (const w of exemplarFiles) writeFileSync(join(SWINGS_DIR, `${w.id}.json`), JSON.stringify(w.file));
  for (const hand of ["R", "L"] as const) {
    const a = file.byHand[hand];
    if (!a) continue;
    console.log(
      `  ${hand}: n=${a.count}, bat ${a.batSpeedMph.mean.toFixed(1)} ± ${a.batSpeedMph.sd.toFixed(1)} mph (max ${a.batSpeedMph.max.toFixed(1)}), separation at plant ${a.separationAtPlant.mean.toFixed(1)} ± ${a.separationAtPlant.sd.toFixed(1)}°, agreement pelvis ${a.agreement.pelvisRms.mean.toFixed(1)}° torso ${a.agreement.torsoRms.mean.toFixed(1)}° RMS`,
    );
    console.log(`     sequence (ms to contact): ${a.sequenceMs.map((s) => `${s.label} ${s.ms.mean.toFixed(0)}±${s.ms.sd.toFixed(0)}`).join(" · ")}`);
    console.log(`     TrackMan's: ${a.trackmanSequenceMs.map((s) => `${s.label} ${s.ms.mean.toFixed(0)}±${s.ms.sd.toFixed(0)}`).join(" · ")}`);
  }
  return { file, exemplarFiles, total: session.swings.length };
}

function main() {
  const wanted = process.argv.slice(2).map(Number).filter((n) => n > 0);
  const index = JSON.parse(readFileSync(join(DIR, "trackman-index.json"), "utf8")) as SessionIndex;
  const sessions = wanted.length ? wanted : [1];
  type Entry = { id: string; label: string; swings: number; fullSwings: number; hands: ("L" | "R")[] };
  const sessionIndex: Entry[] = existsSync(SESSION_INDEX_PATH) ? (JSON.parse(readFileSync(SESSION_INDEX_PATH, "utf8")) as Entry[]) : [];
  const swingsIndex = JSON.parse(readFileSync(SWINGS_INDEX_PATH, "utf8")) as Record<string, unknown>[];
  for (const n of sessions) {
    const { file, exemplarFiles, total } = buildSession(n, index);
    const entry: Entry = { id: file.id, label: file.label, swings: total, fullSwings: file.swings.length, hands: Object.keys(file.byHand) as ("L" | "R")[] };
    const at = sessionIndex.findIndex((s) => s.id === entry.id);
    if (at >= 0) sessionIndex[at] = entry;
    else sessionIndex.push(entry);
    for (const w of exemplarFiles) {
      const swingEntry = {
        id: w.id,
        label: w.label,
        handedness: w.file.handedness,
        kind: "trackman",
        frames: w.file.frames,
        fps: w.file.fps,
        events: w.file.events,
        eventsEstimated: w.file.eventsEstimated,
        attribution: w.file.source.attribution,
        caveats: w.file.caveats,
        session: file.id,
      };
      const i = swingsIndex.findIndex((s) => s.id === w.id);
      if (i >= 0) swingsIndex[i] = swingEntry;
      else swingsIndex.push(swingEntry);
    }
  }
  writeFileSync(SESSION_INDEX_PATH, JSON.stringify(sessionIndex, null, 2) + "\n");
  writeFileSync(SWINGS_INDEX_PATH, JSON.stringify(swingsIndex, null, 2) + "\n");
  console.log(`Wrote ${sessions.length} session(s) to ${OUT_DIR}`);
}

main();
