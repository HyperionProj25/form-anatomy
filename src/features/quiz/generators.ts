import { partForSide, parts, partsByKey } from "../../data/catalog";
import { factsForWiki } from "../../data/facts";
import { LINE_IDS, lineById, lineKeys, type LineId } from "../../data/lines";
import { EVIDENCE_BANK, QUIZ_BONES, QUIZ_MUSCLES } from "../../data/quiz-pool";
import { REGION_LABELS, REGION_ORDER } from "../../data/regions";
import type { CitationId } from "../../data/research";
import type { Region } from "../../data/types";

export type QuizSetId = `region:${Region}` | `line:${LineId}` | "mixed" | "weak";

export type Question =
  | { kind: "find"; key: string; name: string; prompt: string; explanation: string }
  | {
      kind: "identify";
      key: string;
      partId: string;
      prompt: string;
      options: string[];
      correct: number;
      explanation: string;
    }
  | {
      kind: "fact";
      /** Which fact is asked: the primary action or the supplying nerve. */
      field: "action" | "nerve";
      key: string;
      prompt: string;
      options: string[];
      correct: number;
      explanation: string;
    }
  | {
      kind: "evidence";
      key: string;
      prompt: string;
      options: string[];
      correct: number;
      explanation: string;
      source: CitationId;
    };

const SET_SIZE = 10;
const EVIDENCE_PER_SET = 3;
const ACTION_MAX = 110;
const NERVE_MAX = 70;

/**
 * The first clause of a nerve entry, so answer options stay short:
 * "Tibial nerve from the sciatic, specifically, nerve roots S1–S2" becomes "Tibial nerve from the sciatic".
 */
export function clipNerve(s: string): string {
  const first = s
    .split(/[;(]/)[0]
    .split(/,\s*specifically\b/)[0]
    .trim()
    .replace(/[.,]+$/, "");
  return first.length > NERVE_MAX ? first.slice(0, NERVE_MAX - 1).trimEnd() + "…" : first;
}

/** Small seeded PRNG so sets are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function parseSetId(s: string): QuizSetId | null {
  if (s === "mixed" || s === "weak") return s;
  if (s.startsWith("region:") && (REGION_ORDER as string[]).includes(s.slice(7)))
    return s as QuizSetId;
  if (s.startsWith("line:") && (LINE_IDS as string[]).includes(s.slice(5))) return s as QuizSetId;
  return null;
}

export function setLabel(id: QuizSetId): string {
  if (id === "mixed") return "Mixed practice";
  if (id === "weak") return "Weak spots";
  if (id.startsWith("region:")) return REGION_LABELS[id.slice(7) as Region];
  return lineById(id.slice(5))?.name ?? id;
}

const nameOf = (key: string) => partsByKey(key)[0]?.name ?? key;
const factsOf = (key: string) => factsForWiki(partsByKey(key)[0]?.wiki);
const clip = (s: string) =>
  s.length > ACTION_MAX ? s.slice(0, ACTION_MAX - 1).trimEnd() + "…" : s;

function poolFor(setId: QuizSetId, weakKeys: string[]): string[] {
  const all = [...QUIZ_MUSCLES, ...QUIZ_BONES];
  if (setId === "mixed") return all;
  if (setId === "weak") return weakKeys.filter((k) => partsByKey(k).length > 0);
  if (setId.startsWith("region:")) {
    const region = setId.slice(7);
    return all.filter((k) => partsByKey(k)[0]?.region === region);
  }
  const line = lineById(setId.slice(5));
  return line ? [...lineKeys(line)].filter((k) => partsByKey(k)[0]?.type === "muscle") : [];
}

function evidenceFor(setId: QuizSetId) {
  if (setId === "mixed") return EVIDENCE_BANK;
  if (setId.startsWith("line:")) return EVIDENCE_BANK.filter((q) => q.line === setId.slice(5));
  return [];
}

/** Names of other parts of the same type and region, for identify distractors. */
function distractorNames(key: string, rng: () => number, count: number): string[] {
  const part = partsByKey(key)[0];
  const seen = new Set<string>([part.name]);
  const names: string[] = [];
  const take = (candidates: typeof parts) => {
    for (const p of shuffle(candidates, rng)) {
      if (seen.has(p.name)) continue;
      seen.add(p.name);
      names.push(p.name);
      if (names.length === count) return;
    }
  };
  take(parts.filter((p) => p.type === part.type && p.region === part.region));
  if (names.length < count) take(parts.filter((p) => p.type === part.type));
  return names;
}

function withCorrect(correct: string, distractors: string[], rng: () => number) {
  const options = shuffle([correct, ...distractors], rng);
  return { options, correct: options.indexOf(correct) };
}

function findQuestion(key: string): Question {
  const name = nameOf(key);
  const f = factsOf(key);
  return {
    kind: "find",
    key,
    name,
    prompt: `Click the ${name} on the model.`,
    explanation: f?.action
      ? `${name}: ${clip(f.action)}`
      : `${name} sits in the ${REGION_LABELS[partsByKey(key)[0].region].toLowerCase()} region.`,
  };
}

function identifyQuestion(key: string, rng: () => number): Question {
  const name = nameOf(key);
  const part = partForSide(key, "right") ?? partsByKey(key)[0];
  const { options, correct } = withCorrect(name, distractorNames(key, rng, 3), rng);
  const f = factsOf(key);
  return {
    kind: "identify",
    key,
    partId: part.id,
    prompt: "Which structure is highlighted on the model?",
    options,
    correct,
    explanation: f?.action ? `${name}: ${clip(f.action)}` : `This is the ${name}.`,
  };
}

function factQuestion(key: string, rng: () => number, actionPool: string[]): Question | null {
  const f = factsOf(key);
  if (!f?.action) return null;
  const name = nameOf(key);
  const correctText = clip(f.action);
  const others = shuffle(
    actionPool.filter((a) => a !== correctText),
    rng,
  ).slice(0, 3);
  if (others.length < 3) return null;
  const { options, correct } = withCorrect(correctText, others, rng);
  return {
    kind: "fact",
    field: "action",
    key,
    prompt: `Which is the primary action of the ${name}?`,
    options,
    correct,
    explanation: `${name}: ${clip(f.action)}${f.origin ? ` Origin: ${clip(f.origin)}` : ""}`,
  };
}

function nerveQuestion(key: string, rng: () => number, nervePool: string[]): Question | null {
  const f = factsOf(key);
  if (!f?.nerve) return null;
  const name = nameOf(key);
  const correctText = clipNerve(f.nerve);
  if (!correctText) return null;
  const others = shuffle(
    nervePool.filter((n) => n.toLowerCase() !== correctText.toLowerCase()),
    rng,
  ).slice(0, 3);
  if (others.length < 3) return null;
  const { options, correct } = withCorrect(correctText, others, rng);
  const full = f.nerve.trim().replace(/\.$/, "");
  return {
    kind: "fact",
    field: "nerve",
    key,
    prompt: `Which nerve supplies the ${name}?`,
    options,
    correct,
    explanation: `${name}: innervated by ${full}.${f.action ? ` Action: ${clip(f.action)}` : ""}`,
  };
}

/** Build a reproducible set. Structural questions cycle find, identify, fact (fact only when facts exist). */
export function buildSet(
  setId: QuizSetId,
  opts: { rng: () => number; webgl: boolean; weakKeys?: string[] },
): Question[] {
  const { rng, webgl } = opts;
  const pool = poolFor(setId, opts.weakKeys ?? []);
  const evidence = shuffle(evidenceFor(setId), rng).slice(0, EVIDENCE_PER_SET);
  const structuralTarget = SET_SIZE - evidence.length;
  const actionPool = [
    ...new Set(
      QUIZ_MUSCLES.map((k) => factsOf(k)?.action)
        .filter((a): a is string => !!a)
        .map(clip),
    ),
  ];
  const nervePool = [
    ...new Set(
      QUIZ_MUSCLES.map((k) => factsOf(k)?.nerve)
        .filter((n): n is string => !!n)
        .map(clipNerve)
        .filter(Boolean),
    ),
  ];
  const kinds: Array<"find" | "identify" | "action" | "nerve"> = webgl
    ? ["find", "identify", "action", "nerve"]
    : ["action", "nerve"];
  const questions: Question[] = [];
  let i = 0;
  for (const key of shuffle(pool, rng)) {
    if (questions.length >= structuralTarget) break;
    const preferred = kinds[i % kinds.length];
    let q: Question | null = null;
    if (preferred === "nerve") q = nerveQuestion(key, rng, nervePool);
    if (!q && (preferred === "nerve" || preferred === "action")) q = factQuestion(key, rng, actionPool);
    if (!q && webgl) q = preferred === "identify" ? identifyQuestion(key, rng) : findQuestion(key);
    if (!q) continue;
    questions.push(q);
    i++;
  }
  const evidenceQuestions: Question[] = evidence.map((e) => ({
    kind: "evidence",
    key: e.id,
    prompt: e.prompt,
    options: e.options,
    correct: e.correct,
    explanation: e.explanation,
    source: e.source,
  }));
  return shuffle([...questions, ...evidenceQuestions], rng);
}
