# Phase 7: Recent Research, Joints, Anki Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the research digest with verified 2023 to 2026 papers, derive a muscles-by-joint browse from attachment data, and export any playlist as an Anki deck, per spec section 9.

**Architecture:** Citations are data checked in CI. Joints are pure functions over `attachmentsFor`. Anki export is a pure TSV builder plus a download button.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, vitest 5, PubMed E-utilities for verification.

## Global Constraints

- Every citation has a PMID or DOI that resolves; summaries stay within the abstract.
- No new URL params except `j`.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Recent findings

**Files:** `src/data/research.ts`, `src/features/research/ResearchDigest.tsx`, `tests/research.test.ts`, `README.md`

- [x] `CitationGroup` adds `"recent"`; `GROUP_LABELS.recent = "Recent findings, 2023 to 2026"`; digest ORDER appends it with an intro line.
- [x] Add the citations listed in spec 9.1 with PMID, DOI, kind, summary from the abstract, and a modelNote.
- [x] `npm run verify:citations` passes; research tests updated for the new count and group.
- [x] README count and guide text updated. Commit "Add recent fascia research to the digest".

### Task 2: Muscles by joint

**Files:** `src/data/joints.ts`, `src/data/groups.ts`, `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/features/library/LibraryPanel.tsx`, `src/features/detail/DetailPanel.tsx`, `src/styles/globals.css`, `tests/joints.test.ts`, `tests/urlCodec.test.ts`

- [x] `JOINTS`, `JOINT_LABELS`, `crossesJoint(part, joint)`, `jointsCrossed(part)`, `musclesCrossing(joint)`.
- [x] `Filters.joint` (default `"all"`), URL `j`, `filterParts` honours it for muscles.
- [x] Library chip row; detail panel "Crosses" chips and caveat.
- [x] Tests per spec 9.2; verify in Chrome that the knee filter lists the quadriceps and hamstrings. Commit "Browse muscles by the joint they cross".

### Task 3: Anki export

**Files:** `src/features/playlist/anki.ts`, `src/features/playlist/Handout.tsx`, `tests/anki.test.ts`

- [x] `ankiTsv` per spec 9.3 with a test on header lines, tab count, HTML escaping and the atlas link.
- [x] Handout button and import hint. Verify the download in Chrome. Commit "Export playlists as Anki decks".

### Task 4: Docs, deploy

- [x] README bullets, guide text, spec addendum appended, plan ticked. Commit, push, watch CI, verify live. Update memory.
