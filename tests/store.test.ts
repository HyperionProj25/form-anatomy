import { describe, expect, test } from "vitest";
import { parts, partForSide } from "../src/data/catalog";
import { buildSet, mulberry32 } from "../src/features/quiz/generators";
import { initialState, MAX_PLAYLIST, reducer } from "../src/state/store";

describe("store reducer", () => {
  test("selecting a part clears isolation and unhides it", () => {
    let s = reducer(initialState, { type: "hide", id: "femur-l" });
    expect(s.hidden).toEqual(["femur-l"]);
    s = reducer(s, { type: "toggleIsolate" });
    s = reducer(s, { type: "select", id: "femur-l" });
    expect(s.selected).toBe("femur-l");
    expect(s.hidden).toEqual([]);
    expect(s.isolated).toBe(false);
  });

  test("changing mode resets selection and hidden parts; fascia mode adopts the line view", () => {
    let s = reducer(initialState, { type: "select", id: "femur-l" });
    s = reducer(s, { type: "setMode", mode: "fascia" });
    expect(s.selected).toBeNull();
    expect(s.view).toBe("back");
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("setView bumps the camera nonce and clears a custom pose", () => {
    let s = reducer(initialState, {
      type: "cameraMoved",
      pose: { position: [1, 2, 3], target: [0, 0, 0] },
    });
    expect(s.view).toBe("custom");
    expect(s.camera).not.toBeNull();
    s = reducer(s, { type: "setView", view: "side" });
    expect(s.view).toBe("side");
    expect(s.camera).toBeNull();
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("setLine switches line, clears selection and moves to the line view", () => {
    const s = reducer(initialState, { type: "setLine", line: "ffl" });
    expect(s.line).toBe("ffl");
    expect(s.view).toBe("front");
  });

  test("hydrate merges a partial state and bumps the nonce", () => {
    const s = reducer(initialState, {
      type: "hydrate",
      state: {
        mode: "bones",
        selected: "femur-l",
        filters: { ...initialState.filters, region: "hip-thigh" },
      },
    });
    expect(s.mode).toBe("bones");
    expect(s.selected).toBe("femur-l");
    expect(s.filters.region).toBe("hip-thigh");
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
  });

  test("hydrating a fascia link without a view uses the line's preferred view", () => {
    const s = reducer(initialState, { type: "hydrate", state: { mode: "fascia", line: "sbl" } });
    expect(s.view).toBe("back");
    const explicit = reducer(initialState, {
      type: "hydrate",
      state: { mode: "fascia", line: "sbl", view: "front" },
    });
    expect(explicit.view).toBe("front");
  });

  test("reset restores view and hidden state but keeps mode and filters", () => {
    let s = reducer(initialState, { type: "setMode", mode: "bones" });
    s = reducer(s, { type: "hide", id: "femur-l" });
    s = reducer(s, { type: "setOpacity", opacity: 40 });
    s = reducer(s, { type: "reset" });
    expect(s.mode).toBe("bones");
    expect(s.hidden).toEqual([]);
    expect(s.opacity).toBe(100);
    expect(s.view).toBe("front");
  });

  test("togglePath flips the cable visibility", () => {
    expect(initialState.showPath).toBe(true);
    expect(reducer(initialState, { type: "togglePath" }).showPath).toBe(false);
  });
});

describe("tours", () => {
  test("startTour focuses the first stop and bumps the camera nonce", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    const nonce = s.cameraNonce;
    s = reducer(s, { type: "startTour" });
    expect(s.tour).toEqual({ step: 0, playing: false });
    expect(s.focus?.flyId).toBe("calcaneus-r"); // SBL stop 1 is anchored to the calcaneus
    expect(s.focus?.ids.length).toBe(0); // the plantar fascia itself is not modelled
    expect(s.cameraNonce).toBe(nonce + 1);
    s = reducer(s, { type: "tourNext" });
    expect(s.focus?.ids).toContain("lateral-head-of-gastrocnemius-r");
    expect(s.focus?.ids).toContain("medial-head-of-gastrocnemius-r");
  });

  test("tourNext advances, stops at the last stop, and tourPrev goes back", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    s = reducer(s, { type: "setLine", line: "ffl" });
    s = reducer(s, { type: "startTour" });
    s = reducer(s, { type: "tourNext" });
    expect(s.tour?.step).toBe(1);
    expect(s.focus?.flyId).toBe("rectus-abdominis-muscle-l"); // crosses to the left
    s = reducer(s, { type: "tourNext" });
    s = reducer(s, { type: "tourPlay", playing: true });
    s = reducer(s, { type: "tourNext" });
    expect(s.tour).toEqual({ step: 2, playing: false });
    s = reducer(s, { type: "tourPrev" });
    expect(s.tour?.step).toBe(1);
  });

  test("selecting a part or leaving fascia mode ends the tour", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    s = reducer(s, { type: "startTour" });
    expect(reducer(s, { type: "select", id: "femur-l" }).tour).toBeNull();
    expect(reducer(s, { type: "setMode", mode: "bones" }).tour).toBeNull();
    expect(reducer(s, { type: "endTour" }).focus).toBeNull();
  });

  test("hydrating with a tour step rebuilds the focus", () => {
    const s = reducer(initialState, {
      type: "hydrate",
      state: { mode: "fascia", line: "bfl", tour: { step: 2, playing: false } },
    });
    expect(s.focus?.flyId).toBe("gluteus-maximus-muscle-l");
  });
});

describe("pins", () => {
  test("togglePin adds, removes, and keeps at most four (oldest dropped)", () => {
    let s = initialState;
    for (const id of ["a", "b", "c", "d", "e"]) s = reducer(s, { type: "togglePin", id });
    expect(s.pinned).toEqual(["b", "c", "d", "e"]);
    s = reducer(s, { type: "togglePin", id: "c" });
    expect(s.pinned).toEqual(["b", "d", "e"]);
    s = reducer(s, { type: "unpin", id: "b" });
    expect(s.pinned).toEqual(["d", "e"]);
    expect(reducer(s, { type: "clearPins" }).pinned).toEqual([]);
  });
});

describe("quiz session", () => {
  const questions = buildSet("region:hip-thigh", { rng: mulberry32(4), webgl: true });

  test("startQuiz opens a session, clears the modal and frames identify questions", () => {
    let s = reducer(initialState, { type: "setModal", modal: "quiz" });
    s = reducer(s, { type: "startQuiz", setId: "region:hip-thigh", questions });
    expect(s.modal).toBeNull();
    expect(s.quiz?.index).toBe(0);
    expect(s.quiz?.answers.every((a) => a === null)).toBe(true);
    if (questions[0].kind === "identify") expect(s.focus?.flyId).toBe(questions[0].partId);
  });

  test("clicking the model answers an open find question, either side counts", () => {
    const find = questions.find((q) => q.kind === "find")!;
    let s = reducer(initialState, { type: "startQuiz", setId: "region:hip-thigh", questions: [find] });
    const left = partForSide(find.key, "left")!.id;
    s = reducer(s, { type: "select", id: left });
    expect(s.quiz?.answers[0]).toEqual({ correct: true, pickedId: left });
    expect(s.selected).toBe(left);
    s = reducer(s, { type: "select", id: "femur-l" });
    expect(s.quiz?.answers[0]?.correct).toBe(true); // first answer sticks
  });

  test("a wrong click is recorded as incorrect with what was clicked", () => {
    const find = questions.find((q) => q.kind === "find" && q.key !== "femur")!;
    let s = reducer(initialState, { type: "startQuiz", setId: "region:hip-thigh", questions: [find] });
    s = reducer(s, { type: "select", id: "femur-l" });
    expect(s.quiz?.answers[0]).toEqual({ correct: false, pickedId: "femur-l" });
  });

  test("answer, show, resume, next and end", () => {
    let s = reducer(initialState, { type: "startQuiz", setId: "mixed", questions });
    s = reducer(s, { type: "answerQuiz", answer: { correct: false, picked: 1 } });
    expect(s.quiz?.answers[0]).toEqual({ correct: false, picked: 1 });
    s = reducer(s, { type: "quizShow" });
    if (questions[0].kind !== "evidence") expect(s.quiz?.showing).toBe(true);
    s = reducer(s, { type: "quizResume" });
    expect(s.quiz?.showing).toBe(false);
    s = reducer(s, { type: "quizNext" });
    expect(s.quiz?.index).toBe(1);
    expect(reducer(s, { type: "endQuiz" }).quiz).toBeNull();
    expect(reducer(s, { type: "setMode", mode: "bones" }).quiz).toBeNull();
  });

  test("a URL quiz request is stored until the app starts it", () => {
    const s = reducer(initialState, { type: "hydrate", state: { quizRequest: "line:sbl" } });
    expect(s.quizRequest).toBe("line:sbl");
    const started = reducer(s, { type: "startQuiz", setId: "line:sbl", questions });
    expect(started.quizRequest).toBeNull();
  });
});

describe("playlists", () => {
  test("add creates the list, ignores duplicates and unknown ids, and caps at the limit", () => {
    let s = reducer(initialState, { type: "playlistAdd", id: "femur-l" });
    expect(s.playlist).toEqual({ title: "", ids: ["femur-l"], step: null });
    s = reducer(s, { type: "playlistAdd", id: "femur-l" });
    s = reducer(s, { type: "playlistAdd", id: "not-a-part" });
    expect(s.playlist?.ids).toEqual(["femur-l"]);
    for (const p of parts.slice(0, MAX_PLAYLIST + 10)) s = reducer(s, { type: "playlistAdd", id: p.id });
    expect(s.playlist?.ids.length).toBe(MAX_PLAYLIST);
  });

  test("play selects and frames a step; next and prev move; stop keeps the list", () => {
    let s = reducer(initialState, { type: "playlistAdd", id: "femur-l" });
    s = reducer(s, { type: "playlistAdd", id: "soleus-muscle-l" });
    s = reducer(s, { type: "playlistTitle", title: "Knee day" });
    s = reducer(s, { type: "playlistPlay", step: 0 });
    expect(s.playlist?.step).toBe(0);
    expect(s.selected).toBe("femur-l");
    expect(s.focus?.flyId).toBe("femur-l");
    expect(s.focus?.ids).toEqual(["femur-l"]);
    expect(s.cameraNonce).toBe(initialState.cameraNonce + 1);
    s = reducer(s, { type: "playlistNext" });
    expect(s.playlist?.step).toBe(1);
    expect(s.selected).toBe("soleus-muscle-l");
    expect(reducer(s, { type: "playlistNext" })).toBe(s);
    s = reducer(s, { type: "playlistPrev" });
    expect(s.playlist?.step).toBe(0);
    expect(reducer(s, { type: "playlistPrev" })).toBe(s);
    s = reducer(s, { type: "playlistStop" });
    expect(s.playlist).toEqual({ title: "Knee day", ids: ["femur-l", "soleus-muscle-l"], step: null });
    expect(s.focus).toBeNull();
    expect(s.selected).toBe("femur-l");
  });

  test("removing the shown item stops playback; removing the last item drops the list", () => {
    let s = reducer(initialState, { type: "playlistAdd", id: "femur-l" });
    s = reducer(s, { type: "playlistAdd", id: "soleus-muscle-l" });
    s = reducer(s, { type: "playlistAdd", id: "femur-r" });
    s = reducer(s, { type: "playlistPlay", step: 2 });
    s = reducer(s, { type: "playlistRemove", id: "femur-l" });
    expect(s.playlist?.step).toBe(1);
    expect(s.focus?.flyId).toBe("femur-r");
    s = reducer(s, { type: "playlistRemove", id: "femur-r" });
    expect(s.playlist).toEqual({ title: "", ids: ["soleus-muscle-l"], step: null });
    expect(s.focus).toBeNull();
    s = reducer(s, { type: "playlistRemove", id: "soleus-muscle-l" });
    expect(s.playlist).toBeNull();
  });

  test("playing a muscle from bones or fascia mode switches modes; other actions stop playback", () => {
    let s = reducer(initialState, { type: "setMode", mode: "fascia" });
    s = reducer(s, { type: "playlistAdd", id: "soleus-muscle-l" });
    s = reducer(s, { type: "playlistAdd", id: "femur-l" });
    s = reducer(s, { type: "playlistPlay", step: 0 });
    expect(s.mode).toBe("muscles");
    expect(s.tour).toBeNull();
    s = reducer(s, { type: "select", id: "femur-l" });
    expect(s.playlist?.step).toBeNull();
    expect(s.playlist?.ids).toEqual(["soleus-muscle-l", "femur-l"]);
    s = reducer(s, { type: "playlistPlay", step: 1 });
    s = reducer(s, { type: "startTour" });
    expect(s.playlist?.step).toBeNull();
    s = reducer(s, { type: "playlistClear" });
    expect(s.playlist).toBeNull();
  });

  test("hydrating with a playlist keeps it idle", () => {
    const s = reducer(initialState, {
      type: "hydrate",
      state: { playlist: { title: "t", ids: ["femur-l"], step: null } },
    });
    expect(s.playlist?.ids).toEqual(["femur-l"]);
    expect(s.selected).toBeNull();
  });
});
