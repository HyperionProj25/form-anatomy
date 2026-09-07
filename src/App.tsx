import {
  Activity,
  ArrowRight,
  BookOpen,
  Layers,
  Maximize2,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parts } from "./data/catalog";
import { lineById, lineKeys, lines } from "./data/lines";
import { StoreProvider, useStore } from "./state/store";
import { useUrlSync } from "./state/useUrlSync";
import { computeStyles } from "./viewer/appearance";
import { linePaths } from "./viewer/paths";
import Viewer, { type CameraCommand, type DrawnPath, type ViewerHandle } from "./viewer/Viewer";
import LibraryPanel from "./features/library/LibraryPanel";
import DetailPanel from "./features/detail/DetailPanel";
import StartPanel from "./features/detail/StartPanel";
import FasciaPanel from "./features/fascia/FasciaPanel";
import Modals from "./features/guide/Modals";
import QuizOverlay from "./features/quiz/QuizOverlay";
import { buildSet, mulberry32, type QuizSetId } from "./features/quiz/generators";
import { loadProgress, weakSpots } from "./features/quiz/progress";
import Toast from "./features/shared/Toast";

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { state, dispatch } = useStore();
  useUrlSync(state, dispatch);
  const stage = useRef<HTMLElement>(null);
  const handle = useRef<ViewerHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);
  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  const startQuiz = useCallback(
    (setId: QuizSetId) =>
      dispatch({
        type: "startQuiz",
        setId,
        questions: buildSet(setId, {
          rng: mulberry32(Date.now() >>> 0),
          webgl: ready,
          weakKeys: weakSpots(loadProgress()),
        }),
      }),
    [dispatch, ready],
  );
  useEffect(() => {
    if (state.quizRequest && !state.quiz && ready) startQuiz(state.quizRequest);
  }, [state.quizRequest, state.quiz, ready, startQuiz]);

  const activeLine = lineById(state.line) ?? lines[0];
  const styles = useMemo(
    () =>
      computeStyles({
        parts,
        mode: state.mode,
        selected: state.selected,
        hidden: new Set(state.hidden),
        isolated: state.isolated,
        opacity: state.opacity / 100,
        lineColor: activeLine.color,
        lineKeys: lineKeys(activeLine),
        focusIds: state.focus ? new Set(state.focus.ids) : undefined,
      }),
    [state.mode, state.selected, state.hidden, state.isolated, state.opacity, state.focus, activeLine],
  );
  const cameraCommand = useMemo<CameraCommand>(() => {
    if (state.focus?.flyId)
      return { kind: "fly", id: state.focus.flyId, direction: state.focus.direction, nonce: state.cameraNonce };
    if (state.view === "custom" && state.camera)
      return { kind: "pose", pose: state.camera, nonce: state.cameraNonce };
    return {
      kind: "preset",
      preset: state.view === "custom" ? "front" : state.view,
      nonce: state.cameraNonce,
    };
  }, [state.focus, state.view, state.camera, state.cameraNonce]);
  const paths = useMemo<DrawnPath[]>(
    () =>
      state.mode === "fascia" && state.showPath
        ? linePaths(activeLine).map((p) => ({ points: p.points, color: activeLine.color }))
        : [],
    [state.mode, state.showPath, activeLine],
  );
  const orientation =
    state.view === "back" ? "P" : state.view === "side" ? "L" : state.view === "custom" ? "·" : "A";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Form home">
          <span className="brand-mark">
            <Activity size={24} />
          </span>
          <span>
            form<span className="brand-period">.</span>
          </span>
          <span className="brand-description">ANATOMY, CONNECTED</span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={state.mode !== "fascia" ? "nav-active" : ""}
            onClick={() => {
              dispatch({ type: "setModal", modal: null });
              if (state.mode === "fascia") dispatch({ type: "setMode", mode: "muscles" });
            }}
          >
            Explore anatomy
          </button>
          <button
            className={state.mode === "fascia" ? "nav-active" : ""}
            onClick={() => {
              dispatch({ type: "setMode", mode: "fascia" });
              dispatch({ type: "setModal", modal: null });
            }}
          >
            Fascial lines
          </button>
          <button onClick={() => dispatch({ type: "setModal", modal: "research" })}>
            Research
          </button>
          <button onClick={() => dispatch({ type: "setModal", modal: "guide" })}>
            Learning guide <ArrowRight size={14} />
          </button>
        </nav>
        <span className="free-badge">
          <span /> Free for every curious mind
        </span>
      </header>
      <div className="intro">
        <div>
          <div className="eyebrow">THE INTERACTIVE HUMAN ATLAS</div>
          <h1>
            Understand the body.<em> See the connections.</em>
          </h1>
          <p>Explore beneath the surface. Discover how anatomy works together.</p>
        </div>
        <button className="outline-button" onClick={() => dispatch({ type: "setModal", modal: "quiz" })}>
          <BookOpen size={16} /> Test your knowledge <ArrowRight size={15} />
        </button>
      </div>
      <main className="workspace">
        <LibraryPanel mobileOpen={mobilePanel} onCloseMobile={() => setMobilePanel(false)} />
        <section className="stage" ref={stage} aria-label="Interactive 3D anatomy explorer">
          <div className="stage-top">
            <div className="stage-title">
              <span className="live-dot" />{" "}
              {state.mode === "fascia"
                ? "MYOFASCIAL CONNECTIONS"
                : state.mode === "bones"
                  ? "SKELETAL SYSTEM"
                  : "MUSCULAR SYSTEM"}
              <small>Full body · Adult anatomical model</small>
            </div>
            <button
              className="icon-button"
              aria-label="Expand anatomy viewer"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else stage.current?.requestFullscreen?.();
              }}
            >
              <Maximize2 size={17} />
            </button>
          </div>
          <button className="mobile-layers outline-button" onClick={() => setMobilePanel(true)}>
            <Layers size={15} /> Layers & search
          </button>
          <Viewer
            styles={styles}
            cameraCommand={cameraCommand}
            paths={paths}
            onSelect={(id) => dispatch({ type: "select", id })}
            onReady={() => setReady(true)}
            onCameraChange={(pose) => dispatch({ type: "cameraMoved", pose })}
            onHandle={(h) => {
              handle.current = h;
              if (!h) setReady(false);
            }}
          />
          <div className="orientation">
            <span>S</span>
            <div>
              <span>R</span>
              <span className="orientation-center">{orientation}</span>
              <span>L</span>
            </div>
            <span>I</span>
          </div>
          <div className="view-tools">
            <button className="icon-button" onClick={() => handle.current?.zoom(0.8)} aria-label="Zoom in">
              <ZoomIn size={19} />
            </button>
            <button className="icon-button" onClick={() => handle.current?.zoom(1.25)} aria-label="Zoom out">
              <ZoomOut size={19} />
            </button>
            <span />
            <button
              className="icon-button"
              onClick={() => dispatch({ type: "reset" })}
              aria-label="Reset anatomy view"
            >
              <RotateCcw size={18} />
            </button>
          </div>
          {state.mode === "fascia" && (
            <div className="line-legend">
              <span className="line-dot" style={{ background: activeLine.color }} />
              {activeLine.name}
              <small>Teaching path drawn through structure centers. Not a fascial sheet.</small>
              <button className="text-button" onClick={() => dispatch({ type: "togglePath" })}>
                {state.showPath ? "Hide path" : "Show path"}
              </button>
            </div>
          )}
          <div className="stage-bottom">
            <div className="view-selector" role="group" aria-label="Camera view">
              {(["front", "back", "side"] as const).map((v) => (
                <button
                  className={state.view === v ? "active" : ""}
                  aria-pressed={state.view === v}
                  onClick={() => dispatch({ type: "setView", view: v })}
                  key={v}
                >
                  {v === "front" ? "Anterior" : v === "back" ? "Posterior" : "Lateral"}
                </button>
              ))}
            </div>
            <span className="interaction-hint">
              <Move size={13} /> Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Click to
              explore
            </span>
          </div>
          <QuizOverlay onStart={startQuiz} />
        </section>
        <aside className="right-panel">
          {state.selected ? (
            <DetailPanel
              describe={(id) => (ready ? handle.current?.description(id) : undefined)}
              onToast={showToast}
            />
          ) : state.mode === "fascia" ? (
            <FasciaPanel onToast={showToast} />
          ) : (
            <StartPanel />
          )}
        </aside>
      </main>
      <footer>
        <span>
          <span className="footer-mark">form.</span> A little more understanding. A lot more
          connection.
        </span>
        <div>
          <span>Open anatomy. Open access.</span>
          <button onClick={() => dispatch({ type: "setModal", modal: "about" })}>
            Sources & credits <ArrowRight size={12} />
          </button>
        </div>
      </footer>
      <Modals ready={ready} onStartQuiz={startQuiz} />
      <Toast message={toast} />
    </div>
  );
}
