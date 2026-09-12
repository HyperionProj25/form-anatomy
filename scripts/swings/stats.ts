import type { Vec3 } from "./types";

/**
 * Pure statistics for sessions (spec section 18): bat speed from the tip track, TrackMan's own
 * segment angles for agreement checks, and simple summaries. No Node APIs, so the browser
 * ingest worker can use them too.
 */

const MPH_PER_MPS = 2.23694;

/**
 * Peak speed of the bat tip from its raw track, in mph, after a five-sample moving average to
 * take the edge off tracking jitter; and the frame it peaks at.
 */
export function batTipSpeed(tip: Vec3[], timesSec: number[]): { peakMph: number; peakFrame: number } {
  const n = tip.length;
  if (n < 6) return { peakMph: 0, peakFrame: 0 };
  const speed = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dt = timesSec[i] - timesSec[i - 1] || 1e-3;
    const a = tip[i];
    const b = tip[i - 1];
    speed[i] = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / dt;
  }
  let best = 0;
  let bestV = 0;
  for (let i = 2; i < n - 2; i++) {
    const v = (speed[i - 2] + speed[i - 1] + speed[i] + speed[i + 1] + speed[i + 2]) / 5;
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  }
  return { peakMph: bestV * MPH_PER_MPS, peakFrame: best };
}

/**
 * TrackMan's own rotation angle of a segment per source frame (the first Euler component), made
 * relative to a start frame, resampled by nearest source frame onto the trimmed 120 Hz clip.
 */
export function theirRotation(
  series: (number[] | null)[] | undefined,
  sourceHz: number,
  start: number,
  frames: number,
  fps: number,
): number[] | null {
  if (!series || !series.length) return null;
  const at = (i: number) => {
    const v = series[Math.min(series.length - 1, Math.max(0, i))];
    return v && Number.isFinite(v[0]) ? v[0] : NaN;
  };
  const base = at(start);
  if (!Number.isFinite(base)) return null;
  const out: number[] = [];
  for (let f = 0; f < frames; f++) {
    const i = Math.round(start + (f / fps) * sourceHz);
    const v = at(i) - base;
    out.push(((v + 540) % 360) - 180);
  }
  return out;
}

const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/**
 * RMS difference between our curve and theirs, allowing for an opposite sign convention and for
 * either series wrapping at ±180° (differences are taken modulo 360).
 */
export function agreementRms(ours: number[], theirs: number[]): { rms: number; sign: 1 | -1 } {
  const n = Math.min(ours.length, theirs.length);
  let same = 0;
  let flipped = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(theirs[i]) || !Number.isFinite(ours[i])) continue;
    same += wrapDeg(ours[i] - theirs[i]) ** 2;
    flipped += wrapDeg(ours[i] + theirs[i]) ** 2;
    count++;
  }
  if (!count) return { rms: NaN, sign: 1 };
  return same <= flipped ? { rms: Math.sqrt(same / count), sign: 1 } : { rms: Math.sqrt(flipped / count), sign: -1 };
}

export type Stat = { mean: number; sd: number; min: number; max: number; n: number };

export function meanSd(values: number[]): Stat {
  const v = values.filter((x) => Number.isFinite(x));
  const n = v.length;
  if (!n) return { mean: NaN, sd: NaN, min: NaN, max: NaN, n: 0 };
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { mean, sd, min: Math.min(...v), max: Math.max(...v), n };
}

export function median(values: number[]): number {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
