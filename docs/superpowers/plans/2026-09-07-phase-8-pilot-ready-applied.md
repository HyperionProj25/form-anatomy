# Phase 8: Pilot-Ready and Applied Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Latin duplicate labels, measure and trim startup cost, add an accessibility test, write a pilot guide, and add the applied throwing research plus mechanistic papers, per spec section 10.

**Architecture:** Data and pure functions first (names, applied notes, citations), then UI (detail block, lazy modals), then tooling (axe test, Lighthouse run), then docs.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, vitest 5 with jsdom for one test file, axe-core, Lighthouse CLI.

## Global Constraints

- Every citation has a PMID or DOI that resolves; summaries stay within the abstract.
- No text from the confidential ACIS document enters the repository.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Latin sub-part names

**Files:** `src/data/names.ts`, `tests/names.test.ts`

- [x] Shared-label detection from the catalog; qualifier rule per spec 10.1.
- [x] Tests: gastrocnemius heads, trapezius parts, a vertebra, a rib, and an unshared label (soleus). Commit "Qualify Latin names that several parts share".

### Task 2: Applied research and mechanistic papers

**Files:** `src/data/research.ts`, `src/data/applied.ts`, `src/features/detail/DetailPanel.tsx`, `src/features/research/ResearchDigest.tsx`, `tests/research.test.ts`, `tests/applied.test.ts`

- [x] Citations per spec 10.5 with PMID and DOI; groups `applied` and `adaptation`; digest order and intros.
- [x] `APPLIED_NOTES` with keys, text, citations; `appliedNotesFor(part)`; detail block with links.
- [x] `npm run verify:citations` passes; tests for group sizes, note keys resolving, and every note citation existing. Commit "Add applied throwing research and load-adaptation papers".

### Task 3: Accessibility test

**Files:** `package.json`, `vite.config.ts`, `tests/a11y.test.tsx`

- [x] Add jsdom, @testing-library/react and axe-core as dev dependencies; vitest includes `.test.tsx`.
- [x] Render `App` in jsdom, run axe with colour contrast disabled, assert no violations; fix findings. Commit "Add an axe accessibility test and fix its findings".

### Task 4: Performance

**Files:** `src/features/guide/Modals.tsx`, `docs/superpowers/plans/2026-09-07-phase-8-pilot-ready-applied.md`

- [x] Lazy-load ResearchDigest, Handout and QuizStart with `React.lazy` and a small fallback.
- [x] Run Lighthouse (mobile, simulated throttling) against the live site before and after; record scores here. Commit "Lazy-load modal content".

### Task 5: Pilot guide, docs, deploy

- [x] `docs/pilot-guide.md`; README link and bullets; spec appended; plan ticked. Commit, push, watch CI, verify live. Update memory.

## Lighthouse results

Mobile preset, simulated throttling, against the live site.

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Before (2026-09-07, commit aca458a) | 55 | 95 | 100 | 100 | 2.7 s | 16.8 s | 540 ms |
| After (commit 1e35338), run 1 | 43 | 100 | 100 | 100 | 2.7 s | 17.0 s | 1,680 ms |
| After, run 2 | 43 | 100 | | | 2.6 s | 16.8 s | 1,290 ms |
| After, run 3 | 44 | 100 | | | 2.6 s | 17.1 s | 1,810 ms |

The accessibility deduction was colour contrast on muted text (39 nodes); the
greys were darkened to meet 4.5:1 and the after runs report no failing audit.

The performance score fell between the before run and the after runs, so the
previous commit (aca458a) and the current one were built and served locally and
measured alternately under identical conditions:

| Local build | Performance | TBT | Index chunk script time |
| --- | --- | --- | --- |
| aca458a (before phase 8) | 41 | 2,490 ms | 6,569 ms |
| 1e35338 (phase 8) | 41 | 2,530 ms | 7,109 ms |
| aca458a, repeat | 41 | 2,530 ms | 7,156 ms |
| 1e35338, repeat | 41 | 2,400 ms | 6,683 ms |

The two builds are indistinguishable; the live-site swing is run-to-run
variance (blocking time varied threefold between identical runs on this
machine). Local numbers are worse than live because the local server does not
gzip the 8 MB model.

What the profile says: first paint is 2.6 to 2.9 s; LCP and interactivity wait
on the model download and decode; blocking time is main-thread work in the app
chunk while the 826 meshes and their materials are built. `json.stringify` in
Vite 8 did not change the build hash, and a micro-benchmark showed JSON.parse
and literal evaluation within 0.5 ms of each other for the catalog, so that
idea was dropped. A real reduction would come from batching mesh creation or
applying appearance lazily, which is out of scope for this phase.
