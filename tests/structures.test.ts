import { describe, expect, test } from "vitest";
import { uniqueByName } from "../src/structures";

const part = (id: string, name: string) => ({ id, name, detail: "", type: "muscle" });

describe("uniqueByName", () => {
  test("keeps the first of each name and preserves order", () => {
    const list = [
      part("a", "Gastrocnemius"),
      part("b", "Gastrocnemius"),
      part("c", "Soleus"),
      part("d", "soleus"),
      part("e", "Femur"),
    ];
    expect(uniqueByName(list).map((s) => s.id)).toEqual(["a", "c", "e"]);
  });

  test("returns an empty list unchanged", () => {
    expect(uniqueByName([])).toEqual([]);
  });
});
