import { describe, expect, test } from "vitest";
import { attachmentIds } from "../src/data/attachments";
import { partById, partForSide, parts } from "../src/data/catalog";
import { contact, geometry, jointPivot, reaches } from "../src/data/geometry";
import { JOINT_IDS } from "../src/data/joints";

const inside = (p: [number, number, number], box: [number[], number[]], slack = 0.002) =>
  p.every((v, i) => v >= box[0][i] - slack && v <= box[1][i] + slack);

describe("mesh geometry", () => {
  test("every joint has a pivot on both sides that sits between the bones it joins", () => {
    for (const j of JOINT_IDS)
      for (const side of ["left", "right"] as const) {
        const p = jointPivot(j, side);
        expect(p, `${j} ${side}`).toBeDefined();
        expect(Math.sign(p![0]), `${j} ${side} x`).toBe(side === "left" ? 1 : -1);
      }
    const elbow = jointPivot("elbow", "right")!;
    const humerus = partForSide("humerus", "right")!;
    const radius = partForSide("radius", "right")!;
    expect(elbow[1]).toBeGreaterThan(humerus.bbox[0][1] - 0.01);
    expect(elbow[1]).toBeLessThan(radius.bbox[1][1] + 0.03);
    const hip = jointPivot("hip", "right")!;
    const femur = partForSide("femur", "right")!;
    expect(hip[1]).toBeGreaterThan(femur.bbox[1][1] - 0.06);
  });

  test("contacts exist for almost every attachment pair and lie on the bone", () => {
    let pairs = 0;
    let found = 0;
    for (const m of parts.filter((p) => p.type === "muscle")) {
      const ids = attachmentIds(m);
      if (!ids) continue;
      for (const end of ["origin", "insertion"] as const)
        for (const boneId of new Set(ids[end])) {
          pairs++;
          const e = geometry.contacts[m.id]?.[`${end[0]}:${boneId}`];
          if (!e) continue;
          found++;
          expect(inside([e[0], e[1], e[2]], partById(boneId)!.bbox), `${m.id} -> ${boneId}`).toBe(true);
          expect(e[3]).toBeGreaterThanOrEqual(0);
        }
    }
    expect(pairs).toBeGreaterThan(800);
    expect(found / pairs).toBeGreaterThan(0.95);
    expect(geometry.generated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("named heads start on their own bone, and tendon gaps do not lose an attachment", () => {
    // The pronator teres article names the humerus and the ulna; the deep (ulnar) head starts on
    // the ulna alone, and the short head of biceps femoris on the femur.
    expect(attachmentIds(partById("deep-head-of-pronator-teres-r")!)?.origin).toEqual(["ulna-r"]);
    expect(attachmentIds(partById("short-head-of-biceps-femoris-r")!)?.origin).toEqual(["femur-r"]);
    expect(attachmentIds(partById("long-head-of-biceps-femoris-r")!)?.origin).toEqual(["hip-bone-r"]);
    // The Achilles tendon is not a mesh, so the calcaneus contact is far from the muscle but kept.
    expect(reaches("lateral-head-of-gastrocnemius-r", "calcaneus-r", "insertion")).toBe(true);
    expect(contact("lateral-head-of-gastrocnemius-r", "calcaneus-r", "insertion")).toBeDefined();
  });

  test("gastrocnemius contacts sit at the femoral condyles and the heel", () => {
    const femur = contact("lateral-head-of-gastrocnemius-r", "femur-r", "origin")!;
    const calc = contact("lateral-head-of-gastrocnemius-r", "calcaneus-r", "insertion")!;
    const knee = jointPivot("knee", "right")!;
    expect(Math.abs(femur[1] - knee[1])).toBeLessThan(0.08);
    expect(calc[1]).toBeLessThan(knee[1] - 0.25);
  });
});
