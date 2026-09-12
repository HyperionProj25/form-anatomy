import type { Handedness, PointCloud, PointName, Vec3 } from "./types";

/** `baseline.biomech.pose.v0`: CMU BVH converted to joint positions by tools/bvh_to_pose.py. */
type CmuFile = {
  metadata: { handedness?: string; capture_fps: number; events?: { contact_frame?: number } };
  frames: { timestamp: number; joints: Record<string, Vec3> }[];
};

const CMU_MAP: Record<string, PointName> = {
  head: "head",
  neck: "neck",
  chest: "torso",
  l_shoulder: "shoulderL",
  r_shoulder: "shoulderR",
  l_elbow: "elbowL",
  r_elbow: "elbowR",
  l_wrist: "wristL",
  r_wrist: "wristR",
  l_hip: "hipL",
  r_hip: "hipR",
  l_knee: "kneeL",
  r_knee: "kneeR",
  l_ankle: "ankleL",
  r_ankle: "ankleR",
  l_toe: "toeL",
  r_toe: "toeR",
};

export const CMU_ATTRIBUTION =
  "CMU Graphics Lab Motion Capture Database, subject 124 (NSF EIA-0196217), via the cgspeed BVH conversion";

export function fromCmu(json: unknown): PointCloud {
  const file = json as CmuFile;
  const points: PointCloud["points"] = {};
  for (const [src, name] of Object.entries(CMU_MAP)) points[name] = file.frames.map((f) => [...f.joints[src]] as Vec3);
  const handedness: Handedness = /^L/i.test(file.metadata.handedness ?? "R") ? "L" : "R";
  const contact = file.metadata.events?.contact_frame;
  return {
    hz: file.metadata.capture_fps,
    times: file.frames.map((f) => f.timestamp - file.frames[0].timestamp),
    points,
    events: contact !== undefined ? { contact } : {},
    // The contact frame is an annotation on a capture with no bat, not a measurement.
    eventsEstimated: true,
    handedness,
    source: { kind: "cmu", attribution: CMU_ATTRIBUTION, captureHz: file.metadata.capture_fps },
  };
}

/** The curated TrackMan extract: pose, events and bat inline per swing. */
type TrackmanDemo = {
  sessions: {
    swings: {
      handedness: "l" | "r";
      frames: number;
      timesSec: number[];
      swingEvents: { frontFootPlant?: number; batInStrikeZone?: number; maxBatSpeed?: number; batHorizEnd?: number };
      hitter: Record<string, Vec3[]>;
      bat: { tip: Vec3[]; leadHandTop: Vec3[]; leadHandBottom: Vec3[] };
    }[];
  }[];
};

const TRACKMAN_MAP: Record<string, PointName> = {
  headTip: "head",
  neck: "neck",
  centerTorso: "torso",
  leftShoulder: "shoulderL",
  rightShoulder: "shoulderR",
  leftElbow: "elbowL",
  rightElbow: "elbowR",
  leftWrist: "wristL",
  rightWrist: "wristR",
  leftHip: "hipL",
  rightHip: "hipR",
  leftKnee: "kneeL",
  rightKnee: "kneeR",
  leftAnkle: "ankleL",
  rightAnkle: "ankleR",
  leftHeel: "heelL",
  rightHeel: "heelR",
  leftShoeTip: "toeL",
  rightShoeTip: "toeR",
};

export const TRACKMAN_ATTRIBUTION = "TrackMan markerless hitting capture, sample supplied to Baseline Analytics";

/**
 * One swing from the extract, or null when its events are missing or out of order or its
 * points are not a standing hitter (a few extract swings are tracking failures).
 */
export function fromTrackmanDemo(json: unknown, session: number, index: number): PointCloud | null {
  const swing = (json as TrackmanDemo).sessions[session]?.swings[index];
  if (!swing) return null;
  const ev = swing.swingEvents;
  const valid = (v: number | undefined) => (v !== undefined && v > 0 && v < swing.frames ? v : undefined);
  const footPlant = valid(ev.frontFootPlant);
  const contact = valid(ev.batInStrikeZone);
  const maxBatSpeed = valid(ev.maxBatSpeed);
  const followThrough = valid(ev.batHorizEnd);
  if (footPlant === undefined || (contact === undefined && maxBatSpeed === undefined)) return null;
  if ((contact !== undefined && footPlant >= contact) || (maxBatSpeed !== undefined && footPlant >= maxBatSpeed)) return null;
  const points: PointCloud["points"] = {};
  for (const [src, name] of Object.entries(TRACKMAN_MAP)) {
    const series = swing.hitter[src];
    if (!series) return null;
    points[name] = series.map((p) => [...p] as Vec3);
  }
  const hipL = points.hipL!;
  const hipR = points.hipR!;
  const ankleL = points.ankleL!;
  const ankleR = points.ankleR!;
  const plausible =
    hipL.every((p, i) => Math.abs(p[1] - hipR[i][1]) < 0.3 && p[1] > 0.4 && p[1] < 1.5) &&
    ankleL.every((p) => p[1] > -0.3) &&
    ankleR.every((p) => p[1] > -0.3);
  if (!plausible) return null;
  const n = swing.timesSec.length;
  const hz = (n - 1) / (swing.timesSec[n - 1] - swing.timesSec[0]);
  const events: PointCloud["events"] = { footPlant };
  if (contact !== undefined) events.contact = contact;
  if (maxBatSpeed !== undefined) events.maxBatSpeed = maxBatSpeed;
  if (followThrough !== undefined) events.followThrough = followThrough;
  return {
    hz,
    times: swing.timesSec.map((t) => t - swing.timesSec[0]),
    points,
    bat: { knob: swing.bat.leadHandBottom.map((p) => [...p] as Vec3), tip: swing.bat.tip.map((p) => [...p] as Vec3) },
    events,
    eventsEstimated: false,
    handedness: swing.handedness === "l" ? "L" : "R",
    source: { kind: "trackman", attribution: TRACKMAN_ATTRIBUTION, captureHz: Math.round(hz) },
  };
}
