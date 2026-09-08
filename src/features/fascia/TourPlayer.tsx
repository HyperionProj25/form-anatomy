import { ChevronLeft, ChevronRight, Pause, Play, Route, X } from "lucide-react";
import { useEffect } from "react";
import type { Line } from "../../data/lines";
import { useStore } from "../../state/store";
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion";
import { EvidenceBadge } from "./EvidenceBadge";

const AUTOPLAY_MS = 6000;

/** Stop-by-stop walk along a fascial line: flies the camera, glows the stop, shows the hop's evidence. */
export default function TourPlayer({ line }: { line: Line }) {
  const { state, dispatch } = useStore();
  const tour = state.tour;
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!tour?.playing || reduced) return;
    const timer = window.setTimeout(() => dispatch({ type: "tourNext" }), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [tour, reduced, dispatch]);

  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") dispatch({ type: "tourNext" });
      if (e.key === "ArrowLeft") dispatch({ type: "tourPrev" });
      if (e.key === "Escape") dispatch({ type: "endTour" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, dispatch]);

  if (!tour)
    return (
      <button className="primary-button tour-start" onClick={() => dispatch({ type: "startTour" })}>
        <Route size={16} /> Start the guided tour
      </button>
    );

  const stop = line.path[tour.step];
  const last = tour.step === line.path.length - 1;
  return (
    <div className="tour" aria-live="polite">
      <div className="tour-head">
        <span className="tiny-tag">
          STOP {tour.step + 1} OF {line.path.length}
        </span>
        <button className="icon-button" aria-label="End tour" onClick={() => dispatch({ type: "endTour" })}>
          <X size={16} />
        </button>
      </div>
      <h3>{stop.name}</h3>
      <p>{stop.note}</p>
      {stop.transition ? (
        <>
          <div className="section-label">NEXT HOP · {line.path[tour.step + 1].name}</div>
          <EvidenceBadge transition={stop.transition} />
        </>
      ) : (
        <p className="subtle">End of the line. Use the arrows to revisit any stop.</p>
      )}
      <div className="tour-controls">
        <button
          className="outline-button"
          disabled={tour.step === 0}
          onClick={() => dispatch({ type: "tourPrev" })}
        >
          <ChevronLeft size={15} /> Previous
        </button>
        {!reduced && (
          <button
            className="outline-button"
            onClick={() => dispatch({ type: "tourPlay", playing: !tour.playing })}
            disabled={last}
          >
            {tour.playing ? <Pause size={15} /> : <Play size={15} />}
            {tour.playing ? "Pause" : "Play"}
          </button>
        )}
        <button className="outline-button" disabled={last} onClick={() => dispatch({ type: "tourNext" })}>
          Next <ChevronRight size={15} />
        </button>
      </div>
      <p className="subtle">
        {reduced
          ? "Auto-advance is off because your system prefers reduced motion; use Next. "
          : ""}
        Arrow keys move between stops. Esc ends the tour.
      </p>
    </div>
  );
}
