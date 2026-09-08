import { describe, expect, test } from "vitest";
import { partsByKey } from "../src/data/catalog";
import { HEAD_ORIGINS } from "../src/data/head-origins";

describe("head origins", () => {
  test("every head and every bone exists in the catalog", () => {
    for (const [head, bones] of Object.entries(HEAD_ORIGINS)) {
      expect(partsByKey(head)[0]?.type, head).toBe("muscle");
      expect(bones.length, head).toBeGreaterThan(0);
      for (const b of bones) expect(partsByKey(b)[0]?.type, `${head}: ${b}`).toBe("bone");
    }
  });
});
