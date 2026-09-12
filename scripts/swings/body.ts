import { parts } from "../../src/data/catalog";
import {
  add,
  basisFrom,
  cross,
  dot,
  IDENTITY,
  mid,
  normalize,
  quatFromBases,
  scale,
  slerp,
  sub,
  type Basis,
  type Quat,
} from "../../src/data/quat";
import { restBasis, SEGMENT_IDS, segmentPivot, type SegmentId } from "../../src/data/segments";
import type { Vec3 } from "../../src/data/types";
import { frameFrom, pelvisFrame, thoraxFrame } from "./kinematics";
import type { PointCloud, PointName } from "./types";

/** Below this bend the flexion plane is unreliable; the previous frame's second axis is kept. */
const STRAIGHT_DEG = 15;
/** The shoulder girdle follows the arm's elevation by this fraction (a quarter: less than the textbook 2:1 rhythm, which threw the scapular muscles too far). */
const GIRDLE_SHARE = 0.25;

function pt(cloud: PointCloud, name: PointName, i: number): Vec3 {
  const s = cloud.points[name];
  if (!s) throw new Error(`Missing point ${name}`);
  return s[i];
}

function angleBetween(a: Vec3, b: Vec3): number {
  return (Math.acos(Math.min(1, Math.max(-1, dot(normalize(a), normalize(b))))) * 180) / Math.PI;
}

/**
 * Basis of a limb segment from its proximal joint, distal joint and the next joint beyond. The
 * second (anterior) axis comes from the flexion plane: arms flex forward, legs flex back. Near a
 * straight joint the plane is undefined, so the previous basis, else `fallback`, supplies it.
 */
function limbBases(
  proximal: Vec3,
  distal: Vec3,
  beyond: Vec3,
  forward: boolean,
  fallback: Vec3,
  prevProximal?: Basis,
  prevDistal?: Basis,
): [Basis, Basis] {
  const lp = sub(distal, proximal);
  const ld = sub(beyond, distal);
  const straight = angleBetween(lp, ld) < STRAIGHT_DEG;
  if (straight) {
    return [basisFrom(lp, prevProximal?.second ?? fallback), basisFrom(ld, prevDistal?.second ?? fallback)];
  }
  const n = cross(lp, ld);
  const secondP = forward ? cross(n, lp) : cross(lp, n);
  const secondD = forward ? cross(n, ld) : cross(ld, n);
  return [basisFrom(lp, secondP), basisFrom(ld, secondD)];
}

/** Measured basis of every segment at one frame (girdles take the thorax; hands take the forearm). */
export function measuredBases(
  cloud: PointCloud,
  i: number,
  prev?: Record<SegmentId, Basis>,
): Record<SegmentId, Basis> {
  const pf = pelvisFrame(cloud, i);
  const tf = thoraxFrame(cloud, i);
  const hipMid = mid(pt(cloud, "hipL", i), pt(cloud, "hipR", i));
  const torso = pt(cloud, "torso", i);
  const neck = pt(cloud, "neck", i);
  const head = pt(cloud, "head", i);
  const out = {} as Record<SegmentId, Basis>;
  out.pelvis = basisFrom(pf.up, pf.anterior);
  out.lumbar = basisFrom(sub(torso, hipMid), normalize(add(pf.anterior, tf.anterior)));
  out.thorax = basisFrom(tf.up, tf.anterior);
  // With the ears measured the head faces its own way (the hitter keeps watching the ball while the
  // torso turns); without them it keeps the thorax's facing.
  const earL = cloud.points.earL?.[i];
  const earR = cloud.points.earR?.[i];
  const headFacing = earL && earR ? frameFrom(sub(earL, earR), sub(head, neck)).anterior : tf.anterior;
  out.head = basisFrom(sub(head, neck), headFacing);
  out.girdleL = out.thorax;
  out.girdleR = out.thorax;
  for (const side of ["L", "R"] as const) {
    const [upper, fore] = limbBases(
      pt(cloud, `shoulder${side}`, i),
      pt(cloud, `elbow${side}`, i),
      pt(cloud, `wrist${side}`, i),
      true,
      tf.anterior,
      prev?.[`upperArm${side}`],
      prev?.[`forearm${side}`],
    );
    out[`upperArm${side}`] = upper;
    out[`forearm${side}`] = fore;
    out[`hand${side}`] = fore;
    const [thigh, shank] = limbBases(
      pt(cloud, `hip${side}`, i),
      pt(cloud, `knee${side}`, i),
      pt(cloud, `ankle${side}`, i),
      false,
      pf.anterior,
      prev?.[`thigh${side}`],
      prev?.[`shank${side}`],
    );
    out[`thigh${side}`] = thigh;
    out[`shank${side}`] = shank;
    // Ankle to toe on both sources, to match the model's own ankle-to-toe rest axis; the heel point
    // would pitch the foot by the shoe's own angle.
    const footLong = sub(pt(cloud, `toe${side}`, i), pt(cloud, `ankle${side}`, i));
    out[`foot${side}`] = basisFrom(footLong, cross(shank.side, footLong));
  }
  return out;
}

/** World rotation of every segment relative to its rest basis, per frame. */
export function segmentQuats(cloud: PointCloud): Record<SegmentId, Quat[]> {
  const rest = Object.fromEntries(SEGMENT_IDS.map((s) => [s, restBasis(s)])) as Record<SegmentId, Basis>;
  const out = Object.fromEntries(SEGMENT_IDS.map((s) => [s, [] as Quat[]])) as Record<SegmentId, Quat[]>;
  let prev: Record<SegmentId, Basis> | undefined;
  const n = cloud.times.length;
  for (let i = 0; i < n; i++) {
    const bases = measuredBases(cloud, i, prev);
    for (const s of SEGMENT_IDS) {
      if (s === "girdleL" || s === "girdleR" || s === "handL" || s === "handR") continue;
      out[s].push(quatFromBases(bases[s], rest[s]));
    }
    for (const side of ["L", "R"] as const) {
      const thorax = out.thorax[i];
      const arm = out[`upperArm${side}`][i];
      out[`girdle${side}`].push(slerp(thorax, arm, GIRDLE_SHARE));
      // No hand orientation is captured: the hand turns exactly as its forearm does.
      out[`hand${side}`].push(out[`forearm${side}`][i]);
    }
    prev = bases;
  }
  return out;
}

const modelFloorY = Math.min(...parts.filter((p) => p.type === "bone").map((p) => p.bbox[0][1]));

/**
 * Pelvis offset per frame in model units: the capture's hip-midpoint travel relative to its
 * first frame, scaled by the model's hip height over the hitter's. Zero at frame 0.
 */
export function rootTrack(cloud: PointCloud): Vec3[] {
  const n = cloud.times.length;
  const hipMid = (i: number) => mid(pt(cloud, "hipL", i), pt(cloud, "hipR", i));
  let floorY = Infinity;
  for (let i = 0; i < n; i++)
    for (const name of ["toeL", "toeR", "heelL", "heelR"] as PointName[]) {
      const p = cloud.points[name]?.[i];
      if (p && p[1] < floorY) floorY = p[1];
    }
  const captureHipHeight = Math.max(0.3, hipMid(0)[1] - floorY);
  const modelHipHeight = segmentPivot("pelvis")[1] - modelFloorY;
  const k = modelHipHeight / captureHipHeight;
  const h0 = hipMid(0);
  return Array.from({ length: n }, (_, i) => scale(sub(hipMid(i), h0), k));
}

export { IDENTITY };
