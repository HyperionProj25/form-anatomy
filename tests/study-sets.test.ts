import { describe, expect, test } from "vitest";
import { partById, partsByKey } from "../src/data/catalog";
import { STUDY_SETS, studySetIds } from "../src/data/study-sets";
import { initialState, MAX_PLAYLIST, reducer } from "../src/state/store";

describe("study sets", () => {
  test("every key exists in the catalog with the set's kind, ids are unique and within the playlist limit", () => {
    const ids = new Set<string>();
    for (const set of STUDY_SETS) {
      expect(ids.has(set.id), set.id).toBe(false);
      ids.add(set.id);
      expect(set.keys.length).toBeGreaterThan(3);
      expect(set.keys.length).toBeLessThanOrEqual(MAX_PLAYLIST);
      expect(new Set(set.keys).size).toBe(set.keys.length);
      for (const key of set.keys) {
        const part = partsByKey(key)[0];
        expect(part, `${set.id}: ${key}`).toBeDefined();
        expect(part.type, `${set.id}: ${key}`).toBe(set.kind === "bones" ? "bone" : "muscle");
      }
      const resolved = studySetIds(set);
      expect(resolved.length).toBe(set.keys.length);
      for (const id of resolved) expect(partById(id)?.side).not.toBe("left");
    }
    expect(STUDY_SETS.length).toBeGreaterThanOrEqual(15);
  });

  test("loading a set replaces the playlist and shows its first structure", () => {
    const cuff = STUDY_SETS.find((s) => s.id === "rotator-cuff")!;
    let s = reducer(initialState, { type: "setMode", mode: "bones" });
    s = reducer(s, { type: "playlistAdd", id: "femur-l" });
    s = reducer(s, { type: "playlistLoad", title: cuff.title, ids: studySetIds(cuff) });
    expect(s.playlist?.title).toBe("Rotator cuff");
    expect(s.playlist?.ids.length).toBe(4);
    expect(s.playlist?.step).toBe(0);
    expect(s.selected).toBe(s.playlist?.ids[0]);
    expect(s.mode).toBe("muscles");
    expect(s.focus?.flyId).toBe(s.selected);
    const junk = reducer(initialState, { type: "playlistLoad", title: "x", ids: ["nope"] });
    expect(junk.playlist).toBeNull();
  });
});
