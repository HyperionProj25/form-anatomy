import { Activity, Pause, Play, X } from "lucide-react";
import { JOINT_LABELS } from "../../data/joints";
import { cableRoles, type MotionSetup, type MotionSide } from "../../data/motion";
import { useStore } from "../../state/store";

const SHORTEN = "#f2a531";
const LENGTHEN = "#3d8bff";

/** Controls and the shortening/lengthening readout for a rigid joint motion, drawn over the stage. */
export default function MotionCard({ setup }: { setup: MotionSetup | null }) {
  const { state, dispatch } = useStore();
  const m = state.motion;
  if (!m || !setup) return null;
  const roles = cableRoles(setup);
  const degrees = Math.round(setup.range[0] + (setup.range[1] - setup.range[0]) * m.phase);
  const names = (list: typeof roles.shortens) => {
    if (!list.length) return "none matched";
    const shown = list.slice(0, 5).map((c) => c.name.replace(/ Muscle$/, ""));
    const more = list.length - shown.length;
    return shown.join(", ") + (more > 0 ? ` and ${more} more` : "");
  };

  return (
    <div className="motion-card" aria-label="Joint motion">
      <div className="playlist-head">
        <Activity size={14} />
        <strong>
          {setup.label}
          {setup.joint !== "tmj" && ` · ${m.side}`}
        </strong>
        <button
          className="icon-button"
          aria-label="Stop the joint animation"
          onClick={() => dispatch({ type: "motionStop" })}
        >
          <X size={14} />
        </button>
      </div>
      <div className="motion-controls">
        <button
          className="outline-button"
          aria-label={m.playing ? "Pause" : "Play"}
          onClick={() => dispatch({ type: "motionPlay", playing: !m.playing })}
        >
          {m.playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(m.phase * 100)}
          aria-label={`${JOINT_LABELS[setup.joint]} angle`}
          onChange={(e) => dispatch({ type: "motionScrub", phase: Number(e.target.value) / 100 })}
        />
        <span className="playlist-status">{degrees}°</span>
      </div>
      {setup.joint !== "tmj" && (
        <div className="segmented motion-side" role="group" aria-label="Body side">
          {(["left", "right"] as MotionSide[]).map((side) => (
            <button
              key={side}
              aria-pressed={m.side === side}
              className={m.side === side ? "active" : ""}
              onClick={() => dispatch({ type: "motionSide", side })}
            >
              {side === "left" ? "Left" : "Right"}
            </button>
          ))}
        </div>
      )}
      <div className="motion-roles">
        <div>
          <span className="line-dot" style={{ background: SHORTEN }} />
          <span>
            Shortening
            <small>{names(roles.shortens)}</small>
          </span>
        </div>
        <div>
          <span className="line-dot" style={{ background: LENGTHEN }} />
          <span>
            Lengthening
            <small>{names(roles.lengthens)}</small>
          </span>
        </div>
      </div>
      <label className="motion-lines">
        <input
          type="checkbox"
          checked={m.lines}
          onChange={(e) => dispatch({ type: "motionLines", lines: e.target.checked })}
        />
        Show lines of action
      </label>
      <p className="subtle">
        Procedural deformation for teaching: bones rotate rigidly about a joint centre measured from
        the mesh, and crossing muscles bend, shorten and bulge by geometry, not by measured tissue
        mechanics. Real joints roll and glide.
      </p>
    </div>
  );
}
