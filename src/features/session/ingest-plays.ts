import type { TrackmanPlay } from "../../../scripts/swings/adapters";
import { joinPlays, type MetricsPlay } from "../../../scripts/swings/session-metrics";

/** What the ingest worker accepts: a full export pair, or the curated extract. */
export type IngestRequest =
  | { kind: "export"; poseText: string; metricsText: string; label: string }
  | { kind: "demo"; text: string; label: string };

type DemoExtract = {
  sessions: {
    session: number;
    swings: {
      handedness: "l" | "r";
      frames: number;
      timesSec: number[];
      swingEvents: MetricsPlay["swingEvents"];
      hitter: Record<string, [number, number, number][]>;
      bat: TrackmanPlay["pose"]["bat"];
    }[];
  }[];
};

/** Plays to run, joined pose-to-metrics by first timestamp for the export pair. */
export function playsFromRequest(req: IngestRequest): { pose: TrackmanPlay["pose"]; metrics: MetricsPlay }[] {
  if (req.kind === "export") {
    const pose = JSON.parse(req.poseText) as { plays: TrackmanPlay["pose"][] };
    const metrics = JSON.parse(req.metricsText) as { plays: MetricsPlay[] };
    return joinPlays(pose.plays ?? [], metrics.plays ?? []);
  }
  const demo = JSON.parse(req.text) as DemoExtract;
  const out: { pose: TrackmanPlay["pose"]; metrics: MetricsPlay }[] = [];
  for (const s of demo.sessions ?? [])
    for (const w of s.swings ?? []) {
      const timestamps = w.timesSec.map((t) => Math.round(t * 1e9));
      out.push({
        pose: { timestamps, hitter: w.hitter, bat: w.bat },
        metrics: { handedness: w.handedness, numSamples: w.frames, swingEvents: w.swingEvents, timestamps },
      });
    }
  return out;
}
