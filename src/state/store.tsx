import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { CameraPose, ViewPreset } from "../viewer/engine";
import type { Region } from "../data/types";
import { lineById, type LineId } from "../data/lines";

export type Mode = "muscles" | "bones" | "fascia";
export type ViewState = ViewPreset | "custom";
export type LayerFilter = "all" | "superficial" | "deep";
export type SideFilter = "both" | "left" | "right";
export type RegionFilter = Region | "all";
export type ModalId = "about" | "guide" | "quiz" | null;

export type Filters = { region: RegionFilter; layer: LayerFilter; side: SideFilter; search: string };

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
  | { type: "reset" }
  | { type: "hydrate"; state: Partial<AppState> };

function lineView(line: LineId): ViewPreset {
  return (lineById(line)?.view ?? "front") as ViewPreset;
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "setMode": {
      const next = { ...s, mode: a.mode, selected: null, isolated: false, hidden: [] };
      return a.mode === "fascia"
        ? { ...next, view: lineView(s.line), camera: null, cameraNonce: s.cameraNonce + 1 }
        : next;
    }
    case "select":
      return { ...s, selected: a.id, isolated: false, hidden: s.hidden.filter((h) => h !== a.id) };
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
      return { ...s, view: a.view, camera: null, cameraNonce: s.cameraNonce + 1 };
    case "cameraMoved":
      return { ...s, view: "custom", camera: a.pose };
    case "setLine":
      return {
        ...s,
        line: a.line,
        selected: null,
        view: lineView(a.line),
        camera: null,
        cameraNonce: s.cameraNonce + 1,
      };
    case "setFilters":
      return { ...s, filters: { ...s.filters, ...a.filters } };
    case "setModal":
      return { ...s, modal: a.modal };
    case "reset":
      return {
        ...s,
        hidden: [],
        isolated: false,
        selected: null,
        opacity: 100,
        view: "front",
        camera: null,
        cameraNonce: s.cameraNonce + 1,
      };
    case "hydrate":
      return { ...s, ...a.state, cameraNonce: s.cameraNonce + 1 };
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
