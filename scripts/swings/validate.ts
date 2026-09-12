import { applyTransform, resetBodyCache, transformsAt } from "../../src/data/body";
import { partForSide } from "../../src/data/catalog";
import { pivotOf } from "../../src/data/geometry";
import type { SwingFile } from "../../src/data/swings";
import type { Vec3 } from "../../src/data/types";
import { angleAt } from "./kinematics";

/** The lowest points of each foot at rest: the toe tip and the heel (bottom of the calcaneus). */
function footPoints(side: "left" | "right"): Vec3[] {
  const calc = partForSide("calcaneus", side)!;
  return [pivotOf("toeTip", side)!, [calc.centroid[0], calc.bbox[0][1], calc.centroid[2]]];
}

/**
 * Shift the root each frame so the lower foot touches the rest floor (spec 4.5): the hitter's
 * knees are bent in the stance, which would otherwise leave the rigid model's feet in the air.
 */
export function floorCorrect(file: SwingFile): void {
  if (!file.root) return;
  const feet = { L: footPoints("left"), R: footPoints("right") };
  const floorY = Math.min(...[...feet.L, ...feet.R].map((p) => p[1]));
  for (let f = 0; f < file.frames; f++) {
    const t = transformsAt(file, f);
    let lowest = Infinity;
    for (const side of ["L", "R"] as const)
      for (const p of feet[side]) lowest = Math.min(lowest, applyTransform(t[`foot${side}`], p)[1]);
    file.root[f] = [file.root[f][0], Math.round((file.root[f][1] + floorY - lowest) * 1000) / 1000, file.root[f][2]];
  }
  resetBodyCache(file.id);
}

/**
 * Check a built swing against its own measured curves (spec section 4.7): the posed model's knee
 * and elbow angles, read from the posed joint centres, must match the measured curves; and the
 * feet must stay near the floor.
 */
export function validateBody(file: SwingFile): {
  kneeRms: number;
  elbowRms: number;
  lowestToe: number;
  ok: boolean;
} {
  let kneeSum = 0;
  let elbowSum = 0;
  let lowest = Infinity;
  const feet = { L: footPoints("left"), R: footPoints("right") };
  const restToeY = Math.min(...[...feet.L, ...feet.R].map((p) => p[1]));
  for (let f = 0; f < file.frames; f++) {
    const t = transformsAt(file, f);
    for (const side of ["L", "R"] as const) {
      const hip = t[`thigh${side}`].posed;
      const knee = t[`shank${side}`].posed;
      const ankle = t[`foot${side}`].posed;
      const knee180 = 180 - angleAt(hip, knee, ankle);
      kneeSum += (knee180 - file.joints[`knee${side}`][f]) ** 2;
      const shoulder = t[`upperArm${side}`].posed;
      const elbow = t[`forearm${side}`].posed;
      const wrist = t[`hand${side}`].posed;
      const elbow180 = 180 - angleAt(shoulder, elbow, wrist);
      elbowSum += (elbow180 - file.joints[`elbow${side}`][f]) ** 2;
      for (const p of feet[side]) lowest = Math.min(lowest, applyTransform(t[`foot${side}`], p)[1] - restToeY);
    }
  }
  const n = file.frames * 2;
  const kneeRms = Math.sqrt(kneeSum / n);
  const elbowRms = Math.sqrt(elbowSum / n);
  return { kneeRms, elbowRms, lowestToe: lowest, ok: kneeRms <= 3 && elbowRms <= 3 };
}

export type { Vec3 };
