import { describe, expect, test } from "vitest";
import { citationById, citationUrl, citations } from "../src/data/research";

describe("research citations", () => {
  test("ids are unique and every entry has a resolvable locator", () => {
    expect(new Set(citations.map((c) => c.id)).size).toBe(citations.length);
    expect(citations.length).toBeGreaterThanOrEqual(17);
    for (const c of citations) {
      expect(c.pmid || c.doi || c.url, c.id).toBeTruthy();
      expect(c.title.length).toBeGreaterThan(10);
      expect(c.year).toBeGreaterThanOrEqual(2009);
      expect(c.summary.split(/[.!?]\s/).length).toBeGreaterThanOrEqual(2);
      expect(c.modelNote.length).toBeGreaterThan(20);
      expect(citationUrl(c)).toMatch(/^https:\/\//);
    }
  });

  test("core reviews are present with the right PMIDs", () => {
    expect(citationById("wilke2016")?.pmid).toBe("26281953");
    expect(citationById("krause2016")?.pmid).toBe("27001027");
    expect(citationById("kalichman2025")?.pmid).toBe("41316622");
  });

  test("every group has at least two entries", () => {
    const groups = new Map<string, number>();
    for (const c of citations) groups.set(c.group, (groups.get(c.group) ?? 0) + 1);
    for (const [g, n] of groups) expect(n, g).toBeGreaterThanOrEqual(2);
    expect(groups.size).toBe(8);
  });
});

describe("recent findings", () => {
  test("the recent group holds at least twelve papers from 2023 onward, each with a PMID and DOI", () => {
    const recent = citations.filter((c) => c.group === "recent");
    expect(recent.length).toBeGreaterThanOrEqual(12);
    for (const c of recent) {
      expect(c.year, c.id).toBeGreaterThanOrEqual(2023);
      expect(c.pmid, c.id).toMatch(/^\d+$/);
      expect(c.doi, c.id).toMatch(/^10\./);
    }
    expect(citationById("kretschmerWilke2026")?.kind).toBe("meta-analysis");
  });
});
