/** Shared types for the swing pipeline (spec 2026-09-10-swing-lab-design.md, sections 3 and 4). */

export type Vec3 = [number, number, number];

export type PointName =
  | "head"
  | "neck"
  | "torso"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "wristL"
  | "wristR"
  | "hipL"
  | "hipR"
  | "kneeL"
  | "kneeR"
  | "ankleL"
  | "ankleR"
  | "toeL"
  | "toeR"
  | "heelL"
  | "heelR";

export type EventName = "footPlant" | "maxBatSpeed" | "contact" | "followThrough";

export type Handedness = "L" | "R";

export type SwingSource = { kind: "cmu" | "trackman"; attribution: string; captureHz: number };

/** A capture as a set of named points over time, metres, Y up, right handed. */
export type PointCloud = {
  hz: number;
  /** Seconds per frame, starting at 0; may be slightly uneven before resampling. */
  times: number[];
  points: Partial<Record<PointName, Vec3[]>>;
  bat?: { knob: Vec3[]; tip: Vec3[] };
  /** Frame indices into `times`. */
  events: Partial<Record<EventName, number>>;
  eventsEstimated: boolean;
  handedness: Handedness;
  source: SwingSource;
};

export type JointKey =
  | "kneeL"
  | "kneeR"
  | "hipL"
  | "hipR"
  | "elbowL"
  | "elbowR"
  | "shoulderL"
  | "shoulderR"
  | "ankleL"
  | "ankleR"
  | "pelvisRotation"
  | "torsoRotation"
  | "separation";

export const JOINT_KEYS: JointKey[] = [
  "kneeL",
  "kneeR",
  "hipL",
  "hipR",
  "elbowL",
  "elbowR",
  "shoulderL",
  "shoulderR",
  "ankleL",
  "ankleR",
  "pelvisRotation",
  "torsoRotation",
  "separation",
];

/** Degrees per frame for every joint key. */
export type Curves = Record<JointKey, number[]>;

/** Physiological ranges used to clip and to count bad frames (spec 4.4). */
export const RANGES: Record<JointKey, [number, number]> = {
  kneeL: [0, 140],
  kneeR: [0, 140],
  hipL: [-30, 130],
  hipR: [-30, 130],
  elbowL: [0, 150],
  elbowR: [0, 150],
  shoulderL: [-90, 180],
  shoulderR: [-90, 180],
  ankleL: [-40, 60],
  ankleR: [-40, 60],
  pelvisRotation: [-360, 360],
  torsoRotation: [-360, 360],
  separation: [-180, 180],
};
