import { describe, expect, test } from "vitest";
import {
  loadProgress,
  overallAccuracy,
  recordAnswer,
  saveProgress,
  weakSpots,
} from "../src/features/quiz/progress";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

describe("progress", () => {
  test("starts empty and round-trips through storage", () => {
    const s = fakeStorage();
    let p = loadProgress(s);
    expect(overallAccuracy(p)).toEqual({ n: 0, correct: 0 });
    p = recordAnswer(p, "femur", true, new Date("2026-09-07T00:00:00Z"));
    p = recordAnswer(p, "femur", false, new Date("2026-09-07T00:01:00Z"));
    saveProgress(p, s);
    const again = loadProgress(s);
    expect(again.attempts.femur).toEqual({ n: 2, correct: 1, last: "2026-09-07" });
    expect(overallAccuracy(again)).toEqual({ n: 2, correct: 1 });
  });

  test("weak spots need at least two attempts and under 60 percent accuracy", () => {
    let p = loadProgress(fakeStorage());
    p = recordAnswer(p, "soleus", false);
    expect(weakSpots(p)).toEqual([]);
    p = recordAnswer(p, "soleus", false);
    p = recordAnswer(p, "femur", true);
    p = recordAnswer(p, "femur", true);
    p = recordAnswer(p, "femur", false);
    expect(weakSpots(p)).toEqual(["soleus"]);
  });

  test("junk in storage is ignored", () => {
    const s = fakeStorage();
    s.setItem("form.progress.v1", "{not json");
    expect(loadProgress(s).attempts).toEqual({});
    s.setItem("form.progress.v1", JSON.stringify({ version: 99 }));
    expect(loadProgress(s).attempts).toEqual({});
  });
});
