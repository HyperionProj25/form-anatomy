import index from "./swings-index.json";
import type { JointId } from "./joints";
import type { MotionSide } from "./motion";
import type { Quat } from "./quat";
import type { SegmentId } from "./segments";
import type { Vec3 } from "./types";

/** Measured swings (spec 2026-09-10-swing-lab-design.md, sections 3 and 5). */
export type Handedness = "L" | "R";
export type Role = "lead" | "back";
export type SwingEventName = "footPlant" | "maxBatSpeed" | "contact" | "followThrough";
export type SwingEvents = Partial<Record<SwingEventName, number>>;

export type SwingJointKey =
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

export type SwingFile = {
  schema: "form.swing.v1";
  id: string;
  label: string;
  source: { kind: "cmu" | "trackman"; attribution: string; captureHz: number };
  handedness: Handedness;
  /** "swing" (foot plant, contact) or "pitch" (foot strike, release); absent means swing. */
  motion?: "swing" | "pitch";
  fps: number;
  frames: number;
  events: SwingEvents;
  eventsEstimated: boolean;
  joints: Record<SwingJointKey, number[]>;
  /** World rotation of every rig segment relative to its rest basis, per frame (phase 15). */
  segments?: Record<SegmentId, Quat[]>;
  /** Pelvis offset per frame, model units, zero at frame 0 (phase 15). */
  root?: Vec3[];
  bat: { knob: Vec3[]; tip: Vec3[] } | null;
  caveats: string[];
};

export type SwingIndexEntry = {
  id: string;
  label: string;
  handedness: Handedness;
  kind: "cmu" | "trackman";
  frames: number;
  fps: number;
  events: SwingEvents;
  eventsEstimated: boolean;
  attribution: string;
  caveats: string[];
  /** Set on a session's exemplar swings, which the menu lists under the session instead. */
  session?: string;
};

export const SWING_INDEX = index as SwingIndexEntry[];

/** Joints a swing can drive in phase 14: one anatomical axis each. */
export const SWING_JOINTS: JointId[] = ["knee", "hip", "ankle", "elbow", "shoulder"];

export const EVENT_LABELS: Record<SwingEventName, string> = {
  footPlant: "Foot plant",
  maxBatSpeed: "Peak bat speed",
  contact: "Contact",
  followThrough: "Follow-through",
};

/** Event names in the motion's own words: a pitch strikes the foot and releases the ball. */
export function eventLabel(event: SwingEventName, motion: SwingFile["motion"] = "swing", short = false): string {
  if (motion === "pitch") {
    const pitch: Record<SwingEventName, [string, string]> = {
      footPlant: ["Foot strike", "Strike"],
      maxBatSpeed: ["Peak arm speed", "Peak"],
      contact: ["Release", "Release"],
      followThrough: ["Follow-through", "Follow"],
    };
    return pitch[event][short ? 1 : 0];
  }
  const swing: Record<SwingEventName, [string, string]> = {
    footPlant: ["Foot plant", "Plant"],
    maxBatSpeed: ["Peak bat speed", "Peak"],
    contact: ["Contact", "Contact"],
    followThrough: ["Follow-through", "Follow"],
  };
  return swing[event][short ? 1 : 0];
}

/** What each caveat key means on screen. */
export const CAVEATS: Record<string, string> = {
  optical:
    "Optical motion capture from 2003 (CMU subject 124): real movement with visible jitter, one hitter.",
  markerless:
    "Markerless capture: joint centres are estimated by the camera system, not marked on the body.",
  "no-bat": "No bat was captured, so hands are empty and contact is estimated from the lead wrist's speed.",
  "events-estimated": "Foot plant and contact are estimated from the motion, not measured by the system.",
  "twist-held":
    "Forearm and shin rotation are not visible to the capture and are held at neutral.",
  "one-axis":
    "Each joint moves about one anatomical axis by the measured angle; its other axes are held.",
};

export function swingById(id: string): SwingIndexEntry | undefined {
  return SWING_INDEX.find((s) => s.id === id);
}

/** A right-handed hitter leads with the left side. */
export function sideForRole(role: Role, handedness: Handedness): MotionSide {
  return (role === "lead") === (handedness === "R") ? "left" : "right";
}

export function roleForSide(side: MotionSide, handedness: Handedness): Role {
  return sideForRole("lead", handedness) === side ? "lead" : "back";
}

export function curveKey(joint: JointId, side: MotionSide): SwingJointKey | null {
  if (!SWING_JOINTS.includes(joint)) return null;
  return `${joint}${side === "left" ? "L" : "R"}` as SwingJointKey;
}

export function curveOf(swing: SwingFile, joint: JointId, side: MotionSide): number[] {
  const key = curveKey(joint, side);
  return key ? swing.joints[key] : [];
}

export function frameAt(swing: SwingFile, phase: number): number {
  return Math.round(Math.min(1, Math.max(0, phase)) * (swing.frames - 1));
}

export function phaseAt(swing: SwingFile, frame: number): number {
  return swing.frames > 1 ? Math.min(1, Math.max(0, frame / (swing.frames - 1))) : 0;
}

/** The joint's angle at foot plant (else the first frame) and at contact (else the last). */
export function swingRange(swing: SwingFile, joint: JointId, side: MotionSide): [number, number] {
  const curve = curveOf(swing, joint, side);
  if (!curve.length) return [0, 0];
  const a = swing.events.footPlant ?? 0;
  const b = swing.events.contact ?? curve.length - 1;
  return [curve[a], curve[b]];
}

/** Degrees between two frames; positive when the angle grows. */
export function changeBetween(curve: number[], a: number, b: number): number {
  if (!curve.length) return 0;
  const clamp = (i: number) => Math.min(curve.length - 1, Math.max(0, i));
  return curve[clamp(b)] - curve[clamp(a)];
}

const cache = new Map<string, Promise<SwingFile>>();

/** A swing built in the browser: seed the loader cache and list it for this visit. */
export function registerSwing(file: SwingFile, session?: string): void {
  cache.set(file.id, Promise.resolve(file));
  const entry: SwingIndexEntry = {
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
    ...(session ? { session } : {}),
  };
  const at = SWING_INDEX.findIndex((s) => s.id === file.id);
  if (at >= 0) SWING_INDEX[at] = entry;
  else SWING_INDEX.push(entry);
}

/** Fetch a swing file once; later calls share the same promise. */
export function loadSwing(id: string, base = import.meta.env.BASE_URL): Promise<SwingFile> {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = fetch(`${base}swings/${id}.json`).then((r) => {
    if (!r.ok) throw new Error(`Swing ${id} failed to load (${r.status})`);
    return r.json() as Promise<SwingFile>;
  });
  p.catch(() => cache.delete(id));
  cache.set(id, p);
  return p;
}
