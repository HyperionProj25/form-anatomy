# Phase 6: Study Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Curated study sets, innervation quiz questions, a printable playlist handout, and origin/insertion bone highlighting, per spec section 8.

**Architecture:** Study sets are data that loads into the existing playlist. Innervation questions extend the `fact` kind. The handout is a modal with a print stylesheet. Attachments are a pure text-to-bone matcher feeding `computeStyles` through a store flag.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, vitest 5, existing store/URL codec.

## Global Constraints

- Every anatomical claim traces to existing facts data or a verified source; no new free-text anatomy.
- Playlist limit stays 30; no new URL params except `a`.
- `npm run lint && npm run typecheck && npm test && npm run build` chained with `&&` before every commit.

---

### Task 1: Study sets

**Files:** `src/data/study-sets.ts`, `src/state/store.tsx`, `src/features/detail/StartPanel.tsx`, `src/styles/globals.css`, `tests/study-sets.test.ts`

- [x] `STUDY_SETS` with `{ id, title, blurb, kind, keys }` and `studySetIds(set)` (right side for bilateral parts). Eighteen sets per spec 8.1.
- [x] Store action `playlistLoad { title, ids }`: replaces the playlist with valid ids (max 30) and shows step 0 via `withPlaylistStep`.
- [x] Start panel: "STUDY SETS" list filtered by mode; each row loads the set. CSS `.study-sets`, `.study-set`.
- [x] Tests: every key resolves with the set's kind, sets are unique and within the limit, `playlistLoad` selects the first part and switches mode for muscles.
- [x] Verify in Chrome: choose "Rotator cuff", card shows four items, first is selected and framed. Commit "Add curated study sets that load as playlists".

### Task 2: Innervation questions

**Files:** `src/features/quiz/generators.ts`, `src/features/quiz/QuizOverlay.tsx`, `tests/generators.test.ts`

- [x] `fact` kind gains `field: "action" | "nerve"`; `clipNerve` (first clause, 70 chars); `nerveQuestion(key, rng, nervePool)`; kinds cycle find, identify, action, nerve with fallbacks.
- [x] Overlay: explanation for nerve questions shows the full nerve text; no other rendering change.
- [x] Tests: a nerve question exists in a mixed set with the seeded rng, its options are distinct and the correct one matches the muscle's clipped nerve; sets without WebGL still fill.
- [x] Commit "Add innervation questions to the quiz".

### Task 3: Printable handout

**Files:** `src/features/playlist/Handout.tsx`, `src/features/guide/Modals.tsx`, `src/features/playlist/PlaylistCard.tsx`, `src/state/store.tsx`, `src/styles/globals.css`

- [x] `ModalId` adds `"handout"`; Modals renders `Handout` for it.
- [x] `Handout`: title (or "Study sheet"), date, per-structure blocks with fact rows, Latin name when active, attribution, Print button.
- [x] Print CSS: hide `.app-shell > :not(.modal-backdrop)`, flatten the modal, avoid page breaks inside blocks.
- [x] Card button "Handout" opens the modal.
- [x] Verify in Chrome: open the handout for the Knee day playlist; print emulation shows only the sheet. Commit "Add a printable handout for playlists".

### Task 4: Attachment highlighting

**Files:** `src/data/attachments.ts`, `src/viewer/appearance.ts`, `src/state/store.tsx`, `src/state/urlCodec.ts`, `src/features/detail/DetailPanel.tsx`, `src/App.tsx`, `src/styles/globals.css`, `tests/attachments.test.ts`, `tests/appearance.test.ts`, `tests/urlCodec.test.ts`

- [x] `attachments.ts`: alias table, vertebra/rib parsers, `attachmentsFor(part)` and `attachmentIds(part)` per spec 8.4.
- [x] `computeStyles` gains `attachments?: { origin: Set<string>; insertion: Set<string> }` with the colors and dimming rule.
- [x] Store `attach` + `toggleAttach`; URL `a`.
- [x] Detail panel block with chips, toggle and caveat; App passes attachments when `attach` and a muscle is selected outside fascia mode.
- [x] Tests per spec 8.4 including coverage of at least 70%.
- [x] Verify in Chrome: select gastrocnemius, Show attachments, femur blue and calcaneus orange with muscles dimmed. Commit "Highlight origin and insertion bones for a selected muscle".

### Task 5: Feedback link, docs, deploy

- [x] Footer link to GitHub issues. README bullets and guide text for study sets, innervation questions, handouts, attachments.
- [x] Tick, commit, push, watch CI, verify live: a study set, a nerve question, the handout, attachment highlight. Update memory.
