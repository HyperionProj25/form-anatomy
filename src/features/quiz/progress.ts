export type Attempt = { n: number; correct: number; last: string };
export type Progress = { version: 1; attempts: Record<string, Attempt>; sets: number };

const KEY = "form.progress.v1";
const empty = (): Progress => ({ version: 1, attempts: {}, sets: 0 });

function storageOr(storage?: Storage): Storage | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadProgress(storage?: Storage): Progress {
  const s = storageOr(storage);
  if (!s) return empty();
  try {
    const raw = s.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    if (parsed.version !== 1 || typeof parsed.attempts !== "object" || !parsed.attempts)
      return empty();
    return { version: 1, attempts: parsed.attempts, sets: Number(parsed.sets) || 0 };
  } catch {
    return empty();
  }
}

export function saveProgress(p: Progress, storage?: Storage): void {
  const s = storageOr(storage);
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage may be full or blocked; progress is a convenience, not a requirement.
  }
}

export function clearProgress(storage?: Storage): void {
  try {
    storageOr(storage)?.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Pure: returns a new Progress with the answer recorded against a catalog key or evidence id. */
export function recordAnswer(p: Progress, key: string, correct: boolean, now = new Date()): Progress {
  const prev = p.attempts[key] ?? { n: 0, correct: 0, last: "" };
  return {
    ...p,
    attempts: {
      ...p.attempts,
      [key]: {
        n: prev.n + 1,
        correct: prev.correct + (correct ? 1 : 0),
        last: now.toISOString().slice(0, 10),
      },
    },
  };
}

export function overallAccuracy(p: Progress): { n: number; correct: number } {
  let n = 0;
  let correct = 0;
  for (const a of Object.values(p.attempts)) {
    n += a.n;
    correct += a.correct;
  }
  return { n, correct };
}

/** Keys answered at least twice with accuracy under 60 percent. */
export function weakSpots(p: Progress): string[] {
  return Object.entries(p.attempts)
    .filter(([, a]) => a.n >= 2 && a.correct / a.n < 0.6)
    .map(([k]) => k);
}
