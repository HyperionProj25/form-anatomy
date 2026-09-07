import { describe, expect, test } from "vitest";
import { partsByKey } from "../src/data/catalog";
import { LINE_IDS } from "../src/data/lines";
import { citationById } from "../src/data/research";
import { EVIDENCE_BANK, QUIZ_BONES, QUIZ_MUSCLES } from "../src/data/quiz-pool";

describe("quiz pool", () => {
  test("every key exists in the catalog with the right type", () => {
    for (const k of QUIZ_MUSCLES) expect(partsByKey(k)[0]?.type, k).toBe("muscle");
    for (const k of QUIZ_BONES) expect(partsByKey(k)[0]?.type, k).toBe("bone");
    expect(QUIZ_MUSCLES.length).toBeGreaterThanOrEqual(80);
    expect(QUIZ_BONES.length).toBeGreaterThanOrEqual(40);
    expect(new Set([...QUIZ_MUSCLES, ...QUIZ_BONES]).size).toBe(
      QUIZ_MUSCLES.length + QUIZ_BONES.length,
    );
  });

  test("evidence bank is well formed and cites real papers", () => {
    expect(EVIDENCE_BANK.length).toBeGreaterThanOrEqual(12);
    expect(new Set(EVIDENCE_BANK.map((q) => q.id)).size).toBe(EVIDENCE_BANK.length);
    for (const q of EVIDENCE_BANK) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(30);
      expect(citationById(q.source), q.id).toBeDefined();
      if (q.line) expect(LINE_IDS).toContain(q.line);
    }
  });

  test("every line has at least one evidence question", () => {
    for (const id of LINE_IDS) expect(EVIDENCE_BANK.some((q) => q.line === id), id).toBe(true);
  });
});
