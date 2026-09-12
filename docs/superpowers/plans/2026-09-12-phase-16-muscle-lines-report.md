# Phase 16: Muscle Lines and Swing Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The whole-body swing shows the posed skeleton with every muscle as a coloured line of action (spec section 17.1), skinned shapes become an off-by-default option, and a swing report gives per-group path-length change, timing, the kinematic sequence, a side-by-side comparison and a CSV (section 17.2).

**Architecture:** `src/data/muscle-groups.ts` and `src/data/swing-report.ts` compute everything from the existing `lengthRatios` and joint curves. `bodyDrawing(swing, mode)` gains a `mode` and the muscle `paths`; the engine draws lines in `lines` mode and skins twins only in `shapes` mode. A `SwingReport` modal renders the tables; the card gets the view control and the report button.

**Tech Stack:** three 0.185, React 19, vitest.

## Global Constraints

- The report states what moved and when; no coaching claims. Path length is not fibre length and the modal says so.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Groups and report data

**Files:** `src/data/muscle-groups.ts`, `src/data/swing-report.ts`, `tests/swing-report.test.ts`

- [x] `MUSCLE_GROUPS` (18 groups; every key a catalog muscle); `groupStats(swing)`, `kinematicSequence(swing)`, `describeStat`, `reportCsv`; tests on Hitter B.

### Task 2: Engine muscle lines

**Files:** `src/data/body.ts` (`BodyDrawing.mode`, `paths`, both hands for the bat), `src/viewer/engine.ts` (`lines` mode: hide soft parts, tubes per path, colour per frame, hover and select on lines, bat between hands), `src/state/store.tsx` (`swing.shapes`), `src/state/urlCodec.ts` (`sh=1`), `src/App.tsx`, `src/features/motion/SwingCard.tsx`

- [x] Lines mode default; "Muscle shapes (approximate)" toggle; selected line cyan and thicker; hover names a line.

### Task 3: Swing report modal

**Files:** `src/features/motion/SwingReport.tsx`, `src/features/guide/Modals.tsx`, `src/state/store.tsx` (`ModalId` "swing-report"), `src/styles/globals.css`, `tests/swing-card.test.tsx`

- [x] Table with sparklines and sentences, sequence, compare select, CSV download, caveat text; axe clean.

### Task 4: Verify, document, deploy

- [x] Real-GPU screenshots at foot plant and contact; headless renders; tests; README and spec; commit "Skeleton and muscle lines; the swing report"; push; CI; live; memory.
