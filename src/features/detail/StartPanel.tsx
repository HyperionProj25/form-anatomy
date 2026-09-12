import { ArrowRight, ListMusic, MousePointerClick, Move, Network, Search } from "lucide-react";
import { STUDY_SETS, studySetIds } from "../../data/study-sets";
import { useStore } from "../../state/store";

/** Right panel when nothing is selected and the fascia panel is not showing. */
export default function StartPanel() {
  const { state, dispatch } = useStore();
  const sets = STUDY_SETS.filter((s) => s.kind === (state.mode === "bones" ? "bones" : "muscles"));
  const noun = state.mode === "bones" ? "bone" : "muscle";
  return (
    <>
      <div className="detail-kicker">
        <span className="tiny-tag">NOTHING SELECTED</span>
      </div>
      <p className="detail-copy start-copy">
        Pick a {noun} and its attachments, actions, nerve supply and sources appear here.
      </p>
      <div className="start-points" aria-label="Three ways to start">
        <div className="start-point">
          <MousePointerClick size={16} />
          <p>
            Click the model
            <small>Any {noun} you can see is selectable. Drag to rotate, scroll to zoom.</small>
          </p>
        </div>
        <button
          className="start-point"
          onClick={() => document.getElementById("structure-search")?.focus()}
        >
          <Search size={16} />
          <p>
            Search or filter on the left
            <small>By name, region, side, or the joint a muscle crosses.</small>
          </p>
        </button>
        <button
          className="start-point"
          onClick={() => dispatch({ type: "motionStart", joint: "knee" })}
        >
          <Move size={16} />
          <p>
            Move a joint, or play a measured swing
            <small>Bend the knee, or let a captured swing drive it, and watch which muscles shorten and which lengthen.</small>
          </p>
        </button>
      </div>
      <div className="section-label">
        STUDY SETS <span>{sets.length}</span>
      </div>
      <div className="study-sets">
        {sets.map((s) => (
          <button
            key={s.id}
            className="study-set"
            onClick={() => dispatch({ type: "playlistLoad", title: s.title, ids: studySetIds(s) })}
          >
            <ListMusic size={15} />
            <span>
              {s.title}
              <small>{s.blurb}</small>
            </span>
            <span className="study-count">{s.keys.length}</span>
          </button>
        ))}
      </div>
      <p className="subtle">
        A set opens as a playlist: step through it, edit it, share it as a link, or print a handout.
      </p>
      <button
        className="study-set fascia-link"
        onClick={() => dispatch({ type: "setMode", mode: "fascia" })}
      >
        <Network size={15} />
        <span>
          Fascial lines
          <small>Trace myofascial connections from head to toe, with the evidence for each hop.</small>
        </span>
        <ArrowRight size={15} />
      </button>
    </>
  );
}
