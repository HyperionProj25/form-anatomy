import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { CameraPose, ViewPreset } from "../viewer/engine";
import type { Region, Vec3 } from "../data/types";
import { partForSide, partsByKey } from "../data/catalog";
import { lineById, stopPartId, stopSides, type LineId } from "../data/lines";

export type Mode = "muscles" | "bones" | "fascia";
export type ViewState = ViewPreset | "custom";
export type LayerFilter = "all" | "superficial" | "deep";
export type SideFilter = "both" | "left" | "right";
export type RegionFilter = Region | "all";
export type ModalId = "about" | "guide" | "quiz" | "research" | null;

export type Filters = { region: RegionFilter; layer: LayerFilter; side: SideFilter; search: string };
export type Tour = { step: number; playing: boolean };
/** What a tour step emphasises: ids to glow, the part to frame, and the camera direction. */
export type Focus = { ids: string[]; flyId: string | null; direction: Vec3 };

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
  filters: Filters;
  modal: ModalId;
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
  filters: { region: "all", layer: "all", side: "both", search: "" },
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
  | { type: "togglePath" }
  | { type: "startTour" }
  | { type: "tourStep"; step: number }
  | { type: "tourNext" }
  | { type: "tourPrev" }
  | { type: "tourPlay"; playing: boolean }
  | { type: "endTour" }
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
    cameraNonce: s.cameraNonce + 1,
  };
}

const noTour = { tour: null, focus: null } as const;

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "setMode": {
      const next = { ...s, mode: a.mode, selected: null, isolated: false, hidden: [], ...noTour };
      return a.mode === "fascia"
        ? { ...next, view: lineView(s.line), camera: null, cameraNonce: s.cameraNonce + 1 }
        : next;
    }
    case "select":
      return {
        ...s,
        selected: a.id,
        isolated: false,
        hidden: s.hidden.filter((h) => h !== a.id),
        ...noTour,
      };
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
        ...noTour,
        cameraNonce: s.cameraNonce + 1,
      };
    case "setFilters":
      return { ...s, filters: { ...s.filters, ...a.filters } };
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
    case "reset":
      return {
        ...s,
        hidden: [],
        isolated: false,
        selected: null,
        opacity: 100,
        view: "front",
        camera: null,
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
