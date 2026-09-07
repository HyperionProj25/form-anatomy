import { describe, expect, test } from "vitest";
import { partsByKey } from "../src/data/catalog";
import { crossesJoint, JOINT_IDS, jointsCrossed, musclesCrossing } from "../src/data/joints";

const first = (key: string) => partsByKey(key)[0];

describe("muscles by joint", () => {
  test("knee: quadriceps, hamstrings and gastrocnemius cross it; soleus and gluteus maximus do not", () => {
    const knee = musclesCrossing("knee");
    for (const k of [
      "vastus-lateralis-muscle",
      "rectus-femoris-muscle",
      "semitendinosus-muscle",
      "long-head-of-biceps-femoris",
      "lateral-head-of-gastrocnemius",
      "sartorius-muscle",
      "popliteus-muscle",
    ])
      expect(knee, k).toContain(k);
    expect(knee).not.toContain("soleus-muscle");
    expect(knee).not.toContain("gluteus-maximus-muscle");
    expect(knee).not.toContain("tibialis-anterior-muscle");
  });

  test("elbow: biceps, brachialis and triceps cross it; deltoid and flexor digitorum profundus do not", () => {
    const elbow = musclesCrossing("elbow");
    for (const k of ["long-head-of-biceps-brachii", "brachialis-muscle", "long-head-of-triceps-brachii", "brachioradialis-muscle"])
      expect(elbow, k).toContain(k);
    expect(elbow).not.toContain("acromial-part-of-deltoid-muscle");
    expect(elbow).not.toContain("flexor-digitorum-profundus");
  });

  test("ankle, hip, shoulder and jaw pin known crossings", () => {
    expect(musclesCrossing("ankle")).toContain("soleus-muscle");
    expect(musclesCrossing("ankle")).toContain("tibialis-anterior-muscle");
    expect(musclesCrossing("ankle")).not.toContain("vastus-medialis-muscle");
    expect(musclesCrossing("hip")).toContain("gluteus-maximus-muscle");
    expect(musclesCrossing("hip")).toContain("psoas-major");
    expect(musclesCrossing("hip")).toContain("rectus-femoris-muscle");
    expect(musclesCrossing("hip")).not.toContain("vastus-medialis-muscle");
    expect(musclesCrossing("shoulder")).toContain("acromial-part-of-deltoid-muscle");
    expect(musclesCrossing("shoulder")).toContain("latissimus-dorsi-muscle");
    expect(musclesCrossing("shoulder")).not.toContain("serratus-anterior-muscle");
    expect(musclesCrossing("tmj")).toContain("superficial-part-of-masseter");
    expect(musclesCrossing("tmj")).toContain("temporalis-muscle");
    expect(musclesCrossing("wrist")).toContain("flexor-carpi-radialis");
    expect(musclesCrossing("wrist")).not.toContain("brachioradialis-muscle");
  });

  test("two-joint muscles list both joints; bones cross nothing; counts are sane", () => {
    expect(jointsCrossed(first("rectus-femoris-muscle"))).toEqual(["hip", "knee"]);
    expect(jointsCrossed(first("lateral-head-of-gastrocnemius"))).toEqual(["knee", "ankle"]);
    expect(jointsCrossed(first("femur"))).toEqual([]);
    expect(crossesJoint(first("femur"), "knee")).toBe(false);
    for (const j of JOINT_IDS) {
      const n = musclesCrossing(j).length;
      expect(n, j).toBeGreaterThanOrEqual(4);
      expect(n, j).toBeLessThanOrEqual(45);
    }
  });
});
