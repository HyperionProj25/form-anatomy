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
import { groupStats, kinematicSequence } from "../src/data/swing-report";
import type { SwingFile as AppSwingFile } from "../src/data/swings";
import type { SessionFile, SessionHandAggregate, SessionSwing } from "../src/data/sessions";
import { fromTrackmanPlay, TRACKMAN_ATTRIBUTION, type TrackmanPlay } from "./swings/adapters";
import { buildSwing, FPS, round, trimStart, type Built } from "./swings/finish";
import { faceForward, resample, smooth } from "./swings/kinematics";
import { agreementRms, batTipSpeed, meanSd, median, readRange, theirRotation, type IndexSwing, type SessionIndex, type Stat } from "./swings/session";

const DIR = process.env.SWING_TRACKMAN_DIR ?? "C:/Users/User/Desktop/baseline-biomech/DataSampleBaseline";
const OUT_DIR = resolve("public/sessions");
const SWINGS_DIR = resolve("public/swings");
const SESSION_INDEX_PATH = resolve("src/data/sessions-index.json");
const SWINGS_INDEX_PATH = resolve("src/data/swings-index.json");
const CAVEATS = ["markerless", "twist-held", "one-axis"];

type MetricsPlay = TrackmanPlay["metrics"] & {
  segmentRotation?: Record<string, (number[] | null)[]>;
  segmentAngularVelocities?: Record<string, (number[] | null)[]>;
  timestamps: number[];
};

type Row = { swing: SessionSwing; built: Built; timesSec: number[] };

function peakOfTheirs(series: (number[] | null)[] | undefined, hz: number, contact: number): { peakDegPerS: number; peakMs: number } | null {
  if (!series) return null;
  let best = 0;
  let bestV = 0;
  series.forEach((v, i) => {
    const x = v && Number.isFinite(v[0]) ? Math.abs(v[0]) : 0;
    if (x > bestV) {
      bestV = x;
      best = i;
    }
  });
  return { peakDegPerS: Math.round(bestV), peakMs: Math.round(((best - contact) / hz) * 1000) };
}

function processSwing(entry: IndexSwing, n: number, sessionNo: number): Row | null {
  const pose = readRange<TrackmanPlay["pose"]>(join(DIR, entry.pose.file), entry.pose.offset, entry.pose.length);
  const metrics = readRange<MetricsPlay>(join(DIR, entry.metrics.file), entry.metrics.offset, entry.metrics.length);
  const cloud = fromTrackmanPlay({ pose, metrics });
  if (!cloud) return null;
  const sourceHz = cloud.hz;
  const prepared = faceForward(resample(smooth(cloud, 12), FPS));
  const built = buildSwing(prepared, `s${sessionNo}-${String(n).padStart(3, "0")}`, "", CAVEATS);
  if (!built) return null;
  const file = built.file as unknown as AppSwingFile;
  const stats = groupStats(file);
  const sequence = kinematicSequence(file);
  const contactSource = metrics.swingEvents.batInStrikeZone ?? metrics.swingEvents.maxBatSpeed ?? 0;
  const timesSec = cloud.times;
  const tip = batTipSpeed(pose.bat.tip, timesSec);
  const lead = file.handedness === "R" ? "L" : "R";
  const plant = file.events.footPlant ?? 0;
  const contact = file.events.contact ?? file.frames - 1;
  const start120 = trimStart(prepared);
  const startSource = Math.round((start120 / FPS) * sourceHz);
  const theirPelvis = theirRotation(metrics.segmentRotation?.pelvis, sourceHz, startSource, file.frames, FPS);
  const theirTorso = theirRotation(metrics.segmentRotation?.torso, sourceHz, startSource, file.frames, FPS);
  const pelvisAgreement = theirPelvis ? agreementRms(file.joints.pelvisRotation, theirPelvis) : { rms: NaN, sign: 1 };
  const torsoAgreement = theirTorso ? agreementRms(file.joints.torsoRotation, theirTorso) : { rms: NaN, sign: 1 };
  const their = [
    ["Pelvis rotation", peakOfTheirs(metrics.segmentAngularVelocities?.pelvis, sourceHz, contactSource)],
    ["Torso rotation", peakOfTheirs(metrics.segmentAngularVelocities?.torso, sourceHz, contactSource)],
    ["Lead arm", peakOfTheirs(metrics.segmentAngularVelocities?.leadArm, sourceHz, contactSource)],
  ] as const;
  let separationPeak = 0;
  for (let f = 0; f <= contact; f++) separationPeak = Math.max(separationPeak, Math.abs(file.joints.separation[f]));
  const swing: SessionSwing = {
    id: built.file.id,
    handedness: file.handedness,
    frames: file.frames,
    events: file.events,
    batSpeedMph: round(tip.peakMph, 1),
    separationAtPlant: round(Math.abs(file.joints.separation[plant]), 1),
    separationPeak: round(separationPeak, 1),
    leadKneeAtPlant: round(file.joints[`knee${lead}`][plant], 1),
    leadKneeAtContact: round(file.joints[`knee${lead}`][contact], 1),
    sequence,
    trackmanSequence: their.filter(([, v]) => v).map(([label, v]) => ({ label, ...v! })),
    groups: stats.map((s) => ({
      group: s.group.id,
      label: s.group.label,
      role: s.role,
      change: round(s.change, 4),
      peakShortening: round(s.peakShortening, 3),
      peakShorteningMs: s.peakShorteningMs,
      longest: round(s.longest, 4),
      longestMs: s.longestMs,
    })),
    agreement: { pelvisRms: round(pelvisAgreement.rms, 2), torsoRms: round(torsoAgreement.rms, 2) },
  };
  return { swing, built, timesSec };
}

function aggregate(rows: SessionSwing[]): SessionHandAggregate {
  const stat = (f: (s: SessionSwing) => number): Stat => meanSd(rows.map(f));
  const groupKeys = new Map<string, { label: string; role: SessionSwing["groups"][number]["role"] }>();
  for (const r of rows) for (const g of r.groups) groupKeys.set(`${g.group}|${g.role}`, { label: g.label, role: g.role });
  const groups = [...groupKeys.entries()].map(([key, meta]) => {
    const [group] = key.split("|");
    const pick = rows.map((r) => r.groups.find((g) => g.group === group && g.role === meta.role)).filter((g): g is SessionSwing["groups"][number] => !!g);
    return {
      group,
      label: meta.label,
      role: meta.role,
      change: meanSd(pick.map((g) => g.change)),
      peakShorteningMs: meanSd(pick.map((g) => g.peakShorteningMs)),
      longest: meanSd(pick.map((g) => g.longest)),
    };
  });
  const seqLabels = rows[0]?.sequence.map((s) => s.label) ?? [];
  const theirLabels = rows[0]?.trackmanSequence.map((s) => s.label) ?? [];
  return {
    count: rows.length,
    batSpeedMph: stat((s) => s.batSpeedMph),
    separationAtPlant: stat((s) => s.separationAtPlant),
    separationPeak: stat((s) => s.separationPeak),
    leadKneeExtension: stat((s) => s.leadKneeAtPlant - s.leadKneeAtContact),
    sequenceMs: seqLabels.map((label) => ({ label, ms: meanSd(rows.map((r) => r.sequence.find((s) => s.label === label)?.peakMs ?? NaN)) })),
    trackmanSequenceMs: theirLabels.map((label) => ({ label, ms: meanSd(rows.map((r) => r.trackmanSequence.find((s) => s.label === label)?.peakMs ?? NaN)) })),
    groups,
    agreement: { pelvisRms: stat((s) => s.agreement.pelvisRms), torsoRms: stat((s) => s.agreement.torsoRms) },
  };
}

function roundStats(o: unknown): unknown {
  if (Array.isArray(o)) return o.map(roundStats);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o as Record<string, unknown>).map(([k, v]) => [k, roundStats(v)]));
  if (typeof o === "number") return Number.isFinite(o) ? round(o, 3) : null;
  return o;
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
  const byHand: SessionFile["byHand"] = {};
  const exemplars: SessionFile["exemplars"] = [];
  const writtenFiles: { id: string; label: string; file: Built["file"] }[] = [];
  for (const hand of ["R", "L"] as const) {
    const handRows = rows.filter((r) => r.swing.handedness === hand);
    if (!handRows.length) continue;
    byHand[hand] = aggregate(handRows.map((r) => r.swing));
    const speeds = handRows.map((r) => r.swing.batSpeedMph);
    const best = handRows.reduce((a, b) => (b.swing.batSpeedMph > a.swing.batSpeedMph ? b : a));
    const med = median(speeds);
    const medianRow = handRows.reduce((a, b) => (Math.abs(b.swing.batSpeedMph - med) < Math.abs(a.swing.batSpeedMph - med) ? b : a));
    for (const [kind, row] of [["best", best], ["median", medianRow]] as const) {
      const fileId = `session${sessionNo}-${kind}-${hand.toLowerCase()}`;
      const label = `Session ${sessionNo} · ${kind} ${hand === "R" ? "right" : "left"}-handed swing by bat speed · markerless capture`;
      row.swing.fileId = fileId;
      exemplars.push({ hand, kind, swingId: row.swing.id, fileId });
      writtenFiles.push({ id: fileId, label, file: { ...row.built.file, id: fileId, label } });
    }
  }
  const file: SessionFile = {
    schema: "form.session.v1",
    id: `trackman-session-${sessionNo}`,
    label: `TrackMan session ${sessionNo}`,
    source: { kind: "trackman", attribution: TRACKMAN_ATTRIBUTION, captureHz: 370 },
    swings: rows.map((r) => r.swing),
    byHand,
    exemplars,
    caveats: [...CAVEATS, "no-hitter-id"],
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${file.id}.json`), JSON.stringify(roundStats(file)));
  for (const w of writtenFiles) writeFileSync(join(SWINGS_DIR, `${w.id}.json`), JSON.stringify(w.file));
  for (const hand of ["R", "L"] as const) {
    const a = byHand[hand];
    if (!a) continue;
    console.log(
      `  ${hand}: n=${a.count}, bat ${a.batSpeedMph.mean.toFixed(1)} ± ${a.batSpeedMph.sd.toFixed(1)} mph (max ${a.batSpeedMph.max.toFixed(1)}), separation at plant ${a.separationAtPlant.mean.toFixed(1)} ± ${a.separationAtPlant.sd.toFixed(1)}°, agreement pelvis ${a.agreement.pelvisRms.mean.toFixed(1)}° torso ${a.agreement.torsoRms.mean.toFixed(1)}° RMS`,
    );
    console.log(`     sequence (ms to contact): ${a.sequenceMs.map((s) => `${s.label} ${s.ms.mean.toFixed(0)}±${s.ms.sd.toFixed(0)}`).join(" · ")}`);
    console.log(`     TrackMan's: ${a.trackmanSequenceMs.map((s) => `${s.label} ${s.ms.mean.toFixed(0)}±${s.ms.sd.toFixed(0)}`).join(" · ")}`);
  }
  return { file, writtenFiles };
}

function main() {
  const wanted = process.argv.slice(2).map(Number).filter((n) => n > 0);
  const index = JSON.parse(readFileSync(join(DIR, "trackman-index.json"), "utf8")) as SessionIndex;
  const sessions = wanted.length ? wanted : [1];
  const sessionIndex: { id: string; label: string; swings: number; fullSwings: number; hands: ("L" | "R")[] }[] = existsSync(SESSION_INDEX_PATH)
    ? (JSON.parse(readFileSync(SESSION_INDEX_PATH, "utf8")) as typeof sessionIndex)
    : [];
  const swingsIndex = JSON.parse(readFileSync(SWINGS_INDEX_PATH, "utf8")) as Record<string, unknown>[];
  for (const n of sessions) {
    const { file, writtenFiles } = buildSession(n, index);
    const entry = {
      id: file.id,
      label: file.label,
      swings: index.sessions.find((s) => s.session === n)!.swings.length,
      fullSwings: file.swings.length,
      hands: Object.keys(file.byHand) as ("L" | "R")[],
    };
    const at = sessionIndex.findIndex((s) => s.id === entry.id);
    if (at >= 0) sessionIndex[at] = entry;
    else sessionIndex.push(entry);
    for (const w of writtenFiles) {
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
