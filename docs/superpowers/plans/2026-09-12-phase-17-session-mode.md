# Phase 17: Session Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a full TrackMan session export through the swing pipeline and report every swing's metrics with the mean and spread per hand, the kinematic sequence beside TrackMan's own, the muscle-group changes, exemplar swings that open in the swing lab, a CSV, and the agreement between this pipeline's trunk rotation and TrackMan's segment angles (spec section 18; product plan `docs/product/2026-09-12-swing-product-plan.md`).

**Architecture:** `scripts/swings/finish.ts` holds the shared per-swing build. `scripts/build-session.ts` reads plays by byte range through `trackman-index.json`, builds each, computes metrics with `src/data/swing-report.ts`, aggregates with `scripts/swings/session.ts`, and writes `public/sessions/<id>.json` plus exemplar swing files. `src/data/sessions.ts` loads a session; `SessionReport.tsx` renders it in a modal opened from the toolbar menu.

**Tech Stack:** Node byte-range reads, vitest, React 19.

## Global Constraints

- Nothing identifying leaves the exports: swings are numbered; no timestamps, play ids or session ids.
- No coaching claims; every number traceable; caveats on screen.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Shared build and session helpers

- [x] `scripts/swings/finish.ts` (`buildSwing`, `trimStart`); `scripts/swings/adapters.ts` `fromTrackmanPlay`; `scripts/swings/session.ts` (`readRange`, `batTipSpeed`, `theirRotation`, `agreementRms` modulo 360, `meanSd`, `median`); tests.

### Task 2: Session build

- [x] `scripts/build-session.ts` (`npm run build:session -- 1`): per-swing metrics, per-hand aggregates, exemplars (fastest and median per hand) written as swing files, session and swing index updates; unwrapped trunk rotation curves in the pipeline; kinematic sequence from segment orientation rates, searched to 25 ms past contact.

### Task 3: Session report UI

- [x] `src/data/sessions.ts`; `SessionReport.tsx` modal; store `sessionId`, `openSession`, modal id; toolbar "Session reports" group; "Session report" button on exemplar swings' cards.

### Task 4: Verify, document, deploy

- [x] Session 1 built (112 of 142 full swings pass; agreement pelvis 3 to 5°, torso 7 to 8° RMS); renders of the report and the menu; tests, lint, build; README and spec section 18; commit; push; CI; live; memory.
