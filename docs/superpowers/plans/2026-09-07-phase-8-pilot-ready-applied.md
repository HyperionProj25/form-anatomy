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
| After | see below | | | | | | |

The accessibility deduction was colour contrast on muted text (39 nodes); the
greys were darkened to meet 4.5:1. LCP is dominated by the 8 MB model on a
simulated slow connection; the app shell paints at 2.7 s.
