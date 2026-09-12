import type { Vec3 } from "./types";

/** Unit quaternion [x, y, z, w]. */
export type Quat = [number, number, number, number];

export const IDENTITY: Quat = [0, 0, 0, 1];

/** An orthonormal basis as three column vectors. */
export type Basis = { side: Vec3; long: Vec3; second: Vec3 };

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const mid = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5);

/** A basis from a long axis and a reference for the second axis; side completes the right-handed set. */
export function basisFrom(long: Vec3, secondRef: Vec3): Basis {
  const l = normalize(long);
  const second = normalize(sub(secondRef, scale(l, dot(secondRef, l))));
  const side = normalize(cross(l, second));
  return { side, long: l, second: normalize(cross(side, l)) };
}

/** 3×3 rotation matrix, row-major, with the basis vectors as columns. */
function matrixOf(b: Basis): number[] {
  return [b.side[0], b.long[0], b.second[0], b.side[1], b.long[1], b.second[1], b.side[2], b.long[2], b.second[2]];
}

function quatFromMatrix(m: number[]): Quat {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;
  const trace = m00 + m11 + m22;
  let q: Quat;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    q = [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  return normalizeQuat(q);
}

export function normalizeQuat(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

/** The rotation taking the rest basis onto the measured basis: R = M_measured · M_restᵀ. */
export function quatFromBases(measured: Basis, rest: Basis): Quat {
  const a = matrixOf(measured);
  const b = matrixOf(rest);
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[i * 3 + k] * b[j * 3 + k];
      r[i * 3 + j] = s;
    }
  return quatFromMatrix(r);
}

export function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // v' = v + 2w (q × v) + 2 q × (q × v)
  const qv: Vec3 = [x, y, z];
  const t = scale(cross(qv, v), 2);
  return add(add(v, scale(t, w)), cross(qv, t));
}

/** a then b: rotate by a first, then by b. */
export function mul(b: Quat, a: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return normalizeQuat([
    bw * ax + bx * aw + by * az - bz * ay,
    bw * ay - bx * az + by * aw + bz * ax,
    bw * az + bx * ay - by * ax + bz * aw,
    bw * aw - bx * ax - by * ay - bz * az,
  ]);
}

export function inverse(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function slerp(a: Quat, b: Quat, t: number): Quat {
  let cosHalf = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (cosHalf < 0) {
    cosHalf = -cosHalf;
    bb = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (cosHalf > 0.9995) {
    return normalizeQuat([
      a[0] + (bb[0] - a[0]) * t,
      a[1] + (bb[1] - a[1]) * t,
      a[2] + (bb[2] - a[2]) * t,
      a[3] + (bb[3] - a[3]) * t,
    ]);
  }
  const half = Math.acos(cosHalf);
  const sinHalf = Math.sin(half);
  const ra = Math.sin((1 - t) * half) / sinHalf;
  const rb = Math.sin(t * half) / sinHalf;
  return [a[0] * ra + bb[0] * rb, a[1] * ra + bb[1] * rb, a[2] * ra + bb[2] * rb, a[3] * ra + bb[3] * rb];
}

/** Quaternion for a rotation of `deg` about a unit axis. */
export function axisAngle(axis: Vec3, deg: number): Quat {
  const half = (deg * Math.PI) / 360;
  const s = Math.sin(half);
  const a = normalize(axis);
  return [a[0] * s, a[1] * s, a[2] * s, Math.cos(half)];
}

/** Rotation angle in degrees, 0..180. */
export function angleOf(q: Quat): number {
  return (2 * Math.acos(Math.min(1, Math.abs(q[3]))) * 180) / Math.PI;
}
