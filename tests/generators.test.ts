import { describe, expect, test } from "vitest";
import { partsByKey } from "../src/data/catalog";
import { lineById, lineKeys } from "../src/data/lines";
import { QUIZ_BONES, QUIZ_MUSCLES } from "../src/data/quiz-pool";
import {
  buildSet,
  mulberry32,
  parseSetId,
  setLabel,
  shuffle,
} from "../src/features/quiz/generators";

const pool = new Set([...QUIZ_MUSCLES, ...QUIZ_BONES]);

describe("rng helpers", () => {
  test("mulberry32 is deterministic and shuffle preserves members", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const s = shuffle([1, 2, 3, 4, 5], mulberry32(7));
    expect([...s].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("parseSetId / setLabel", () => {
  test("accepts known ids and rejects junk", () => {
    expect(parseSetId("mixed")).toBe("mixed");
    expect(parseSetId("region:hip-thigh")).toBe("region:hip-thigh");
    expect(parseSetId("line:sl")).toBe("line:sl");
    expect(parseSetId("weak")).toBe("weak");
    expect(parseSetId("region:moon")).toBeNull();
    expect(parseSetId("line:zzz")).toBeNull();
    expect(parseSetId("")).toBeNull();
    expect(setLabel("region:leg-foot")).toBe("Leg & foot");
    expect(setLabel("line:bfl")).toBe("Back functional line");
  });
});

describe("buildSet", () => {
  test("mixed set has ten questions, is seeded, and every option list is valid", () => {
    const a = buildSet("mixed", { rng: mulberry32(1), webgl: true });
    const b = buildSet("mixed", { rng: mulberry32(1), webgl: true });
    expect(a).toEqual(b);
    expect(a.length).toBe(10);
    expect(a.filter((q) => q.kind === "evidence").length).toBe(3);
    for (const q of a) {
      if (q.kind === "find") expect(pool.has(q.key)).toBe(true);
      else {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(q.options.length);
      }
      if (q.kind === "identify") expect(partsByKey(q.key).some((p) => p.id === q.partId)).toBe(true);
    }
  });

  test("region sets only draw structures from that region and carry no evidence questions", () => {
    const set = buildSet("region:hip-thigh", { rng: mulberry32(3), webgl: true });
    expect(set.length).toBe(10);
    for (const q of set) {
      expect(q.kind).not.toBe("evidence");
      expect(partsByKey(q.key)[0]?.region).toBe("hip-thigh");
    }
  });

  test("line sets draw from the line's keys plus that line's evidence questions", () => {
    const set = buildSet("line:sbl", { rng: mulberry32(5), webgl: true });
    const keys = lineKeys(lineById("sbl")!);
    for (const q of set) if (q.kind !== "evidence") expect(keys.has(q.key), q.key).toBe(true);
    expect(set.some((q) => q.kind === "evidence")).toBe(true);
  });

  test("arm chain sets draw only from that chain's muscles", () => {
    const set = buildSet("line:dal", { rng: mulberry32(8), webgl: true });
    const keys = lineKeys(lineById("dal")!);
    expect(set.length).toBeGreaterThan(3);
    for (const q of set) if (q.kind !== "evidence") expect(keys.has(q.key), q.key).toBe(true);
    expect(set.some((q) => q.kind === "evidence")).toBe(true);
  });

  test("without WebGL there are no find or identify questions", () => {
    const set = buildSet("mixed", { rng: mulberry32(9), webgl: false });
    expect(set.every((q) => q.kind === "fact" || q.kind === "evidence")).toBe(true);
    expect(set.length).toBeGreaterThan(0);
  });

  test("weak sets use the supplied keys and cap at ten", () => {
    const weak = QUIZ_MUSCLES.slice(0, 14);
    const set = buildSet("weak", { rng: mulberry32(2), webgl: true, weakKeys: weak });
    expect(set.length).toBe(10);
    for (const q of set) expect(weak).toContain(q.key);
    expect(buildSet("weak", { rng: mulberry32(2), webgl: true, weakKeys: [] })).toEqual([]);
  });

  test("fact questions come with the real action as the correct option", () => {
    const set = buildSet("mixed", { rng: mulberry32(11), webgl: false });
    const fact = set.find((q) => q.kind === "fact");
    expect(fact).toBeDefined();
    if (fact?.kind === "fact") expect(fact.options[fact.correct].length).toBeGreaterThan(5);
  });
});
