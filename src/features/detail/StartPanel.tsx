import { ArrowRight, ListMusic, MousePointer2, Network } from "lucide-react";
import { STUDY_SETS, studySetIds } from "../../data/study-sets";
import { useStore } from "../../state/store";

/** Right panel when nothing is selected and the fascia panel is not showing. */
export default function StartPanel() {
  const { state, dispatch } = useStore();
  const sets = STUDY_SETS.filter((s) => s.kind === (state.mode === "bones" ? "bones" : "muscles"));
  return (
    <>
      <div className="detail-kicker">
        <span className="tiny-tag">YOUR EXPLORATION STARTS HERE</span>
        <MousePointer2 size={18} />
      </div>
      <h2 className="detail-title">
        Every structure.
        <br />
        Part of a whole.
      </h2>
      <p className="detail-copy">
        Select a {state.mode === "bones" ? "bone" : "muscle"} on the model to explore its anatomy
        and connections. Rotate the body to discover a different perspective.
      </p>
      <div className="start-tips">
        <div>
          <span>01</span>
          <p>
            Find your focus
            <small>Click the model, browse by region, or search by name.</small>
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            Look a little deeper
            <small>Hide a structure to reveal what lies beneath.</small>
          </p>
        </div>
        <div>
          <span>03</span>
          <p>
            Make the connection
            <small>Explore how tissues relate across the body.</small>
          </p>
        </div>
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
      <button className="feature-card" onClick={() => dispatch({ type: "setMode", mode: "fascia" })}>
        <Network size={26} />
        <span className="eyebrow">GO BEYOND INDIVIDUAL MUSCLES</span>
        <h3>
          The body is
          <br />
          connected.
        </h3>
        <p>Trace the myofascial lines, from head to toe.</p>
        <span className="feature-link">
          Explore fascial lines <ArrowRight size={17} />
        </span>
      </button>
    </>
  );
}
