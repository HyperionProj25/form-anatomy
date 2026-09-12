import { JOINT_KEYS, RANGES, type Curves, type EventName, type JointKey, type PointCloud, type PointName, type Vec3 } from "./types";

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const mid = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5);
const DEG = 180 / Math.PI;

/** Angle at b between a and c, degrees. */
export function angleAt(a: Vec3, b: Vec3, c: Vec3): number {
  const u = norm(sub(a, b));
  const v = norm(sub(c, b));
  return Math.acos(Math.min(1, Math.max(-1, dot(u, v)))) * DEG;
}

/** Wrap an angle in degrees to (-180, 180]. */
export function wrap(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Zero-lag low-pass: a second-order Butterworth run forward and back (fourth order overall), the
 * usual filter for whole-body kinematics. Ends are reflect-padded so the clip's edges do not ring.
 */
export function butterworth(series: number[], hz: number, cutoffHz: number): number[] {
  const n = series.length;
  if (n < 4) return [...series];
  const wc = Math.tan((Math.PI * cutoffHz) / hz);
  const k1 = Math.SQRT2 * wc;
  const k2 = wc * wc;
  const a0 = 1 + k1 + k2;
  const b0 = k2 / a0;
  const b1 = (2 * k2) / a0;
  const b2 = k2 / a0;
  const a1 = (2 * (k2 - 1)) / a0;
  const a2 = (1 - k1 + k2) / a0;
  const pad = Math.min(n - 1, Math.ceil((3 * hz) / cutoffHz));
  const x: number[] = [];
  for (let i = pad; i >= 1; i--) x.push(2 * series[0] - series[i]);
  x.push(...series);
  for (let i = 1; i <= pad; i++) x.push(2 * series[n - 1] - series[n - 1 - i]);
  const pass = (input: number[]) => {
    const y = new Array<number>(input.length);
    let x1 = input[0];
    let x2 = input[0];
    let y1 = input[0];
    let y2 = input[0];
    for (let i = 0; i < input.length; i++) {
      const xi = input[i];
      const yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      y[i] = yi;
      x2 = x1;
      x1 = xi;
      y2 = y1;
      y1 = yi;
    }
    return y;
  };
  const forward = pass(x);
  const backward = pass(forward.reverse()).reverse();
  return backward.slice(pad, pad + n);
}

function mapPoints(cloud: PointCloud, f: (series: Vec3[]) => Vec3[]): PointCloud {
  const points: PointCloud["points"] = {};
  for (const [name, series] of Object.entries(cloud.points) as [PointName, Vec3[]][]) points[name] = f(series);
  const bat = cloud.bat ? { knob: f(cloud.bat.knob), tip: f(cloud.bat.tip) } : undefined;
  return { ...cloud, points, bat };
}

/** Smooth every point (and the bat) per axis. */
export function smooth(cloud: PointCloud, cutoffHz: number): PointCloud {
  return mapPoints(cloud, (series) => {
    const axes = [0, 1, 2].map((k) => butterworth(series.map((p) => p[k]), cloud.hz, cutoffHz));
    return series.map((_, i) => [axes[0][i], axes[1][i], axes[2][i]] as Vec3);
  });
}

/** Linear resampling onto a uniform grid at `toHz`; event frames keep their time. */
export function resample(cloud: PointCloud, toHz: number): PointCloud {
  const t = cloud.times;
  const n = t.length;
  const duration = t[n - 1] - t[0];
  const count = Math.floor(duration * toHz) + 1;
  const times = Array.from({ length: count }, (_, i) => i / toHz);
  const sample = (series: Vec3[]) => {
    const out: Vec3[] = [];
    let j = 0;
    for (const time of times) {
      const target = t[0] + time;
      while (j < n - 2 && t[j + 1] < target) j++;
      const span = t[j + 1] - t[j] || 1;
      const k = Math.min(1, Math.max(0, (target - t[j]) / span));
      const a = series[j];
      const b = series[j + 1] ?? a;
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
    }
    return out;
  };
  const events: PointCloud["events"] = {};
  for (const [name, frame] of Object.entries(cloud.events) as [EventName, number][]) {
    if (frame === undefined) continue;
    const i = Math.min(n - 1, Math.max(0, frame));
    events[name] = Math.min(count - 1, Math.round((t[i] - t[0]) * toHz));
  }
  return { ...mapPoints(cloud, sample), hz: toHz, times, events };
}

type Frame = { lateral: Vec3; up: Vec3; anterior: Vec3 };

function pt(cloud: PointCloud, name: PointName, i: number): Vec3 {
  const series = cloud.points[name];
  if (!series) throw new Error(`Missing point ${name}`);
  return series[i];
}

function frameFrom(lateralRaw: Vec3, upRaw: Vec3): Frame {
  const lateral = norm(lateralRaw);
  const anterior = norm(cross(lateral, norm(upRaw)));
  const up = norm(cross(anterior, lateral));
  return { lateral, up, anterior };
}

/** Pelvis frame: lateral from right hip to left hip, up toward the torso point, anterior by cross product. */
export function pelvisFrame(cloud: PointCloud, i: number): Frame {
  const hipL = pt(cloud, "hipL", i);
  const hipR = pt(cloud, "hipR", i);
  return frameFrom(sub(hipL, hipR), sub(pt(cloud, "torso", i), mid(hipL, hipR)));
}

/** Thorax frame: lateral from right shoulder to left shoulder, up from the torso point to the neck. */
export function thoraxFrame(cloud: PointCloud, i: number): Frame {
  return frameFrom(
    sub(pt(cloud, "shoulderL", i), pt(cloud, "shoulderR", i)),
    sub(pt(cloud, "neck", i), pt(cloud, "torso", i)),
  );
}

/** Yaw of a direction about Y, degrees; 0 means +Z (the model's anterior). */
export function heading(v: Vec3): number {
  return Math.atan2(v[0], v[2]) * DEG;
}

function rotateY(p: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

/** Rotate the capture about Y so the pelvis anterior over the first frames points to +Z. */
export function faceForward(cloud: PointCloud): PointCloud {
  const n = cloud.times.length;
  const count = Math.min(5, n);
  let sx = 0;
  let sz = 0;
  for (let i = 0; i < count; i++) {
    const a = pelvisFrame(cloud, i).anterior;
    sx += a[0];
    sz += a[2];
  }
  const yaw = heading([sx, 0, sz]);
  return mapPoints(cloud, (series) => series.map((p) => rotateY(p, -yaw)));
}

/** Degrees per frame for every joint key; conventions in spec section 3. */
export function curves(cloud: PointCloud): Curves {
  const n = cloud.times.length;
  const out = Object.fromEntries(JOINT_KEYS.map((k) => [k, new Array<number>(n)])) as Curves;
  const hasHeel = !!cloud.points.heelL && !!cloud.points.heelR;
  let pelvis0 = 0;
  let torso0 = 0;
  for (let i = 0; i < n; i++) {
    const pf = pelvisFrame(cloud, i);
    const tf = thoraxFrame(cloud, i);
    const down: Vec3 = scale(pf.up, -1);
    const tdown: Vec3 = scale(tf.up, -1);
    for (const side of ["L", "R"] as const) {
      const hip = pt(cloud, `hip${side}`, i);
      const knee = pt(cloud, `knee${side}`, i);
      const ankle = pt(cloud, `ankle${side}`, i);
      const toe = pt(cloud, `toe${side}`, i);
      const shoulder = pt(cloud, `shoulder${side}`, i);
      const elbow = pt(cloud, `elbow${side}`, i);
      const wrist = pt(cloud, `wrist${side}`, i);
      out[`knee${side}`][i] = 180 - angleAt(hip, knee, ankle);
      out[`elbow${side}`][i] = 180 - angleAt(shoulder, elbow, wrist);
      const thigh = norm(sub(knee, hip));
      out[`hip${side}`][i] = Math.atan2(dot(thigh, pf.anterior), dot(thigh, down)) * DEG;
      const arm = norm(sub(elbow, shoulder));
      out[`shoulder${side}`][i] = Math.atan2(dot(arm, tf.anterior), dot(arm, tdown)) * DEG;
      const shank = norm(sub(ankle, knee));
      const foot = norm(sub(toe, hasHeel ? pt(cloud, `heel${side}`, i) : ankle));
      out[`ankle${side}`][i] = 90 - Math.acos(Math.min(1, Math.max(-1, dot(shank, foot)))) * DEG;
    }
    const ph = heading(pf.anterior);
    const th = heading(tf.anterior);
    if (i === 0) {
      pelvis0 = ph;
      torso0 = th;
    }
    // Unwrapped: a swing turns the trunk through more than 180°, so the curves stay continuous.
    const pelvisRel = wrap(ph - pelvis0);
    const torsoRel = wrap(th - torso0);
    out.pelvisRotation[i] = i === 0 ? pelvisRel : out.pelvisRotation[i - 1] + wrap(pelvisRel - wrap(out.pelvisRotation[i - 1]));
    out.torsoRotation[i] = i === 0 ? torsoRel : out.torsoRotation[i - 1] + wrap(torsoRel - wrap(out.torsoRotation[i - 1]));
    out.separation[i] = out.torsoRotation[i] - out.pelvisRotation[i];
  }
  return out;
}

function speeds(series: Vec3[], hz: number): number[] {
  return series.map((p, i) => (i === 0 ? 0 : len(sub(p, series[i - 1])) * hz));
}

/**
 * Fill in events a capture lacks (CMU has no bat): foot plant is the first frame after the lead
 * ankle's highest point where the ankle is back within 2 cm of its stance height (the median over
 * the first tenth of the clip); peak bat speed and, when absent, contact are the frame of peak
 * lead-wrist speed after foot plant. Marks the cloud estimated when anything was filled.
 */
export function estimateEvents(cloud: PointCloud): PointCloud {
  const events = { ...cloud.events };
  const n = cloud.times.length;
  const lead = cloud.handedness === "R" ? "L" : "R";
  const ankle = cloud.points[`ankle${lead}`];
  // A hitter's contact is the lead wrist's peak; a pitcher's release is the throwing wrist's.
  const wristName: PointName = cloud.motion === "pitch" ? `wrist${cloud.handedness}` : `wrist${lead}`;
  const wrist = cloud.points[wristName];
  if (!ankle || !wrist) return cloud;
  let estimated = cloud.eventsEstimated;
  const wristSpeed = speeds(wrist, cloud.hz);
  const argmax = (from: number, to: number, f: (i: number) => number) => {
    let best = from;
    for (let i = from; i <= to; i++) if (f(i) > f(best)) best = i;
    return best;
  };
  const contactGuess = events.contact ?? argmax(0, n - 1, (i) => wristSpeed[i]);
  if (events.footPlant === undefined) {
    const stance = ankle
      .slice(0, Math.max(1, Math.floor(n / 10)))
      .map((p) => p[1])
      .sort((a, b) => a - b);
    const stanceY = stance[Math.floor(stance.length / 2)];
    const peak = argmax(0, Math.max(0, contactGuess - 1), (i) => ankle[i][1]);
    let plant = peak;
    while (plant < contactGuess && ankle[plant][1] > stanceY + 0.02) plant++;
    events.footPlant = plant;
    estimated = true;
  }
  if (events.maxBatSpeed === undefined) {
    events.maxBatSpeed = argmax(events.footPlant, Math.min(n - 1, contactGuess + 10), (i) => wristSpeed[i]);
    estimated = true;
  }
  if (events.contact === undefined) {
    events.contact = argmax(events.footPlant, n - 1, (i) => wristSpeed[i]);
    estimated = true;
  }
  return { ...cloud, events, eventsEstimated: estimated };
}

/** Cut the clip to `beforeS` before foot plant and `afterS` after contact; re-index events. */
export function trim(cloud: PointCloud, c: Curves, beforeS: number, afterS: number): { cloud: PointCloud; curves: Curves } {
  const n = cloud.times.length;
  const plant = cloud.events.footPlant ?? 0;
  const contact = cloud.events.contact ?? n - 1;
  const start = Math.max(0, plant - Math.round(beforeS * cloud.hz));
  const end = Math.min(n - 1, contact + Math.round(afterS * cloud.hz));
  const slice = <T>(s: T[]) => s.slice(start, end + 1);
  const events: PointCloud["events"] = {};
  for (const [name, frame] of Object.entries(cloud.events) as [EventName, number][]) {
    if (frame === undefined || frame < start || frame > end) continue;
    events[name] = frame - start;
  }
  const trimmed = mapPoints(cloud, slice);
  const t0 = cloud.times[start];
  return {
    cloud: { ...trimmed, times: slice(cloud.times).map((t) => t - t0), events },
    curves: Object.fromEntries(JOINT_KEYS.map((k) => [k, slice(c[k])])) as Curves,
  };
}

/** Clip every curve to its physiological range and report how much had to be clipped. */
export function quality(
  c: Curves,
  events: PointCloud["events"],
  frames: number,
): { clippedPct: number; ordered: boolean; ok: boolean; clipped: Record<JointKey, number> } {
  let clippedTotal = 0;
  const clipped = {} as Record<JointKey, number>;
  for (const k of JOINT_KEYS) {
    const [lo, hi] = RANGES[k];
    let count = 0;
    for (let i = 0; i < c[k].length; i++) {
      const v = c[k][i];
      if (v < lo || v > hi) {
        count++;
        c[k][i] = Math.min(hi, Math.max(lo, v));
      }
    }
    clipped[k] = count;
    clippedTotal += count;
  }
  const clippedPct = (100 * clippedTotal) / (JOINT_KEYS.length * Math.max(1, frames));
  const { footPlant, contact, maxBatSpeed } = events;
  const ordered =
    footPlant !== undefined &&
    (contact === undefined || footPlant < contact) &&
    (maxBatSpeed === undefined || footPlant < maxBatSpeed) &&
    (contact === undefined || contact < frames);
  return { clippedPct, ordered, ok: ordered && clippedPct <= 2, clipped };
}
