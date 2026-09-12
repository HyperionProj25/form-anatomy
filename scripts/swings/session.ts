import { closeSync, openSync, readSync } from "node:fs";

/**
 * Node-side session helpers: reading one play by byte range from the large TrackMan exports.
 * The pure statistics live in ./stats so the browser can share them.
 */

export type IndexSwing = {
  firstTs: string;
  handedness: "l" | "r";
  numSamples: number;
  hasSwingPlane: boolean;
  pose: { file: string; playId: string; offset: number; length: number };
  metrics: { file: string; playId: string; offset: number; length: number };
};

export type SessionIndex = { sessions: { session: number; sessionId: string; swings: IndexSwing[] }[] };

/** Parse the JSON object at a byte range of a large file without reading the rest. */
export function readRange<T>(path: string, offset: number, length: number): T {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, offset);
    return JSON.parse(buf.toString("utf8")) as T;
  } finally {
    closeSync(fd);
  }
}

export { agreementRms, batTipSpeed, meanSd, median, theirRotation, type Stat } from "./stats";
