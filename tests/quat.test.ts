import { describe, expect, test } from "vitest";
import {
  angleOf,
  axisAngle,
  basisFrom,
  IDENTITY,
  inverse,
  mul,
  quatFromBases,
  rotate,
  slerp,
} from "../src/data/quat";

const close = (a: number[], b: number[], digits = 6) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits));

describe("quaternions", () => {
  test("a basis against itself is the identity and a quarter turn is 90 degrees", () => {
    const rest = basisFrom([0, -1, 0], [0, 0, 1]);
    close(quatFromBases(rest, rest), IDENTITY);
    // The shank swung back 90 degrees about the model's x axis (knee flexion on the left leg).
    const bent = basisFrom([0, 0, -1], [0, -1, 0]);
    const q = quatFromBases(bent, rest);
    expect(angleOf(q)).toBeCloseTo(90, 5);
    close(rotate(q, [0, -1, 0]), [0, 0, -1]);
    close(rotate(q, [0, 0, 1]), [0, -1, 0]);
  });

  test("rotate matches axisAngle, multiplication composes and inverse undoes", () => {
    const q = axisAngle([0, 1, 0], 90);
    close(rotate(q, [0, 0, 1]), [1, 0, 0]);
    const r = axisAngle([0, 1, 0], 45);
    close(rotate(mul(r, r), [0, 0, 1]), rotate(q, [0, 0, 1]));
    close(rotate(mul(inverse(q), q), [0.3, 0.2, 0.9]), [0.3, 0.2, 0.9]);
  });

  test("slerp a third of the way gives a third of the angle", () => {
    const q = axisAngle([1, 0, 0], 60);
    expect(angleOf(slerp(IDENTITY, q, 1 / 3))).toBeCloseTo(20, 4);
    expect(angleOf(slerp(IDENTITY, q, 1))).toBeCloseTo(60, 4);
  });
});
