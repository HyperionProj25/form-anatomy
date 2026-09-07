import { describe, expect, test } from "vitest";
import { decodeSearch, encodeState } from "../src/state/urlCodec";
import { initialState, type AppState } from "../src/state/store";

describe("encodeState", () => {
  test("returns an empty string for the default state", () => {
    expect(encodeState(initialState)).toBe("");
  });

  test("writes only non-default fields in a stable order", () => {
    const s: AppState = {
      ...initialState,
      mode: "fascia",
      selected: "lateral-head-of-gastrocnemius-l",
      view: "back",
      line: "bfl",
      hidden: ["soleus-muscle-l"],
      filters: { region: "leg-foot", layer: "deep", side: "left", search: "" },
    };
    expect(encodeState(s)).toBe(
      "?m=fascia&s=lateral-head-of-gastrocnemius-l&v=back&l=bfl&h=soleus-muscle-l&r=leg-foot&d=deep&side=left",
    );
  });

  test("writes a custom camera pose with two decimals", () => {
    const s: AppState = {
      ...initialState,
      view: "custom",
      camera: { position: [0.123, 0.456, 2.789], target: [0, 0.2, 0.004] },
    };
    expect(encodeState(s)).toBe("?c=0.12,0.46,2.79,0,0.2,0");
  });
});

describe("decodeSearch", () => {
  test("round-trips an encoded state", () => {
    const s: AppState = {
      ...initialState,
      mode: "bones",
      selected: "femur-r",
      view: "side",
      line: "ll",
      hidden: ["femur-l"],
      filters: { region: "hip-thigh", layer: "all", side: "right", search: "" },
    };
    const decoded = decodeSearch(encodeState(s));
    expect(decoded).toEqual({
      mode: "bones",
      selected: "femur-r",
      view: "side",
      line: "ll",
      hidden: ["femur-l"],
      filters: { region: "hip-thigh", layer: "all", side: "right", search: "" },
    });
  });

  test("restores a camera pose as a custom view", () => {
    expect(decodeSearch("?c=0.12,0.46,2.79,0,0.2,0")).toEqual({
      view: "custom",
      camera: { position: [0.12, 0.46, 2.79], target: [0, 0.2, 0] },
    });
    expect(decodeSearch("?c=0.12%2C0.46%2C2.79%2C0%2C0.2%2C0").camera?.position).toEqual([0.12, 0.46, 2.79]);
  });

  test("ignores unknown and invalid values individually", () => {
    expect(
      decodeSearch("?m=organs&s=not-a-part&v=top&l=zzz&h=femur-l,ghost&r=moon&d=middle&side=up&c=1,2,x"),
    ).toEqual({ hidden: ["femur-l"] });
    expect(decodeSearch("")).toEqual({});
    expect(decodeSearch("?junk")).toEqual({});
  });

  test("caps hidden ids at 20", () => {
    const ids = Array.from({ length: 30 }, () => "femur-l").join(",");
    expect(decodeSearch(`?h=${ids}`).hidden?.length).toBe(20);
  });
});
