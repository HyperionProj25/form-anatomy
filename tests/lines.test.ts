import { describe, expect, test } from "vitest";
import { partsByKey } from "../src/data/catalog";
import { LINE_IDS, lineById, lineKeys, lines, stopSides } from "../src/data/lines";
import { citationById } from "../src/data/research";

describe("fascial lines", () => {
  test("there are six lines in review order with unique ids and colors", () => {
    expect(LINE_IDS).toEqual(["sbl", "sfl", "ll", "sl", "bfl", "ffl"]);
    expect(new Set(lines.map((l) => l.color)).size).toBe(6);
  });

  test("every stop key and extra key exists in the catalog; keyless stops have an anchor", () => {
    for (const line of lines)
      for (const stop of line.path) {
        if (stop.key) expect(partsByKey(stop.key).length, `${line.id}:${stop.name}`).toBeGreaterThan(0);
        else expect(stop.anchor, `${line.id}:${stop.name} needs an anchor`).toBeDefined();
        for (const k of stop.keys ?? []) expect(partsByKey(k).length, `${line.id}:${k}`).toBeGreaterThan(0);
        if (stop.anchor)
          expect(partsByKey(stop.anchor.key).length, `${line.id}:${stop.anchor.key}`).toBeGreaterThan(0);
        if (stop.transition?.via)
          expect(partsByKey(stop.transition.via.anchor.key).length).toBeGreaterThan(0);
      }
  });

  test("every stop except the last carries a transition with a real citation", () => {
    for (const line of lines) {
      line.path.forEach((stop, i) => {
        if (i < line.path.length - 1) {
          expect(stop.transition, `${line.id}:${stop.name}`).toBeDefined();
          expect(citationById(stop.transition!.source)).toBeDefined();
          if (stop.transition!.status === "verified") expect(stop.transition!.studies).toBeGreaterThan(0);
          if (stop.transition!.status === "not-verified") expect(stop.transition!.studies).toBe(0);
        } else expect(stop.transition).toBeUndefined();
      });
      expect(citationById(line.evidence.source)).toBeDefined();
    }
  });

  test("transition counts match the 2016 review", () => {
    const count = (id: string, status: string) =>
      lineById(id)!.path.filter((s) => s.transition?.status === status).length;
    expect(count("sbl", "verified")).toBe(3);
    expect(count("bfl", "verified")).toBe(3);
    expect(count("ffl", "verified")).toBe(2);
    expect(count("sl", "verified")).toBe(5);
    expect(count("sl", "not-verified")).toBe(4);
    expect(count("ll", "verified")).toBe(2);
    expect(count("ll", "not-verified")).toBe(3);
    expect(count("sfl", "verified")).toBe(0);
    expect(lineById("sbl")!.evidence.grade).toBe("strong");
    expect(lineById("sfl")!.evidence.grade).toBe("none");
    expect(lineById("sl")!.evidence.grade).toBe("moderate");
  });

  test("lineKeys collects stop keys and extras", () => {
    const keys = lineKeys(lineById("sbl")!);
    expect(keys.has("lateral-head-of-gastrocnemius")).toBe(true);
    expect(keys.has("medial-head-of-gastrocnemius")).toBe(true);
    expect(keys.has("semitendinosus-muscle")).toBe(true);
    expect(keys.has("rectus-femoris-muscle")).toBe(false);
  });

  test("stopSides starts right and flips at crossings", () => {
    expect(stopSides(lineById("sbl")!).every((s) => s === "right")).toBe(true);
    expect(stopSides(lineById("bfl")!)).toEqual(["right", "right", "left", "left"]);
    expect(stopSides(lineById("ffl")!)).toEqual(["right", "left", "right"]);
    const sl = stopSides(lineById("sl")!);
    expect(sl.slice(0, 3)).toEqual(["right", "left", "left"]);
    expect(sl[4]).toBe("right");
  });
});
