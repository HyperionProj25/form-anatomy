import { ChevronUp, Move, RotateCcw, Square, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { JOINT_IDS, JOINT_LABELS, jointPhrase } from "../../data/joints";
import { SESSION_INDEX } from "../../data/sessions";
import { SWING_INDEX, roleForSide, sideForRole, swingById } from "../../data/swings";
import { useStore } from "../../state/store";

type Props = { onZoom: (factor: number) => void };

const VIEWS = [
  ["front", "Anterior"],
  ["back", "Posterior"],
  ["side", "Lateral"],
] as const;

/** The strip under the model: camera views, Move a joint, Layer, zoom and reset. */
export default function StageToolbar({ onZoom }: Props) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const moving = state.motion?.joint;
  const swing = state.motion?.swing ? swingById(state.motion.swing.id) : undefined;
  const menuLabel =
    moving && swing
      ? `Swing · ${roleForSide(state.motion!.side, swing.handedness)} ${jointPhrase(moving)}`
      : moving
        ? `Moving the ${jointPhrase(moving)}`
        : "Move a joint";
  const deep = state.filters.layer === "deep";

  return (
    <div className="stage-toolbar" role="toolbar" aria-label="Stage tools">
      <div className="view-selector" role="group" aria-label="Camera view">
        {VIEWS.map(([v, label]) => (
          <button
            key={v}
            className={state.view === v ? "active" : ""}
            aria-pressed={state.view === v}
            onClick={() => dispatch({ type: "setView", view: v })}
          >
            {label}
          </button>
        ))}
      </div>
      {state.mode !== "fascia" && (
        <>
          <span className="toolbar-sep" />
          <div className="toolbar-menu" ref={menu}>
            <button
              className={moving ? "active" : ""}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <Move size={14} />
              {menuLabel}
              <ChevronUp size={13} />
            </button>
            {open && (
              <div className="toolbar-menu-list" role="menu" aria-label="Joint to move">
                {JOINT_IDS.map((j) => (
                  <button
                    key={j}
                    role="menuitem"
                    className={moving === j && !swing ? "active" : ""}
                    onClick={() => {
                      setOpen(false);
                      dispatch({ type: "motionStart", joint: j });
                    }}
                  >
                    {JOINT_LABELS[j]}
                  </button>
                ))}
                <p className="menu-group">Measured swing</p>
                {SWING_INDEX.filter((s) => !("session" in s)).map((s) => (
                  <button
                    key={s.id}
                    role="menuitem"
                    className={swing?.id === s.id ? "active" : ""}
                    onClick={() => {
                      setOpen(false);
                      dispatch({ type: "swingStart", id: s.id, joint: "knee", side: sideForRole("lead", s.handedness) });
                    }}
                  >
                    {s.label}
                  </button>
                ))}
                <p className="menu-group">Session reports</p>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    dispatch({ type: "setModal", modal: "session-ingest" });
                  }}
                >
                  Load a TrackMan export…
                </button>
                {SESSION_INDEX.map((s) => (
                  <button
                    key={s.id}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      dispatch({ type: "openSession", id: s.id });
                    }}
                  >
                    {s.label} · {s.fullSwings} swings
                  </button>
                ))}
                {moving && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      dispatch({ type: "motionStop" });
                    }}
                  >
                    <Square size={12} /> Stop moving
                  </button>
                )}
                <p className="menu-note">
                  Bones turn about a joint centre measured from the mesh; the muscles crossing it
                  shorten and lengthen. A teaching model, not measured mechanics.
                </p>
              </div>
            )}
          </div>
        </>
      )}
      {state.mode === "muscles" && (
        <>
          <span className="toolbar-sep" />
          <span className="toolbar-label" id="layer-label">
            Layer
          </span>
          <div className="segmented" role="group" aria-labelledby="layer-label">
            <button
              aria-pressed={!deep}
              className={!deep ? "active" : ""}
              title="The whole model"
              onClick={() => dispatch({ type: "setFilters", filters: { layer: "all" } })}
            >
              Surface
            </button>
            <button
              aria-pressed={deep}
              className={deep ? "active" : ""}
              title="Peel the surface muscles to see the deep layer (approximate)"
              onClick={() => dispatch({ type: "setFilters", filters: { layer: "deep" } })}
            >
              Deep
            </button>
          </div>
        </>
      )}
      <span className="toolbar-sep" />
      <button className="icon-button" onClick={() => onZoom(0.8)} aria-label="Zoom in">
        <ZoomIn size={17} />
      </button>
      <button className="icon-button" onClick={() => onZoom(1.25)} aria-label="Zoom out">
        <ZoomOut size={17} />
      </button>
      <button
        className="icon-button"
        onClick={() => dispatch({ type: "reset" })}
        aria-label="Reset the view"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
}
