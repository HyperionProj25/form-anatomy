import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { registerSession } from "../../data/sessions";
import { registerSwing } from "../../data/swings";
import { useStore } from "../../state/store";
import type { IngestError, IngestProgress, IngestRequest, IngestResult } from "./ingest.worker";

type Phase = { state: "idle" } | { state: "reading" } | { state: "running"; done: number; total: number; passed: number } | { state: "error"; message: string };

/**
 * Load a TrackMan export in the browser (spec section 19): the pose and metrics files, or the
 * curated extract, run through the swing pipeline in a worker; the session report opens when
 * it is done. Nothing is uploaded anywhere.
 */
export default function IngestModal() {
  const { dispatch } = useStore();
  const [phase, setPhase] = useState<Phase>({ state: "idle" });
  const [label, setLabel] = useState("My session");
  const poseRef = useRef<HTMLInputElement>(null);
  const metricsRef = useRef<HTMLInputElement>(null);
  const demoRef = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(
    () => () => {
      worker.current?.terminate();
    },
    [],
  );

  const run = async (req: IngestRequest) => {
    worker.current?.terminate();
    const w = new Worker(new URL("./ingest.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    setPhase({ state: "running", done: 0, total: 0, passed: 0 });
    w.onmessage = (e: MessageEvent<IngestProgress | IngestResult | IngestError>) => {
      const m = e.data;
      if (m.type === "progress") setPhase({ state: "running", done: m.done, total: m.total, passed: m.passed });
      else if (m.type === "error") setPhase({ state: "error", message: m.message });
      else {
        for (const s of m.swings) registerSwing(s, m.session.id);
        registerSession(m.session, m.total);
        setPhase({ state: "idle" });
        dispatch({ type: "openSession", id: m.session.id });
      }
    };
    w.onerror = (err) => setPhase({ state: "error", message: err.message || "The worker failed." });
    w.postMessage(req);
  };

  const start = async () => {
    const pose = poseRef.current?.files?.[0];
    const metrics = metricsRef.current?.files?.[0];
    const demo = demoRef.current?.files?.[0];
    try {
      setPhase({ state: "reading" });
      if (demo) {
        await run({ kind: "demo", text: await demo.text(), label: label.trim() || demo.name });
      } else if (pose && metrics) {
        await run({ kind: "export", poseText: await pose.text(), metricsText: await metrics.text(), label: label.trim() || pose.name });
      } else {
        setPhase({ state: "error", message: "Choose the pose file and the metrics file of one session, or the curated extract." });
      }
    } catch (err) {
      setPhase({ state: "error", message: (err as Error).message });
    }
  };

  return (
    <div className="swing-report ingest">
      <div className="eyebrow">LOAD A TRACKMAN EXPORT</div>
      <h2 id="modal-title">Session in, report out.</h2>
      <p>
        Pick the two files TrackMan exports for a hitting session, the 3D pose file
        (<code>hpepose3d_….json</code>) and the metrics file (<code>hittermetrics_….json</code>). Every
        full swing runs through the same pipeline as the built-in sessions, here in your browser;
        nothing is uploaded. Large exports take a minute.
      </p>
      <div className="ingest-fields">
        <label>
          Session name
          <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Session name" />
        </label>
        <label>
          Pose file
          <input type="file" accept=".json,application/json" ref={poseRef} aria-label="Pose file" />
        </label>
        <label>
          Metrics file
          <input type="file" accept=".json,application/json" ref={metricsRef} aria-label="Metrics file" />
        </label>
        <label>
          Or a curated extract (one file)
          <input type="file" accept=".json,application/json" ref={demoRef} aria-label="Curated extract file" />
        </label>
      </div>
      <div className="report-controls">
        <button className="primary-button" onClick={start} disabled={phase.state === "reading" || phase.state === "running"}>
          <Upload size={14} /> Run the session
        </button>
        {phase.state === "reading" && <span className="subtle">Reading the files…</span>}
        {phase.state === "running" && (
          <span className="subtle" role="status">
            {phase.total ? `${phase.done} of ${phase.total} plays, ${phase.passed} passed` : "Starting…"}
          </span>
        )}
        {phase.state === "error" && (
          <span className="subtle ingest-error" role="alert">
            {phase.message}
          </span>
        )}
      </div>
      <p className="subtle">
        The export carries no hitter identity, so name the session after the hitter yourself. Swings
        that clip physiological ranges, whose events are out of order, or whose posed skeleton
        disagrees with the measured angles are rejected and counted, not shown.
      </p>
    </div>
  );
}
