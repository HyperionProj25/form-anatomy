# Phase 18: Deal Build-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The software parts of the deal memo (`docs/product/2026-09-12-trackman-deal-memo.md`, section 4): a reproducible validation note across every session, an IP audit, the hero flow's first step (a TrackMan export loaded in the browser and reported without a server), and pitching support in the pipeline.

**Architecture:** `scripts/validation-note.ts` renders `docs/validation/validation-note.md` from the built session files. `scripts/swings/session-metrics.ts` is the shared per-swing metric module; `src/features/session/ingest.worker.ts` runs it in a Web Worker and `IngestModal.tsx` feeds it files. `PointCloud.motion` carries "swing" or "pitch" through the pipeline; event estimation and labels follow it.

**Tech Stack:** Node, Vite worker bundling, React 19, vitest.

## Global Constraints

- Nothing is uploaded from the browser ingest; nothing identifying is written from exports.
- No coaching claims; every number traceable; caveats on screen.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Validation note

- [x] Sessions 2 to 4 built; `npm run validation:note` writes the note (355 swings: pelvis 5.5°, torso 9.2° RMS against TrackMan's own angles; sequence timing per session and hand; headline metrics; rejection rules; limits).

### Task 2: IP audit

- [x] `docs/product/2026-09-12-ip-audit.md`: code, dependencies (direct licences listed; transitive scan still to run), the CC BY-SA model as the blocking item, data, text, fonts, the product name.

### Task 3: Browser ingest (hero flow, step one)

- [x] `scripts/swings/stats.ts` (pure) split from `session.ts`; `scripts/swings/session-metrics.ts` (`swingRow`, `aggregate`, `assembleSession`, `joinPlays`); `src/features/session/ingest-plays.ts`, `ingest.worker.ts`, `IngestModal.tsx`; `registerSession` and `registerSwing` seed the loaders for the visit; toolbar entry "Load a TrackMan export…"; modal id `session-ingest`. Verified live with the curated extract: 14 of 20 plays passed, report opened.

### Task 4: Pitching support

- [x] `PointCloud.motion`; `fromCmu` reads `motion_type`; release from the throwing wrist for a pitch; `SwingFile.motion`; `eventLabel(event, motion, short)` (Foot strike, Peak arm speed, Release); the swing card uses it. Tested on the CMU pitch as a local fixture only (not shipped: Chase's call). Ships with TrackMan pitching captures.

### Task 5: Verify, document, deploy

- [x] Tests, lint, build; README; spec sections 19 and 20; commit; push; CI; live check of the ingest flow; memory.
