import { lengthRatios, musclePaths } from "./body";
import { MUSCLE_GROUPS, REGION_ORDER, type MuscleGroup } from "./muscle-groups";
import type { MotionSide } from "./motion";
import { angleOf, inverse, mul } from "./quat";
import type { SegmentId } from "./segments";
import { roleForSide, sideForRole, type Role, type SwingFile } from "./swings";

/**
 * The swing report (spec section 17): per functional group and side, how the muscle paths
 * changed through the swing, when they shortened fastest, and the order the body segments
 * reached peak rotation speed. Path length is not fibre length; every number is a path-length
 * ratio from the posed skeleton, and the report says so.
 */

export type GroupStat = {
  group: MuscleGroup;
  role: Role;
  side: MotionSide;
  /** Muscles in the group with a measured path. */
  members: number;
  /** Mean path length ratio per frame, 1 at frame 0. */
  series: Float32Array;
  atPlant: number;
  atContact: number;
  /** Change from foot plant to contact, fraction. */
  change: number;
  /** Fastest shortening, fraction per second (negative), and when, ms before contact (negative = before). */
  peakShortening: number;
  peakShorteningMs: number;
  /** Fastest lengthening, fraction per second, and when. */
  peakLengthening: number;
  peakLengtheningMs: number;
  /** Longest path before contact: the "load" point, and when. */
  longest: number;
  longestMs: number;
};

const sideOfId = (id: string): MotionSide | null => (id.endsWith("-l") ? "left" : id.endsWith("-r") ? "right" : null);

function msBeforeContact(frame: number, swing: SwingFile): number {
  const contact = swing.events.contact ?? swing.frames - 1;
  return Math.round(((frame - contact) / swing.fps) * 1000);
}

/** Central-difference derivative per second. */
function velocity(series: Float32Array, fps: number): Float32Array {
  const n = series.length;
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = series[Math.max(0, i - 1)];
    const b = series[Math.min(n - 1, i + 1)];
    v[i] = ((b - a) * fps) / (i === 0 || i === n - 1 ? 1 : 2);
  }
  return v;
}

const statCache = new Map<string, GroupStat[]>();

/** One row per group and side, in report order (ground up, lead side first within each group). */
export function groupStats(swing: SwingFile): GroupStat[] {
  const hit = statCache.get(swing.id);
  if (hit) return hit;
  const ratios = lengthRatios(swing);
  const byKey = new Map<string, { id: string; side: MotionSide }[]>();
  for (const p of musclePaths()) {
    const side = sideOfId(p.id);
    if (!side) continue;
    const list = byKey.get(p.key) ?? [];
    list.push({ id: p.id, side });
    byKey.set(p.key, list);
  }
  const plant = swing.events.footPlant ?? 0;
  const contact = swing.events.contact ?? swing.frames - 1;
  const out: GroupStat[] = [];
  const groups = [...MUSCLE_GROUPS].sort((a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region));
  for (const group of groups) {
    for (const role of ["lead", "back"] as Role[]) {
      const side = sideForRole(role, swing.handedness);
      const ids = group.keys.flatMap((k) => (byKey.get(k) ?? []).filter((m) => m.side === side).map((m) => m.id));
      if (!ids.length) continue;
      const series = new Float32Array(swing.frames);
      for (const id of ids) {
        const r = ratios.get(id)!;
        for (let f = 0; f < swing.frames; f++) series[f] += r[f] / ids.length;
      }
      const v = velocity(series, swing.fps);
      let minV = 0;
      let minAt = plant;
      let maxV = 0;
      let maxAt = plant;
      let longest = series[0];
      let longestAt = 0;
      for (let f = 0; f < swing.frames; f++) {
        if (v[f] < minV) {
          minV = v[f];
          minAt = f;
        }
        if (v[f] > maxV) {
          maxV = v[f];
          maxAt = f;
        }
        if (f <= contact && series[f] > longest) {
          longest = series[f];
          longestAt = f;
        }
      }
      out.push({
        group,
        role,
        side,
        members: ids.length,
        series,
        atPlant: series[plant],
        atContact: series[contact],
        change: series[contact] / (series[plant] || 1) - 1,
        peakShortening: minV,
        peakShorteningMs: msBeforeContact(minAt, swing),
        peakLengthening: maxV,
        peakLengtheningMs: msBeforeContact(maxAt, swing),
        longest,
        longestMs: msBeforeContact(longestAt, swing),
      });
    }
  }
  statCache.set(swing.id, out);
  return out;
}

export type SequenceStep = { label: string; peakDegPerS: number; peakMs: number };

/** Rotation speed of a rig segment per frame, degrees per second, from its stored orientations. */
function segmentSpeed(swing: SwingFile, seg: SegmentId): Float32Array {
  const q = swing.segments?.[seg];
  const n = swing.frames;
  const out = new Float32Array(n);
  if (!q) return out;
  for (let f = 0; f < n; f++) {
    const a = q[Math.max(0, f - 1)];
    const b = q[Math.min(n - 1, f + 1)];
    const span = (Math.min(n - 1, f + 1) - Math.max(0, f - 1)) / swing.fps || 1 / swing.fps;
    out[f] = angleOf(mul(b, inverse(a))) / span;
  }
  return out;
}

/**
 * The kinematic sequence: when the pelvis, the torso, the lead upper arm and the lead forearm each
 * reached peak rotation speed, in ms relative to contact. Pelvis and torso use the rotation about
 * vertical; the arm segments use their whole-orientation rate, as TrackMan's own segment
 * velocities do. A proximal-to-distal order is the textbook pattern; the report states the order
 * it measured and nothing more.
 */
export function kinematicSequence(swing: SwingFile): SequenceStep[] {
  const lead = sideForRole("lead", swing.handedness) === "left" ? "L" : "R";
  const series: [string, Float32Array][] = [
    ["Pelvis rotation", velocity(Float32Array.from(swing.joints.pelvisRotation), swing.fps)],
    ["Torso rotation", velocity(Float32Array.from(swing.joints.torsoRotation), swing.fps)],
    ["Lead arm", segmentSpeed(swing, `upperArm${lead}`)],
    ["Lead forearm", segmentSpeed(swing, `forearm${lead}`)],
  ];
  // The sequence is about the drive into contact: search up to 25 ms past contact, not the follow-through.
  const last = Math.min(swing.frames - 1, (swing.events.contact ?? swing.frames - 1) + Math.round(0.025 * swing.fps));
  return series.map(([label, v]) => {
    let best = 0;
    for (let f = 1; f <= last; f++) if (Math.abs(v[f]) > Math.abs(v[best])) best = f;
    return { label, peakDegPerS: Math.round(v[best]), peakMs: msBeforeContact(best, swing) };
  });
}

const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %`;
const pctPerS = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %/s`;

/** A plain-English line per row, for the report table. */
export function describeStat(s: GroupStat): string {
  const role = s.role === "lead" ? "Lead" : "Back";
  const dir = s.change < -0.02 ? "shortens" : s.change > 0.02 ? "lengthens" : "holds";
  return `${role} ${s.group.label.toLowerCase()} ${dir} ${pct(s.change)} from foot plant to contact; fastest shortening ${pctPerS(s.peakShortening)} at ${s.peakShorteningMs} ms; longest ${pct(s.longest - 1)} at ${s.longestMs} ms.`;
}

/** CSV of the group rows and the sequence, one swing per call. */
export function reportCsv(swing: SwingFile): string {
  const rows = [
    ["swing", "group", "side", "role", "members", "ratio_at_plant", "ratio_at_contact", "change_plant_to_contact", "peak_shortening_per_s", "peak_shortening_ms", "peak_lengthening_per_s", "peak_lengthening_ms", "longest_ratio_before_contact", "longest_ms"].join(","),
  ];
  for (const s of groupStats(swing))
    rows.push(
      [
        swing.id,
        JSON.stringify(s.group.label),
        s.side,
        s.role,
        s.members,
        s.atPlant.toFixed(4),
        s.atContact.toFixed(4),
        s.change.toFixed(4),
        s.peakShortening.toFixed(3),
        s.peakShorteningMs,
        s.peakLengthening.toFixed(3),
        s.peakLengtheningMs,
        s.longest.toFixed(4),
        s.longestMs,
      ].join(","),
    );
  rows.push("");
  rows.push(["swing", "segment", "peak_deg_per_s", "peak_ms_before_contact"].join(","));
  for (const step of kinematicSequence(swing)) rows.push([swing.id, JSON.stringify(step.label), step.peakDegPerS, step.peakMs].join(","));
  return rows.join("\n") + "\n";
}

export { roleForSide };
