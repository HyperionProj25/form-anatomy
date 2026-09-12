import type { Quat } from "../../src/data/quat";
import { SEGMENT_IDS, type SegmentId } from "../../src/data/segments";
import type { SwingFile as AppSwingFile } from "../../src/data/swings";
import { rootTrack, segmentQuats } from "./body";
import { curves, estimateEvents, quality, trim } from "./kinematics";
import { JOINT_KEYS, type Curves, type PointCloud } from "./types";
import { floorCorrect, validateBody } from "./validate";

/** The file the app reads (`form.swing.v1`), as the build writes it. */
export type SwingFile = {
  schema: "form.swing.v1";
  id: string;
  label: string;
  source: PointCloud["source"];
  handedness: "L" | "R";
  /** "swing" (foot plant, contact) or "pitch" (foot strike, release). */
  motion: "swing" | "pitch";
  fps: number;
  frames: number;
  events: PointCloud["events"];
  eventsEstimated: boolean;
  joints: Curves;
  segments: Record<SegmentId, Quat[]>;
  root: number[][];
  bat: { knob: number[][]; tip: number[][] } | null;
  caveats: string[];
};

export type Built = { file: SwingFile; clippedPct: number; kneeRms: number; elbowRms: number };

export const FPS = 120;
const BEFORE_S = 0.5;
const AFTER_S = 0.35;

export const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

/**
 * A prepared cloud (smoothed, resampled, facing forward) to a swing file: curves, events, trim,
 * quality, segment orientations, root, floor correction, validation. Null when rejected.
 */
export function buildSwing(
  cloud: PointCloud,
  id: string,
  label: string,
  caveats: string[],
  log: (line: string) => void = () => {},
): Built | null {
  const c = curves(cloud);
  const withEvents = estimateEvents(cloud);
  const t = trim(withEvents, c, BEFORE_S, AFTER_S);
  const frames = t.cloud.times.length;
  const q = quality(t.curves, t.cloud.events, frames);
  const ranges = JOINT_KEYS.map((k) => `${k} ${round(Math.min(...t.curves[k]), 0)}..${round(Math.max(...t.curves[k]), 0)}`);
  log(
    `${id}: ${frames} frames, events ${JSON.stringify(t.cloud.events)}${t.cloud.eventsEstimated ? " (estimated)" : ""}, clipped ${q.clippedPct.toFixed(2)} %${q.ok ? "" : " REJECTED"}`,
  );
  log(`  ${ranges.join(" · ")}`);
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
  const quats = segmentQuats(t.cloud);
  const segments = Object.fromEntries(
    SEGMENT_IDS.map((s) => [s, quats[s].map((qv) => qv.map((v) => round(v, 4)) as Quat)]),
  ) as Record<SegmentId, Quat[]>;
  const root = rootTrack(t.cloud).map((p) => p.map((v) => round(v, 3)));
  const file: SwingFile = {
    schema: "form.swing.v1",
    id,
    label,
    source: cloud.source,
    handedness: cloud.handedness,
    motion: cloud.motion,
    fps: FPS,
    frames,
    events: t.cloud.events,
    eventsEstimated: t.cloud.eventsEstimated,
    joints,
    segments,
    root,
    bat,
    caveats: allCaveats,
  };
  floorCorrect(file as unknown as AppSwingFile);
  const body = validateBody(file as unknown as AppSwingFile);
  log(
    `  body: knee RMS ${body.kneeRms.toFixed(2)}°, elbow RMS ${body.elbowRms.toFixed(2)}°, lowest toe ${(body.lowestToe * 100).toFixed(1)} cm${body.ok ? "" : " REJECTED"}`,
  );
  if (!body.ok) return null;
  return { file, clippedPct: q.clippedPct, kneeRms: body.kneeRms, elbowRms: body.elbowRms };
}

/** The original-clip frame for a trimmed frame, so a swing can be lined up with the source's own series. */
export function trimStart(cloud: PointCloud): number {
  const withEvents = estimateEvents(cloud);
  const plant = withEvents.events.footPlant ?? 0;
  return Math.max(0, plant - Math.round(BEFORE_S * cloud.hz));
}
