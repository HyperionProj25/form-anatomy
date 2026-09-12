import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { CameraPose, ViewPreset } from "../viewer/engine";
import type { Region, Vec3 } from "../data/types";
import { partById, partForSide, partsByKey } from "../data/catalog";
import { lineById, stopPartId, stopSides, type LineId } from "../data/lines";
import type { JointId } from "../data/joints";
import type { MotionSide } from "../data/motion";
import { loadNamePref, type NameLang } from "../data/names";
import { initialGraphics, type GraphicsLevel } from "../viewer/quality";
import type { Question, QuizSetId } from "../features/quiz/generators";

export type Mode = "muscles" | "bones" | "fascia";
export type ViewState = ViewPreset | "custom";
export type LayerFilter = "all" | "superficial" | "deep";
export type SideFilter = "both" | "left" | "right";
export type RegionFilter = Region | "all";
export type ModalId =
  | "about"
  | "guide"
  | "quiz"
  | "research"
  | "handout"
  | "swing-report"
  | "session-report"
  | "session-ingest"
  | null;

export type Filters = {
  region: RegionFilter;
  layer: LayerFilter;
  side: SideFilter;
  /** Only muscles that attach on both sides of this joint (URL `j`). */
  joint: JointId | "all";
  search: string;
};
export type Tour = { step: number; playing: boolean };
/** What a tour step or quiz question emphasises: ids to glow, the part to frame, and the camera direction. */
export type Focus = { ids: string[]; flyId: string | null; direction: Vec3 };
export type QuizAnswer = { correct: boolean; picked?: number; pickedId?: string };
export type QuizSession = {
  setId: QuizSetId;
  questions: Question[];
  index: number;
  answers: (QuizAnswer | null)[];
  /** True while "Show me" has flown the camera to the answer and the card is collapsed. */
  showing: boolean;
};

export const MAX_PINS = 4;
export const MAX_PLAYLIST = 30;
export const MAX_PLAYLIST_TITLE = 80;
/** A teacher's ordered list of structures; `step` is the item being shown, or null while idle. */
export type Playlist = { title: string; ids: string[]; step: number | null };
/** A rigid joint animation. `frameNonce` marks the camera nonce that should frame the joint. */
export type Motion = {
  joint: JointId;
  side: MotionSide;
  phase: number;
  playing: boolean;
  /** Draw the lines of action as well as the deformed muscles. */
  lines: boolean;
  frameNonce: number;
  /** Set while a measured swing drives the joint: which swing, and playback speed (1 = real time). */
  swing?: { id: string; speed: number; body: boolean; colour: boolean; shapes: boolean };
};

export type AppState = {
  mode: Mode;
  selected: string | null;
  hidden: string[];
  isolated: boolean;
  /** 10..100 */
  opacity: number;
  view: ViewState;
  camera: CameraPose | null;
  /** Increments whenever the app (not the user) wants the camera moved. */
  cameraNonce: number;
  line: LineId;
  showPath: boolean;
  tour: Tour | null;
  focus: Focus | null;
  pinned: string[];
  quiz: QuizSession | null;
  /** A set requested by the URL; App starts it once the model is ready. */
  quizRequest: QuizSetId | null;
  /** Primary language for structure names; a browser preference, not part of the URL. */
  names: NameLang;
  /** Graphics preference (Auto, High, Low); a browser preference, not part of the URL. */
  graphics: GraphicsLevel;
  playlist: Playlist | null;
  /** Light the selected muscle's origin and insertion bones (URL `a`). Sticky across selections. */
  attach: boolean;
  motion: Motion | null;
  filters: Filters;
  modal: ModalId;
  /** The TrackMan session the session report shows. */
  sessionId: string | null;
};

export const initialState: AppState = {
  mode: "muscles",
  selected: null,
  hidden: [],
  isolated: false,
  opacity: 100,
  view: "front",
  camera: null,
  cameraNonce: 0,
  line: "sbl",
  showPath: true,
  tour: null,
  focus: null,
  pinned: [],
  quiz: null,
  quizRequest: null,
  names: loadNamePref(),
  graphics: initialGraphics(),
  playlist: null,
  attach: false,
  motion: null,
  sessionId: null,
  filters: { region: "all", layer: "all", side: "both", joint: "all", search: "" },
  modal: null,
};

export type Action =
  | { type: "setMode"; mode: Mode }
  | { type: "select"; id: string }
  | { type: "clearSelection" }
  | { type: "hide"; id: string }
  | { type: "restoreAll" }
  | { type: "toggleIsolate" }
  | { type: "setOpacity"; opacity: number }
  | { type: "setView"; view: ViewPreset }
  | { type: "cameraMoved"; pose: CameraPose }
  | { type: "setLine"; line: LineId }
  | { type: "setFilters"; filters: Partial<Filters> }
  | { type: "setModal"; modal: ModalId }
  | { type: "openSession"; id: string }
  | { type: "togglePath" }
  | { type: "startTour" }
  | { type: "tourStep"; step: number }
  | { type: "tourNext" }
  | { type: "tourPrev" }
  | { type: "tourPlay"; playing: boolean }
  | { type: "endTour" }
  | { type: "togglePin"; id: string }
  | { type: "unpin"; id: string }
  | { type: "clearPins" }
  | { type: "requestQuiz"; setId: QuizSetId | null }
  | { type: "startQuiz"; setId: QuizSetId; questions: Question[] }
  | { type: "answerQuiz"; answer: QuizAnswer }
  | { type: "quizShow" }
  | { type: "quizResume" }
  | { type: "quizNext" }
  | { type: "endQuiz" }
  | { type: "setNames"; names: NameLang }
  | { type: "setGraphics"; graphics: GraphicsLevel }
  | { type: "playlistAdd"; id: string }
  | { type: "playlistRemove"; id: string }
  | { type: "playlistTitle"; title: string }
  | { type: "playlistPlay"; step: number }
  | { type: "playlistNext" }
  | { type: "playlistPrev" }
  | { type: "playlistStop" }
  | { type: "playlistClear" }
  | { type: "playlistLoad"; title: string; ids: string[] }
  | { type: "toggleAttach" }
  | { type: "motionStart"; joint: JointId; side?: MotionSide }
  | { type: "motionTick"; phase: number }
  | { type: "motionScrub"; phase: number }
  | { type: "motionPlay"; playing: boolean }
  | { type: "motionSide"; side: MotionSide }
  | { type: "motionLines"; lines: boolean }
  | { type: "motionStop" }
  | { type: "swingStart"; id: string; joint: JointId; side: MotionSide }
  | { type: "swingJoint"; joint: JointId; side: MotionSide }
  | { type: "swingSpeed"; speed: number }
  | { type: "swingBody"; on: boolean }
  | { type: "swingColour"; on: boolean }
  | { type: "swingShapes"; on: boolean }
  | { type: "reset" }
  | { type: "hydrate"; state: Partial<AppState> };

const DIRECTIONS: Record<ViewPreset, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  side: [1, 0, 0],
};

function lineView(line: LineId): ViewPreset {
  return lineById(line)?.view ?? "front";
}

/** Focus for a tour step: ids to glow, the part to frame, and the camera direction. */
export function tourFocus(lineId: LineId, step: number): Focus | null {
  const line = lineById(lineId);
  if (!line || step < 0 || step >= line.path.length) return null;
  const stop = line.path[step];
  const side = stopSides(line)[step];
  const flyId = stopPartId(stop, side);
  const ids = [stop.key, ...(stop.keys ?? [])]
    .filter((k): k is string => !!k)
    .flatMap((k) =>
      partsByKey(k)
        .filter((p) => p.side === side || p.side === "midline")
        .map((p) => p.id),
    );
  const view = stop.view ?? line.view;
  const anchorKey = stop.key ?? stop.anchor?.key;
  const part = anchorKey ? partForSide(anchorKey, side) : undefined;
  const direction: Vec3 =
    view === "side" && part ? [part.centroid[0] >= 0 ? 1 : -1, 0.15, 0.25] : DIRECTIONS[view];
  return { ids, flyId, direction };
}

function withTour(s: AppState, step: number, playing: boolean): AppState {
  const line = lineById(s.line);
  if (!line) return s;
  const clamped = Math.max(0, Math.min(step, line.path.length - 1));
  return {
    ...s,
    tour: { step: clamped, playing },
    focus: tourFocus(s.line, clamped),
    selected: null,
    playlist: idlePlaylist(s),
    cameraNonce: s.cameraNonce + 1,
  };
}

/** Look at a part from the front or the back, whichever side it sits on. */
function directionFor(id: string | null): Vec3 {
  const p = id ? partById(id) : undefined;
  return p && p.centroid[2] < -0.02 ? [0, 0, -1] : [0, 0, 1];
}

/** The playlist with playback stopped; the list itself is kept. */
function idlePlaylist(s: AppState): Playlist | null {
  return s.playlist && s.playlist.step !== null ? { ...s.playlist, step: null } : s.playlist;
}

/** Show playlist item `step`: select it, frame it, and leave any tour or quiz. */
function withPlaylistStep(s: AppState, step: number): AppState {
  if (!s.playlist || !s.playlist.ids.length) return s;
  const clamped = Math.max(0, Math.min(step, s.playlist.ids.length - 1));
  const id = s.playlist.ids[clamped];
  const part = partById(id);
  const mode: Mode = part?.type === "muscle" ? "muscles" : s.mode === "fascia" ? "bones" : s.mode;
  return {
    ...s,
    mode,
    playlist: { ...s.playlist, step: clamped },
    selected: id,
    isolated: false,
    hidden: s.hidden.filter((h) => h !== id),
    quiz: null,
    modal: null,
    tour: null,
    focus: { ids: [id], flyId: id, direction: directionFor(id) },
    cameraNonce: s.cameraNonce + 1,
  };
}

/** The part a question is about, framed from the side the question used. */
function questionPartId(q: Question | undefined): string | null {
  if (!q) return null;
  if (q.kind === "identify") return q.partId;
  if (q.kind === "find" || q.kind === "fact") return partForSide(q.key, "right")?.id ?? null;
  return null;
}

/** Identify questions highlight and frame their part as soon as they appear. */
function quizFocus(q: Question | undefined): Focus | null {
  if (!q || q.kind !== "identify") return null;
  return { ids: [q.partId], flyId: q.partId, direction: directionFor(q.partId) };
}

const noTour = { tour: null, focus: null } as const;

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "setMode": {
      const next = {
        ...s,
        mode: a.mode,
        selected: null,
        isolated: false,
        hidden: [],
        quiz: null,
        playlist: idlePlaylist(s),
        motion: a.mode === "fascia" ? null : s.motion,
        ...noTour,
      };
      return a.mode === "fascia"
        ? { ...next, view: lineView(s.line), camera: null, cameraNonce: s.cameraNonce + 1 }
        : next;
    }
    case "select": {
      const base = {
        ...s,
        selected: a.id,
        isolated: false,
        hidden: s.hidden.filter((h) => h !== a.id),
        playlist: idlePlaylist(s),
        ...noTour,
      };
      const q = s.quiz?.questions[s.quiz.index];
      if (s.quiz && q?.kind === "find" && !s.quiz.answers[s.quiz.index]) {
        const answers = [...s.quiz.answers];
        answers[s.quiz.index] = { correct: partById(a.id)?.key === q.key, pickedId: a.id };
        return { ...base, quiz: { ...s.quiz, answers } };
      }
      return base;
    }
    case "clearSelection":
      return { ...s, selected: null, isolated: false };
    case "hide":
      return {
        ...s,
        hidden: s.hidden.includes(a.id) ? s.hidden : [...s.hidden, a.id],
        selected: null,
        isolated: false,
      };
    case "restoreAll":
      return { ...s, hidden: [], isolated: false };
    case "toggleIsolate":
      return { ...s, isolated: !s.isolated };
    case "setOpacity":
      return { ...s, opacity: Math.min(100, Math.max(10, Math.round(a.opacity))) };
    case "setView":
      return { ...s, view: a.view, camera: null, ...noTour, cameraNonce: s.cameraNonce + 1 };
    case "cameraMoved":
      return { ...s, view: "custom", camera: a.pose };
    case "setLine":
      return {
        ...s,
        line: a.line,
        selected: null,
        view: lineView(a.line),
        camera: null,
        playlist: idlePlaylist(s),
        ...noTour,
        cameraNonce: s.cameraNonce + 1,
      };
    case "setFilters": {
      const joint = a.filters.joint;
      const motion = joint !== undefined && s.motion && joint !== s.motion.joint ? null : s.motion;
      return { ...s, filters: { ...s.filters, ...a.filters }, motion };
    }
    case "setModal":
      return { ...s, modal: a.modal };
    case "togglePath":
      return { ...s, showPath: !s.showPath };
    case "startTour":
      return withTour(s, 0, false);
    case "tourStep":
      return withTour(s, a.step, s.tour?.playing ?? false);
    case "tourNext": {
      const last = (lineById(s.line)?.path.length ?? 1) - 1;
      const step = (s.tour?.step ?? -1) + 1;
      return step > last
        ? { ...s, tour: s.tour && { ...s.tour, playing: false } }
        : withTour(s, step, s.tour?.playing ?? false);
    }
    case "tourPrev":
      return withTour(s, (s.tour?.step ?? 0) - 1, false);
    case "tourPlay":
      return s.tour ? { ...s, tour: { ...s.tour, playing: a.playing } } : s;
    case "endTour":
      return { ...s, ...noTour };
    case "togglePin":
      return {
        ...s,
        pinned: s.pinned.includes(a.id)
          ? s.pinned.filter((p) => p !== a.id)
          : [...s.pinned, a.id].slice(-MAX_PINS),
      };
    case "unpin":
      return { ...s, pinned: s.pinned.filter((p) => p !== a.id) };
    case "clearPins":
      return { ...s, pinned: [] };
    case "requestQuiz":
      return { ...s, quizRequest: a.setId };
    case "startQuiz": {
      const focus = quizFocus(a.questions[0]);
      return {
        ...s,
        quiz: {
          setId: a.setId,
          questions: a.questions,
          index: 0,
          answers: a.questions.map(() => null),
          showing: false,
        },
        quizRequest: null,
        modal: null,
        selected: null,
        tour: null,
        playlist: idlePlaylist(s),
        focus,
        cameraNonce: focus ? s.cameraNonce + 1 : s.cameraNonce,
      };
    }
    case "answerQuiz": {
      if (!s.quiz || s.quiz.answers[s.quiz.index]) return s;
      const answers = [...s.quiz.answers];
      answers[s.quiz.index] = a.answer;
      return { ...s, quiz: { ...s.quiz, answers } };
    }
    case "quizShow": {
      const id = questionPartId(s.quiz?.questions[s.quiz.index]);
      if (!s.quiz || !id) return s;
      return {
        ...s,
        quiz: { ...s.quiz, showing: true },
        selected: null,
        focus: { ids: [id], flyId: id, direction: directionFor(id) },
        cameraNonce: s.cameraNonce + 1,
      };
    }
    case "quizResume":
      return s.quiz ? { ...s, quiz: { ...s.quiz, showing: false }, focus: null } : s;
    case "quizNext": {
      if (!s.quiz) return s;
      const index = s.quiz.index + 1;
      const focus = quizFocus(s.quiz.questions[index]);
      return {
        ...s,
        quiz: { ...s.quiz, index, showing: false },
        selected: null,
        focus,
        cameraNonce: focus ? s.cameraNonce + 1 : s.cameraNonce,
      };
    }
    case "endQuiz":
      return { ...s, quiz: null, focus: null };
    case "setNames":
      return { ...s, names: a.names };
    case "setGraphics":
      return { ...s, graphics: a.graphics };
    case "playlistAdd": {
      const pl = s.playlist ?? { title: "", ids: [], step: null };
      if (pl.ids.includes(a.id) || pl.ids.length >= MAX_PLAYLIST || !partById(a.id)) return s;
      return { ...s, playlist: { ...pl, ids: [...pl.ids, a.id] } };
    }
    case "playlistRemove": {
      if (!s.playlist) return s;
      const index = s.playlist.ids.indexOf(a.id);
      if (index < 0) return s;
      const ids = s.playlist.ids.filter((x) => x !== a.id);
      if (!ids.length) return { ...s, playlist: null, focus: null };
      const step = s.playlist.step;
      const wasShowing = step === index;
      const nextStep = step === null || wasShowing ? null : step > index ? step - 1 : step;
      return {
        ...s,
        playlist: { ...s.playlist, ids, step: nextStep },
        focus: wasShowing ? null : s.focus,
      };
    }
    case "playlistTitle":
      return s.playlist
        ? { ...s, playlist: { ...s.playlist, title: a.title.slice(0, MAX_PLAYLIST_TITLE) } }
        : s;
    case "playlistPlay":
      return withPlaylistStep(s, a.step);
    case "playlistNext": {
      const step = s.playlist?.step ?? null;
      if (step === null || !s.playlist || step >= s.playlist.ids.length - 1) return s;
      return withPlaylistStep(s, step + 1);
    }
    case "playlistPrev": {
      const step = s.playlist?.step ?? null;
      if (step === null || step <= 0) return s;
      return withPlaylistStep(s, step - 1);
    }
    case "playlistStop":
      return s.playlist?.step === null || !s.playlist
        ? s
        : { ...s, playlist: idlePlaylist(s), focus: null };
    case "playlistClear":
      return { ...s, playlist: null, focus: s.playlist?.step === null ? s.focus : null };
    case "playlistLoad": {
      const ids = [...new Set(a.ids.filter((id) => partById(id)))].slice(0, MAX_PLAYLIST);
      if (!ids.length) return s;
      const title = a.title.slice(0, MAX_PLAYLIST_TITLE);
      return withPlaylistStep({ ...s, playlist: { title, ids, step: null } }, 0);
    }
    case "toggleAttach":
      return { ...s, attach: !s.attach };
    case "motionStart":
      return {
        ...s,
        mode: s.mode === "fascia" ? "muscles" : s.mode,
        selected: null,
        isolated: false,
        quiz: null,
        playlist: idlePlaylist(s),
        ...noTour,
        filters: { ...s.filters, joint: a.joint },
        motion: {
          joint: a.joint,
          side: a.side ?? "right",
          phase: 0,
          playing: true,
          lines: false,
          frameNonce: s.cameraNonce + 1,
        },
        cameraNonce: s.cameraNonce + 1,
      };
    case "motionLines":
      return s.motion ? { ...s, motion: { ...s.motion, lines: a.lines } } : s;
    case "motionTick":
      return s.motion ? { ...s, motion: { ...s.motion, phase: a.phase } } : s;
    case "motionScrub":
      return s.motion ? { ...s, motion: { ...s.motion, phase: a.phase, playing: false } } : s;
    case "motionPlay":
      return s.motion ? { ...s, motion: { ...s.motion, playing: a.playing } } : s;
    case "motionSide":
      return s.motion
        ? {
            ...s,
            motion: { ...s.motion, side: a.side, phase: 0, frameNonce: s.cameraNonce + 1 },
            cameraNonce: s.cameraNonce + 1,
          }
        : s;
    case "motionStop":
      return { ...s, motion: null };
    case "swingStart":
      return {
        ...s,
        mode: s.mode === "fascia" ? "muscles" : s.mode,
        selected: null,
        isolated: false,
        quiz: null,
        playlist: idlePlaylist(s),
        ...noTour,
        filters: { ...s.filters, joint: a.joint },
        motion: {
          joint: a.joint,
          side: a.side,
          phase: 0,
          playing: true,
          lines: false,
          frameNonce: s.cameraNonce + 1,
          swing: { id: a.id, speed: 0.5, body: true, colour: false, shapes: false },
        },
        cameraNonce: s.cameraNonce + 1,
      };
    case "swingJoint":
      return s.motion?.swing
        ? {
            ...s,
            filters: { ...s.filters, joint: a.joint },
            motion: { ...s.motion, joint: a.joint, side: a.side, frameNonce: s.cameraNonce + 1 },
            cameraNonce: s.cameraNonce + 1,
          }
        : s;
    case "swingSpeed":
      return s.motion?.swing
        ? { ...s, motion: { ...s.motion, swing: { ...s.motion.swing, speed: a.speed } } }
        : s;
    case "swingBody":
      return s.motion?.swing
        ? {
            ...s,
            motion: {
              ...s.motion,
              swing: { ...s.motion.swing, body: a.on, colour: a.on && s.motion.swing.colour },
              frameNonce: s.cameraNonce + 1,
            },
            cameraNonce: s.cameraNonce + 1,
          }
        : s;
    case "swingColour":
      return s.motion?.swing
        ? { ...s, motion: { ...s.motion, swing: { ...s.motion.swing, colour: a.on } } }
        : s;
    case "openSession":
      return { ...s, sessionId: a.id, modal: "session-report" };
    case "swingShapes":
      return s.motion?.swing
        ? { ...s, motion: { ...s.motion, swing: { ...s.motion.swing, shapes: a.on } } }
        : s;
    case "reset":
      return {
        ...s,
        hidden: [],
        isolated: false,
        selected: null,
        opacity: 100,
        view: "front",
        camera: null,
        quiz: null,
        attach: false,
        motion: null,
        playlist: idlePlaylist(s),
        ...noTour,
        cameraNonce: s.cameraNonce + 1,
      };
    case "hydrate": {
      const merged = { ...s, ...a.state };
      // A fascia link without an explicit view opens from the line's preferred side.
      const view =
        merged.mode === "fascia" && a.state.view === undefined ? lineView(merged.line) : merged.view;
      return {
        ...merged,
        view,
        focus: merged.tour ? tourFocus(merged.line, merged.tour.step) : null,
        cameraNonce: s.cameraNonce + 1,
      };
    }
  }
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({
  children,
  initial = initialState,
}: {
  children: ReactNode;
  initial?: AppState;
}) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
