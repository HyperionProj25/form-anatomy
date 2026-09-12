import { groupStats, kinematicSequence } from "../../src/data/swing-report";
import type { SwingFile as AppSwingFile } from "../../src/data/swings";
import type { SessionFile, SessionHandAggregate, SessionSwing } from "../../src/data/sessions";
import { fromTrackmanPlay, TRACKMAN_ATTRIBUTION, type TrackmanPlay } from "./adapters";
import { buildSwing, FPS, round, trimStart, type Built } from "./finish";
import { faceForward, resample, smooth } from "./kinematics";
import { agreementRms, batTipSpeed, meanSd, median, theirRotation, type Stat } from "./stats";

/**
 * One TrackMan play to its session row (spec section 18), and rows to a session file. Pure: the
 * CLI build and the browser ingest worker both run this.
 */

export type MetricsPlay = TrackmanPlay["metrics"] & {
  segmentRotation?: Record<string, (number[] | null)[]>;
  segmentAngularVelocities?: Record<string, (number[] | null)[]>;
  timestamps: number[];
};

export type Row = { swing: SessionSwing; built: Built };

export const SESSION_CAVEATS = ["markerless", "twist-held", "one-axis"];

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

/** A play through the pipeline and into a session row; null when the swing is rejected. */
export function swingRow(pose: TrackmanPlay["pose"], metrics: MetricsPlay, id: string): Row | null {
  const cloud = fromTrackmanPlay({ pose, metrics });
  if (!cloud) return null;
  const sourceHz = cloud.hz;
  const prepared = faceForward(resample(smooth(cloud, 12), FPS));
  const built = buildSwing(prepared, id, "", SESSION_CAVEATS);
  if (!built) return null;
  const file = built.file as unknown as AppSwingFile;
  const stats = groupStats(file);
  const sequence = kinematicSequence(file);
  const contactSource = metrics.swingEvents.batInStrikeZone ?? metrics.swingEvents.maxBatSpeed ?? 0;
  const tip = batTipSpeed(pose.bat.tip, cloud.times);
  const lead = file.handedness === "R" ? "L" : "R";
  const plant = file.events.footPlant ?? 0;
  const contact = file.events.contact ?? file.frames - 1;
  const startSource = Math.round((trimStart(prepared) / FPS) * sourceHz);
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
  return { swing, built };
}

export function aggregate(rows: SessionSwing[]): SessionHandAggregate {
  const stat = (f: (s: SessionSwing) => number): Stat => meanSd(rows.map(f));
  const groupKeys = new Map<string, { label: string; role: SessionSwing["groups"][number]["role"] }>();
  for (const r of rows) for (const g of r.groups) groupKeys.set(`${g.group}|${g.role}`, { label: g.label, role: g.role });
  const groups = [...groupKeys.entries()].map(([key, meta]) => {
    const [group] = key.split("|");
    const pick = rows
      .map((r) => r.groups.find((g) => g.group === group && g.role === meta.role))
      .filter((g): g is SessionSwing["groups"][number] => !!g);
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

export function roundStats<T>(o: T): T {
  if (Array.isArray(o)) return o.map(roundStats) as T;
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o as Record<string, unknown>).map(([k, v]) => [k, roundStats(v)])) as T;
  if (typeof o === "number") return (Number.isFinite(o) ? round(o, 3) : null) as T;
  return o;
}

export type Assembled = { file: SessionFile; exemplarFiles: { id: string; label: string; file: Built["file"] }[] };

/** Rows to a session file with per-hand aggregates and the fastest and median swing per hand as exemplars. */
export function assembleSession(rows: Row[], id: string, label: string, sessionTag: string): Assembled {
  const byHand: SessionFile["byHand"] = {};
  const exemplars: SessionFile["exemplars"] = [];
  const exemplarFiles: Assembled["exemplarFiles"] = [];
  for (const hand of ["R", "L"] as const) {
    const handRows = rows.filter((r) => r.swing.handedness === hand);
    if (!handRows.length) continue;
    byHand[hand] = aggregate(handRows.map((r) => r.swing));
    const speeds = handRows.map((r) => r.swing.batSpeedMph);
    const best = handRows.reduce((a, b) => (b.swing.batSpeedMph > a.swing.batSpeedMph ? b : a));
    const med = median(speeds);
    const medianRow = handRows.reduce((a, b) => (Math.abs(b.swing.batSpeedMph - med) < Math.abs(a.swing.batSpeedMph - med) ? b : a));
    for (const [kind, row] of [["best", best], ["median", medianRow]] as const) {
      const fileId = `${sessionTag}-${kind}-${hand.toLowerCase()}`;
      const swingLabel = `${label} · ${kind} ${hand === "R" ? "right" : "left"}-handed swing by bat speed · markerless capture`;
      row.swing.fileId = fileId;
      exemplars.push({ hand, kind, swingId: row.swing.id, fileId });
      exemplarFiles.push({ id: fileId, label: swingLabel, file: { ...row.built.file, id: fileId, label: swingLabel } });
    }
  }
  const file: SessionFile = roundStats({
    schema: "form.session.v1",
    id,
    label,
    source: { kind: "trackman", attribution: TRACKMAN_ATTRIBUTION, captureHz: 370 },
    swings: rows.map((r) => r.swing),
    byHand,
    exemplars,
    caveats: [...SESSION_CAVEATS, "no-hitter-id"],
  });
  return { file, exemplarFiles };
}

/** Join the two exports' plays by first timestamp (never by playId; they differ between files). */
export function joinPlays<P extends { timestamps: number[] }, M extends { timestamps: number[] }>(
  poses: P[],
  metrics: M[],
): { pose: P; metrics: M }[] {
  const byTs = new Map<string, M>();
  for (const m of metrics) if (m.timestamps?.length) byTs.set(String(m.timestamps[0]), m);
  const out: { pose: P; metrics: M }[] = [];
  for (const p of poses) {
    const m = p.timestamps?.length ? byTs.get(String(p.timestamps[0])) : undefined;
    if (m) out.push({ pose: p, metrics: m });
  }
  return out;
}
