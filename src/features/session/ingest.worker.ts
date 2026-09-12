/// <reference lib="webworker" />
import { assembleSession, swingRow, type Row } from "../../../scripts/swings/session-metrics";
import type { SessionFile } from "../../data/sessions";
import type { SwingFile } from "../../data/swings";
import { playsFromRequest, type IngestRequest } from "./ingest-plays";

/**
 * Runs a TrackMan export through the swing pipeline off the main thread (spec section 19, the
 * hero flow's first step). Output: a session file and its exemplar swing files.
 */
export type { IngestRequest } from "./ingest-plays";
export type IngestProgress = { type: "progress"; done: number; total: number; passed: number };
export type IngestResult = { type: "result"; session: SessionFile; swings: SwingFile[]; total: number; failed: number };
export type IngestError = { type: "error"; message: string };

self.onmessage = (e: MessageEvent<IngestRequest>) => {
  const req = e.data;
  try {
    const plays = playsFromRequest(req);
    const tag = `local-${Date.now().toString(36)}`;
    const rows: Row[] = [];
    let failed = 0;
    plays.forEach((p, i) => {
      try {
        const row = swingRow(p.pose, p.metrics, `${tag}-${String(i + 1).padStart(3, "0")}`);
        if (row) rows.push(row);
        else failed++;
      } catch {
        failed++;
      }
      if (i % 5 === 0 || i === plays.length - 1) {
        const msg: IngestProgress = { type: "progress", done: i + 1, total: plays.length, passed: rows.length };
        self.postMessage(msg);
      }
    });
    if (!rows.length) {
      const err: IngestError = { type: "error", message: `No swing passed the pipeline (${plays.length} plays read, ${failed} rejected).` };
      self.postMessage(err);
      return;
    }
    const { file, exemplarFiles } = assembleSession(rows, tag, req.label, tag);
    const result: IngestResult = {
      type: "result",
      session: file,
      swings: exemplarFiles.map((w) => w.file as unknown as SwingFile),
      total: plays.length,
      failed,
    };
    self.postMessage(result);
  } catch (err) {
    const msg: IngestError = { type: "error", message: (err as Error).message };
    self.postMessage(msg);
  }
};
