import { Activity, ArrowRight, BookOpen, ListMusic, Maximize2, Move, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { partById, parts } from "./data/catalog";
import { attachmentIds } from "./data/attachments";
import { lineById, lineKeys, lines } from "./data/lines";
import { displayName, saveNamePref } from "./data/names";
import { pullFor } from "./data/pull";
import { motionSetup } from "./data/motion";
import MotionCard from "./features/motion/MotionCard";
import SwingCard from "./features/motion/SwingCard";
import { useSwing } from "./features/motion/useSwing";
import { JOINT_LABELS } from "./data/joints";
import { curveOf, frameAt, roleForSide, sideForRole, swingRange } from "./data/swings";
import { bodyDrawing, changeTint, lengthRatios } from "./data/body";
import type { MotionDrawing } from "./viewer/engine";
import { StoreProvider, useStore } from "./state/store";
import { useUrlSync } from "./state/useUrlSync";
import { computeStyles } from "./viewer/appearance";
import { saveGraphicsPref } from "./viewer/quality";
import { linePaths } from "./viewer/paths";
import Viewer, { type CameraCommand, type DrawnPath, type ViewerHandle } from "./viewer/Viewer";
import PinLegend from "./features/compare/PinLegend";
import PlaylistCard from "./features/playlist/PlaylistCard";
import LibraryPanel from "./features/library/LibraryPanel";
import DetailPanel from "./features/detail/DetailPanel";
import StartPanel from "./features/detail/StartPanel";
import FasciaPanel from "./features/fascia/FasciaPanel";
import { STATUS_LABEL } from "./features/fascia/EvidenceBadge";
import Modals from "./features/guide/Modals";
import QuizOverlay from "./features/quiz/QuizOverlay";
import { buildSet, mulberry32, type QuizSetId } from "./features/quiz/generators";
import { loadProgress, weakSpots } from "./features/quiz/progress";
import CaveatChip from "./features/shared/CaveatChip";
import { DockStrip, foldedAfter, type DockCardId } from "./features/shared/Dock";
import Toast from "./features/shared/Toast";
import StageToolbar from "./features/stage/StageToolbar";
import { ensureModelCached, shouldAnnounceOffline } from "./offline";

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

const splitIds = (key: string) => (key ? (key.split(",") as DockCardId[]) : []);

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
  useEffect(() => {
    saveNamePref(state.names);
  }, [state.names]);
  useEffect(() => {
    saveGraphicsPref(state.graphics);
  }, [state.graphics]);
  const nameOf = useCallback(
    (id: string) => {
      const part = partById(id);
      return part ? displayName(part, state.names) : id;
    },
    [state.names],
  );
  useEffect(() => {
    if (!ready) return;
    void ensureModelCached(`${import.meta.env.BASE_URL}body.glb`).then((ok) => {
      if (ok && shouldAnnounceOffline())
        showToast("Available offline. This atlas and its model are now stored on this device.");
    });
  }, [ready, showToast]);

  const activeLine = lineById(state.line) ?? lines[0];
  const motionJoint = state.motion?.joint;
  const motionSide = state.motion?.side;
  const swingId = state.motion?.swing?.id;
  const swingSpeed = state.motion?.swing?.speed;
  const swing = useSwing(swingId);
  const motion = useMemo(() => {
    if (!motionJoint || !motionSide) return null;
    if (swingId) {
      // A measured swing: the cables' change runs from foot plant to contact, not over a teaching range.
      if (!swing) return null;
      const role = roleForSide(motionSide, swing.handedness);
      return (
        motionSetup(motionJoint, motionSide, {
          range: swingRange(swing, motionJoint, motionSide),
          label: `${role === "lead" ? "Lead" : "Back"} ${JOINT_LABELS[motionJoint].toLowerCase()}`,
        }) ?? null
      );
    }
    return motionSetup(motionJoint, motionSide) ?? null;
  }, [motionJoint, motionSide, swingId, swing]);
  const swingCurve = useMemo(
    () => (swing && motionJoint && motionSide ? { angles: curveOf(swing, motionJoint, motionSide), fps: swing.fps } : undefined),
    [swing, motionJoint, motionSide],
  );
  const bodyOn = state.motion?.swing?.body ?? false;
  const swingShapes = state.motion?.swing?.shapes ?? false;
  const body = useMemo(
    () => (swing && bodyOn ? bodyDrawing(swing, swingShapes ? "shapes" : "lines") : null),
    [swing, bodyOn, swingShapes],
  );
  const swingColour = state.motion?.swing?.colour ?? false;
  const motionPhase = state.motion?.phase ?? 0;
  const tint = useMemo(() => {
    if (!swing || !body || !swingColour || body.mode !== "shapes") return undefined;
    const frame = frameAt(swing, motionPhase);
    const map = new Map<string, string>();
    for (const [id, r] of lengthRatios(swing)) {
      const c = changeTint(r[frame] - 1);
      if (c) map.set(id, c);
    }
    return map;
  }, [swing, body, swingColour, motionPhase]);
  const motionDrawing = useMemo<MotionDrawing | null>(
    () =>
      motion && {
        pivot: motion.pivot,
        dir: motion.dir,
        band: motion.band,
        axis: motion.axis,
        range: motion.range,
        curve: swingCurve,
        speed: swingSpeed,
        movingIds: motion.movingIds,
        radius: motion.radius,
        cables: motion.cables.map((c) => ({
          id: c.id,
          from: c.from,
          via: c.via,
          to: c.to,
          viaWeight: c.viaWeight,
          change: c.change,
          fromSeg: body?.segmentOf(c.originId) ?? undefined,
          toSeg: body?.segmentOf(c.insertionId) ?? undefined,
          // Warm is the end that moves: shortening in insertion amber, lengthening in origin blue.
          color: c.role === "shortens" ? "#f2a531" : c.role === "lengthens" ? "#3d8bff" : "#8a8f86",
        })),
      },
    [motion, swingCurve, swingSpeed, body],
  );
  const attachments = useMemo(() => {
    if (!state.attach || state.mode === "fascia" || !state.selected || state.motion) return undefined;
    const part = partById(state.selected);
    if (!part || part.type !== "muscle") return undefined;
    const ids = attachmentIds(part);
    return ids ? { origin: new Set(ids.origin), insertion: new Set(ids.insertion) } : undefined;
  }, [state.attach, state.mode, state.selected, state.motion]);
  // While a joint moves, only the bones and muscles taking part stay solid.
  // A whole-body swing shows every muscle; the spotlight belongs to the single-joint view.
  const spotlight = useMemo(
    () => (motion && !body ? new Set([...motion.movingIds, ...motion.cables.map((c) => c.id)]) : undefined),
    [motion, body],
  );
  const pull = useMemo(() => {
    if (!attachments || !state.selected) return null;
    const part = partById(state.selected);
    return part ? (pullFor(part) ?? null) : null;
  }, [attachments, state.selected]);
  const pulse = useMemo(
    () =>
      pull && pull.paths[0]
        ? { id: pull.muscleId, axisFrom: pull.paths[0].to, axisTo: pull.paths[0].from, belly: pull.paths[0].via }
        : null,
    [pull],
  );
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
        pinned: state.pinned,
        attachments,
        layer: state.filters.layer,
        spotlight,
        tint,
      }),
    [
      state.mode,
      state.selected,
      state.hidden,
      state.isolated,
      state.opacity,
      state.focus,
      state.pinned,
      activeLine,
      attachments,
      state.filters.layer,
      spotlight,
      tint,
    ],
  );
  const cameraCommand = useMemo<CameraCommand>(() => {
    if (motion && state.motion && state.motion.frameNonce === state.cameraNonce) {
      if (body && swing) {
        // The whole body from the open side, three quarters on.
        const lead = sideForRole("lead", swing.handedness) === "left" ? 1 : -1;
        return {
          kind: "frame",
          center: [0, -0.12, 0],
          radius: 1.12,
          direction: [lead * 0.8, 0.22, 0.6],
          nonce: state.cameraNonce,
        };
      }
      return {
        kind: "frame",
        center: motion.pivot,
        radius: motion.radius,
        direction: motion.view,
        nonce: state.cameraNonce,
      };
    }
    if (state.focus?.flyId)
      return { kind: "fly", id: state.focus.flyId, direction: state.focus.direction, nonce: state.cameraNonce };
    if (state.view === "custom" && state.camera)
      return { kind: "pose", pose: state.camera, nonce: state.cameraNonce };
    return {
      kind: "preset",
      preset: state.view === "custom" ? "front" : state.view,
      nonce: state.cameraNonce,
    };
  }, [state.focus, state.view, state.camera, state.cameraNonce, state.motion, motion, body, swing]);
  const paths = useMemo<DrawnPath[]>(
    () =>
      state.mode === "fascia" && state.showPath
        ? linePaths(activeLine).map((p) => ({ points: p.points, color: activeLine.color }))
        : [],
    [state.mode, state.showPath, activeLine],
  );
  const orientation =
    state.view === "back" ? "P" : state.view === "side" ? "L" : state.view === "custom" ? "·" : "A";
  const tourStop = state.mode === "fascia" && state.tour ? activeLine.path[state.tour.step] : null;
  const tourNext = tourStop && state.tour ? activeLine.path[state.tour.step + 1] : undefined;
  const cinematic = !!tourStop && !!state.tour?.playing;

  // The dock: quiz, motion and playlist cards bottom-left. A card that just opened shows in full
  // and folds the others to strips; the user can fold or expand any of them.
  const activeKey = [state.quiz ? "quiz" : "", state.motion ? "motion" : "", state.playlist ? "playlist" : ""]
    .filter(Boolean)
    .join(",");
  const [dock, setDock] = useState<{ key: string; folded: DockCardId[] }>({ key: "", folded: [] });
  if (dock.key !== activeKey)
    setDock({ key: activeKey, folded: foldedAfter(splitIds(dock.key), splitIds(activeKey), dock.folded) });
  const folded = new Set(dock.folded);
  const fold = (id: DockCardId, on: boolean) =>
    setDock((d) => ({
      ...d,
      folded: on ? [...new Set([...d.folded, id])] : d.folded.filter((x) => x !== id),
    }));
  const quizLabel = state.quiz
    ? state.quiz.index >= state.quiz.questions.length
      ? "Quiz results"
      : `Quiz · ${state.quiz.index + 1} of ${state.quiz.questions.length}`
    : "";

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
          <button className="nav-extra" onClick={() => dispatch({ type: "setModal", modal: "research" })}>
            Research
          </button>
          <button onClick={() => dispatch({ type: "setModal", modal: "quiz" })}>
            <BookOpen size={14} /> Quiz
          </button>
          <button className="nav-extra" onClick={() => dispatch({ type: "setModal", modal: "guide" })}>
            Help
          </button>
        </nav>
      </header>
      <main className="workspace">
        <LibraryPanel mobileOpen={mobilePanel} onCloseMobile={() => setMobilePanel(false)} />
        <section
          className={cinematic ? "stage cinematic" : "stage"}
          ref={stage}
          aria-label="Interactive 3D anatomy explorer"
        >
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
            <Search size={15} /> Find a structure
          </button>
          <div className="stage-left">
            {state.mode === "muscles" && state.filters.layer === "deep" && (
              <div className="stage-caption">Surface layer peeled · approximate</div>
            )}
            {state.mode === "fascia" && (
              <div className="stage-caption line-caption">
                <span className="line-dot" style={{ background: activeLine.color }} />
                {activeLine.name}
                <CaveatChip label="Teaching model" tone="dark">
                  A teaching path drawn through structure centres, not a fascial sheet. Each hop
                  carries its own evidence badge in the panel.
                </CaveatChip>
                <button className="text-button" onClick={() => dispatch({ type: "togglePath" })}>
                  {state.showPath ? "Hide path" : "Show path"}
                </button>
              </div>
            )}
            <PinLegend />
          </div>
          <Viewer
            styles={styles}
            cameraCommand={cameraCommand}
            paths={paths}
            nameOf={nameOf}
            selectedId={state.selected}
            autoRotate={state.mode === "fascia" && !!state.tour?.playing}
            pull={pull}
            motion={motionDrawing}
            motionPhase={state.motion?.phase ?? 0}
            motionPlaying={!!state.motion?.playing}
            motionLines={!!state.motion?.lines}
            motionSpeed={swingSpeed ?? 1}
            body={body}
            onMotionPhase={(phase) => dispatch({ type: "motionTick", phase })}
            pulse={pulse}
            graphics={state.graphics}
            onGraphicsAuto={() =>
              showToast("Graphics set to Low so motion stays smooth. Change it under Opacity.")
            }
            cinematic={cinematic}
            focusId={state.focus?.flyId ?? null}
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
          {tourStop && state.tour && (
            <div className="tour-caption" key={state.tour.step} aria-hidden="true">
              <span className="tour-caption-kicker">
                {activeLine.name} · stop {state.tour.step + 1} of {activeLine.path.length}
              </span>
              <strong>{tourStop.name}</strong>
              {tourNext && tourStop.transition ? (
                <span className="tour-caption-next">
                  Next: {tourNext.name} · {STATUS_LABEL[tourStop.transition.status]}
                </span>
              ) : (
                <span className="tour-caption-next">End of the line</span>
              )}
            </div>
          )}
          <div className="dock">
            {state.quiz &&
              (folded.has("quiz") ? (
                <DockStrip
                  icon={<BookOpen size={14} />}
                  label={quizLabel}
                  onExpand={() => fold("quiz", false)}
                />
              ) : (
                <QuizOverlay onStart={startQuiz} onCollapse={() => fold("quiz", true)} />
              ))}
            {state.motion &&
              motion &&
              (folded.has("motion") ? (
                <DockStrip
                  icon={<Activity size={14} />}
                  label={
                    state.motion.swing || motion.joint === "tmj" ? motion.label : `${motion.label} · ${state.motion.side}`
                  }
                  onExpand={() => fold("motion", false)}
                />
              ) : state.motion.swing && swing ? (
                <SwingCard swing={swing} setup={motion} onCollapse={() => fold("motion", true)} />
              ) : (
                <MotionCard setup={motion} onCollapse={() => fold("motion", true)} />
              ))}
            {state.playlist &&
              (folded.has("playlist") ? (
                <DockStrip
                  icon={<ListMusic size={14} />}
                  label={`${state.playlist.title || "Playlist"} · ${state.playlist.ids.length}`}
                  onExpand={() => fold("playlist", false)}
                />
              ) : (
                <PlaylistCard onToast={showToast} onCollapse={() => fold("playlist", true)} />
              ))}
          </div>
          <div className="stage-bottom">
            <StageToolbar onZoom={(f) => handle.current?.zoom(f)} />
            <span className="interaction-hint">
              <Move size={13} /> Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Click to
              explore
            </span>
          </div>
        </section>
        <aside className="right-panel" aria-label="Selected structure">
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
          <span>Free, no account. Open anatomy, open access.</span>
          <a
            href="https://github.com/HyperionProj25/form-anatomy/issues"
            target="_blank"
            rel="noreferrer"
          >
            Report a problem <ArrowRight size={12} />
          </a>
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
