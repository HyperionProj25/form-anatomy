import index from "./sessions-index.json";
import type { Role } from "./swings";

/** A TrackMan session run through the swing pipeline (spec section 18): every full swing's metrics and their spread. */
export type SessionSequenceStep = { label: string; peakDegPerS: number; peakMs: number };

export type SessionGroupRow = {
  group: string;
  label: string;
  role: Role;
  change: number;
  peakShortening: number;
  peakShorteningMs: number;
  longest: number;
  longestMs: number;
};

export type SessionSwing = {
  id: string;
  handedness: "L" | "R";
  frames: number;
  events: Partial<Record<"footPlant" | "maxBatSpeed" | "contact" | "followThrough", number>>;
  batSpeedMph: number;
  separationAtPlant: number;
  separationPeak: number;
  leadKneeAtPlant: number;
  leadKneeAtContact: number;
  sequence: SessionSequenceStep[];
  trackmanSequence: SessionSequenceStep[];
  groups: SessionGroupRow[];
  agreement: { pelvisRms: number; torsoRms: number };
  /** The swing file id when this swing is one of the session's exemplars. */
  fileId?: string;
};

export type Stat = { mean: number; sd: number; min: number; max: number; n: number };

export type SessionHandAggregate = {
  count: number;
  batSpeedMph: Stat;
  separationAtPlant: Stat;
  separationPeak: Stat;
  leadKneeExtension: Stat;
  sequenceMs: { label: string; ms: Stat }[];
  trackmanSequenceMs: { label: string; ms: Stat }[];
  groups: { group: string; label: string; role: Role; change: Stat; peakShorteningMs: Stat; longest: Stat }[];
  agreement: { pelvisRms: Stat; torsoRms: Stat };
};

export type SessionFile = {
  schema: "form.session.v1";
  id: string;
  label: string;
  source: { kind: "trackman"; attribution: string; captureHz: number };
  swings: SessionSwing[];
  byHand: Partial<Record<"L" | "R", SessionHandAggregate>>;
  exemplars: { hand: "L" | "R"; kind: "best" | "median"; swingId: string; fileId: string }[];
  caveats: string[];
};

export type SessionIndexEntry = {
  id: string;
  label: string;
  swings: number;
  fullSwings: number;
  hands: ("L" | "R")[];
};

export const SESSION_INDEX = index as SessionIndexEntry[];

export function sessionById(id: string): SessionIndexEntry | undefined {
  return SESSION_INDEX.find((s) => s.id === id);
}

const cache = new Map<string, Promise<SessionFile>>();

export function loadSession(id: string, base = import.meta.env.BASE_URL): Promise<SessionFile> {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = fetch(`${base}sessions/${id}.json`).then((r) => {
    if (!r.ok) throw new Error(`Session ${id} failed to load (${r.status})`);
    return r.json() as Promise<SessionFile>;
  });
  p.catch(() => cache.delete(id));
  cache.set(id, p);
  return p;
}
