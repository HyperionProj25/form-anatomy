import { BookOpen, RotateCcw } from "lucide-react";
import { useState } from "react";
import { LINE_IDS, lineById } from "../../data/lines";
import { REGION_LABELS, REGION_ORDER } from "../../data/regions";
import { clearProgress, loadProgress, overallAccuracy, weakSpots } from "./progress";
import type { QuizSetId } from "./generators";

type Props = { ready: boolean; onStart: (setId: QuizSetId) => void };

/** Set picker shown in the modal shell. Reads local progress on each open. */
export default function QuizStart({ ready, onStart }: Props) {
  const [progress, setProgress] = useState(() => loadProgress());
  const acc = overallAccuracy(progress);
  const weak = weakSpots(progress);
  const pct = acc.n ? Math.round((100 * acc.correct) / acc.n) : null;
  return (
    <>
      <div className="eyebrow">A MOMENT TO CONNECT THE DOTS</div>
      <h2 id="modal-title">Test your knowledge</h2>
      <p>
        Ten questions per set: find a structure on the model, name a highlighted one, recall its
        action, or read the evidence behind a fascial line. Progress stays in this browser only.
      </p>
      {!ready && (
        <p className="subtle">
          The 3D model is not loaded, so sets will use action and evidence questions only.
        </p>
      )}
      <div className="quiz-stats">
        <div>
          <span>ACCURACY</span>
          <strong>{pct === null ? "–" : `${pct}%`}</strong>
          <small>{acc.n} answered</small>
        </div>
        <div>
          <span>WEAK SPOTS</span>
          <strong>{weak.length}</strong>
          <small>under 60% after 2+ tries</small>
        </div>
      </div>
      <div className="quiz-sets">
        <button className="primary-button" onClick={() => onStart("mixed")}>
          <BookOpen size={16} /> Mixed practice
        </button>
        <button className="outline-button" disabled={!weak.length} onClick={() => onStart("weak")}>
          Practice weak spots {weak.length ? `(${weak.length})` : ""}
        </button>
      </div>
      <h3>By region</h3>
      <div className="quiz-grid">
        {REGION_ORDER.map((r) => (
          <button key={r} className="outline-button" onClick={() => onStart(`region:${r}`)}>
            {REGION_LABELS[r]}
          </button>
        ))}
      </div>
      <h3>By fascial line</h3>
      <div className="quiz-grid">
        {LINE_IDS.map((id) => (
          <button key={id} className="outline-button" onClick={() => onStart(`line:${id}`)}>
            {lineById(id)?.name}
          </button>
        ))}
      </div>
      <button
        className="text-button"
        disabled={!acc.n}
        onClick={() => {
          clearProgress();
          setProgress(loadProgress());
        }}
      >
        <RotateCcw size={14} /> Clear saved progress
      </button>
    </>
  );
}
