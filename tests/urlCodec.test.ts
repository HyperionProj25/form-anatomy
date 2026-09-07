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

  test("tour step round-trips only in fascia mode", () => {
    const s: AppState = {
      ...initialState,
      mode: "fascia",
      line: "sl",
      view: "back",
      tour: { step: 3, playing: true },
    };
    expect(encodeState(s)).toBe("?m=fascia&v=back&l=sl&t=3");
    expect(decodeSearch("?m=fascia&l=sl&t=3")).toMatchObject({ tour: { step: 3, playing: false } });
    expect(decodeSearch("?t=2")).toEqual({});
    expect(decodeSearch("?m=fascia&t=99")).toEqual({ mode: "fascia" });
  });

  test("pinned ids round-trip as p, capped at four valid ids", () => {
    const s: AppState = { ...initialState, pinned: ["femur-l", "femur-r", "ghost"] };
    expect(encodeState(s)).toBe("?p=femur-l,femur-r");
    expect(decodeSearch("?p=femur-l,ghost,femur-r")).toEqual({ pinned: ["femur-l", "femur-r"] });
  });

  test("quiz set id round-trips as q", () => {
    const s: AppState = {
      ...initialState,
      quiz: { setId: "region:leg-foot", questions: [], index: 0, answers: [], showing: false },
    };
    expect(encodeState(s)).toBe("?q=region:leg-foot");
    expect(decodeSearch("?q=region:leg-foot")).toEqual({ quizRequest: "region:leg-foot" });
    expect(decodeSearch("?q=region:moon")).toEqual({});
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
    expect(decodeSearch("?c=0.12%2C0.46%2C2.79%2C0%2C0.2%2C0").camera?.position).toEqual([
      0.12, 0.46, 2.79,
    ]);
  });

  test("ignores unknown and invalid values individually", () => {
    expect(
      decodeSearch(
        "?m=organs&s=not-a-part&v=top&l=zzz&h=femur-l,ghost&r=moon&d=middle&side=up&c=1,2,x",
      ),
    ).toEqual({ hidden: ["femur-l"] });
    expect(decodeSearch("")).toEqual({});
    expect(decodeSearch("?junk")).toEqual({});
  });

  test("caps hidden ids at 20", () => {
    const ids = Array.from({ length: 30 }, () => "femur-l").join(",");
    expect(decodeSearch(`?h=${ids}`).hidden?.length).toBe(20);
  });
});

describe("playlists in the URL", () => {
  test("ids and title round-trip as pl and plt; junk ids and long titles are trimmed", () => {
    const s: AppState = {
      ...initialState,
      playlist: { title: "  Knee day ", ids: ["femur-l", "soleus-muscle-l", "nope"], step: 1 },
    };
    const encoded = encodeState(s);
    expect(encoded).toBe("?pl=femur-l,soleus-muscle-l&plt=Knee+day");
    expect(decodeSearch(encoded).playlist).toEqual({
      title: "Knee day",
      ids: ["femur-l", "soleus-muscle-l"],
      step: null,
    });
    const long = "x".repeat(100);
    expect(decodeSearch("?pl=junk,,femur-l,femur-l&plt=" + long).playlist).toEqual({
      title: "x".repeat(80),
      ids: ["femur-l"],
      step: null,
    });
    expect(decodeSearch("?pl=junk").playlist).toBeUndefined();
    expect(encodeState({ ...initialState, playlist: { title: "t", ids: [], step: null } })).toBe("");
  });
});

describe("attachments flag", () => {
  test("a=1 round-trips and anything else is ignored", () => {
    const s: AppState = { ...initialState, attach: true, selected: "soleus-muscle-l" };
    expect(encodeState(s)).toBe("?s=soleus-muscle-l&a=1");
    expect(decodeSearch("?s=soleus-muscle-l&a=1").attach).toBe(true);
    expect(decodeSearch("?a=yes").attach).toBeUndefined();
  });
});
